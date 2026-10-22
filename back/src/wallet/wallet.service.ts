// src/wallet/wallet.service.ts
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { getPagination } from 'src/common/query';
import { ZohalService } from 'src/common/services/zohal.service';
import { User } from 'src/users/entities/user.entity';
import { DataSource, EntityManager, Repository } from 'typeorm';

import { CreateCardDto } from './dto/create-card.dto';
import { TransactionQueryDto } from './dto/transaction-query.dto';
import { WithdrawRequestDto } from './dto/withdraw-request.dto';
import { BankCard } from './entities/bank-card.entity';
import {
  Transaction,
  TransactionStatus,
  TransactionType,
} from './entities/transaction.entity';
import { Wallet } from './entities/wallet.entity';
import {
  BARBER_CANCELLATION_DEBIT_PREFIX,
  CUSTOMER_REFUND_PENDING_PREFIX,
} from './refund.constants';

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  constructor(
    @InjectRepository(Wallet)
    private walletRepo: Repository<Wallet>,
    @InjectRepository(Transaction)
    private transactionRepo: Repository<Transaction>,
    @InjectRepository(BankCard)
    private bankCardRepo: Repository<BankCard>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
    private dataSource: DataSource,
    private zohalService: ZohalService,
  ) {}

  // ==================== کیف پول ====================

  // src/wallet/wallet.service.ts
  async getOrCreateWallet(userId: number): Promise<Wallet> {
    // 1. ابتدا تلاش برای پیدا کردن
    let wallet = await this.walletRepo.findOne({ where: { userId } });
    if (wallet) return wallet;

    // 2. اگر وجود نداشت، از upsert استفاده کن (ایمن در برابر شرایط همزمانی)
    try {
      await this.walletRepo.upsert(
        { userId, balance: 0 },
        { conflictPaths: ['userId'] },
      );
    } catch {
      // در صورت بروز خطا (مثلاً به دلیل رقابت)، فقط نادیده بگیر و دوباره بخوان
      // چون ممکن است رکورد توسط درخواست دیگر ایجاد شده باشد
    }

    // 3. دوباره تلاش برای پیدا کردن
    wallet = await this.walletRepo.findOne({ where: { userId } });
    if (!wallet) {
      // اگر هنوز وجود نداشت (به ندرت پیش می‌آید)، به روش معمول ایجاد کن
      wallet = this.walletRepo.create({ userId, balance: 0 });
      wallet = await this.walletRepo.save(wallet);
    }
    return wallet;
  }

  async getBalance(userId: number): Promise<{ balance: number }> {
    const wallet = await this.getOrCreateWallet(userId);
    // ستون decimal درایور MySQL رشته برمی‌گرداند؛ عدد برگردانده می‌شود
    // تا مقایسه‌ها و نمایش منفی/مثبت در کلاینت درست باشد.
    return { balance: Number(wallet.balance) };
  }

  async getTransactions(userId: number, query: TransactionQueryDto) {
    const wallet = await this.getOrCreateWallet(userId);
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    const qb = this.transactionRepo
      .createQueryBuilder('transaction')
      .where('transaction.walletId = :walletId', { walletId: wallet.id })
      .orderBy('transaction.createdAt', 'DESC');

    if (query.type) {
      qb.andWhere('transaction.type = :type', { type: query.type });
    }
    if (query.status) {
      qb.andWhere('transaction.status = :status', { status: query.status });
    }

    const { skip, take } = getPagination(page, limit);
    qb.skip(skip).take(take);

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ==================== تراکنش‌ها ====================

  async addTransaction(
    walletId: string,
    amount: number,
    type: TransactionType,
    description: string,
    referenceId?: string,
  ): Promise<Transaction> {
    const transaction = this.transactionRepo.create({
      walletId,
      amount,
      type,
      status: TransactionStatus.COMPLETED,
      description,
      referenceId,
    });
    return this.transactionRepo.save(transaction);
  }

  async deposit(
    userId: number,
    amount: number,
    description: string,
    referenceId?: string,
  ) {
    const wallet = await this.getOrCreateWallet(userId);
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // به‌روزرسانی موجودی
      wallet.balance = Number(wallet.balance) + amount;
      await queryRunner.manager.save(wallet);

      // ثبت تراکنش
      const transaction = queryRunner.manager.create(Transaction, {
        walletId: wallet.id,
        amount,
        type: TransactionType.DEPOSIT,
        status: TransactionStatus.COMPLETED,
        description,
        referenceId,
      });
      await queryRunner.manager.save(transaction);

      await queryRunner.commitTransaction();
      return { wallet, transaction };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async depositOnceWithManager(
    manager: EntityManager,
    params: {
      userId: number;
      amount: number;
      description: string;
      paymentId: string;
      legacyReference?: string | null;
    },
  ): Promise<Transaction | null> {
    const amount = Number(params.amount.toFixed(2));
    if (!Number.isFinite(amount) || amount <= 0) return null;

    const wallet = await this.getOrCreateWalletWithManager(
      manager,
      params.userId,
    );
    const referenceIds = [params.paymentId, params.legacyReference].filter(
      (reference): reference is string => Boolean(reference),
    );
    const transactionRepo = manager.getRepository(Transaction);
    const existingDeposit = await transactionRepo
      .createQueryBuilder('transaction')
      .where('transaction.walletId = :walletId', { walletId: wallet.id })
      .andWhere('transaction.type = :type', { type: TransactionType.DEPOSIT })
      .andWhere('transaction.referenceId IN (:...referenceIds)', {
        referenceIds,
      })
      .getOne();
    if (existingDeposit) return existingDeposit;

    wallet.balance = Number(wallet.balance) + amount;
    await manager.getRepository(Wallet).save(wallet);
    return transactionRepo.save(
      transactionRepo.create({
        walletId: wallet.id,
        amount,
        type: TransactionType.DEPOSIT,
        status: TransactionStatus.COMPLETED,
        description: params.description,
        referenceId: params.paymentId,
      }),
    );
  }

  async debitBarberAndQueueRefund(
    manager: EntityManager,
    params: {
      barberUserId: number;
      customerUserId: number;
      bookingId: string;
      paymentId: string;
      /** مبلغی که از کیف پول آرایشگر کسر می‌شود (همان درآمدی که گرفته بود) */
      amount: number;
      /**
       * مبلغی که باید به مشتری برگردد. اگر داده نشود برابر `amount` است.
       * تفاوت این دو، سهم کمیسیون سایتی است که هرگز وارد کیف پول آرایشگر
       * نشده و باید از طرف سامانه بازپرداخت شود.
       */
      customerRefundAmount?: number;
    },
  ): Promise<void> {
    const amount = Number(params.amount.toFixed(2));
    if (!Number.isFinite(amount) || amount <= 0) return;

    const customerWallet = await this.getOrCreateWalletWithManager(
      manager,
      params.customerUserId,
    );
    const transactionRepo = manager.getRepository(Transaction);
    const existingRefund = await transactionRepo.findOne({
      where: {
        walletId: customerWallet.id,
        type: TransactionType.REFUND,
        referenceId: params.paymentId,
      },
    });
    if (existingRefund) return;

    const walletRepo = manager.getRepository(Wallet);
    const barberWallet = await walletRepo.findOne({
      where: { userId: params.barberUserId },
      lock: { mode: 'pessimistic_write' },
    });

    /**
     * اگر کیف پول آرایشگر وجود نداشته باشد، یعنی هیچ درآمدی برای این پرداخت
     * به او واریز نشده است؛ پس چیزی برای کسر وجود ندارد و فقط بازپرداخت
     * مشتری در صف قرار می‌گیرد. قبلاً این حالت با خطا کل لغو را می‌شکست.
     */
    if (!barberWallet) {
      this.logger.warn(
        `کیف پول آرایشگر ${params.barberUserId} پیدا نشد؛ فقط بازپرداخت مشتری ثبت می‌شود.`,
      );
      await this.createPendingCustomerRefund(manager, customerWallet, {
        bookingId: params.bookingId,
        paymentId: params.paymentId,
        amount: params.customerRefundAmount ?? amount,
      });

      return;
    }

    /**
     * لغو نوبت هرگز نباید به موجودی کیف پول گره بخورد.
     *
     * پیش از این اگر آرایشگر درآمدش را تسویه کرده بود، دکمهٔ لغو کار
     * نمی‌کرد و نوبت برای همیشه در وضعیت «تاییدشده» قفل می‌ماند — نه لغو
     * می‌شد، نه مسیر «انجام شد» برایش منطقی بود. اکنون در صورت کمبود
     * موجودی، کیف پول منفی می‌شود (بدهی آرایشگر) و همین بدهی در برداشت‌های
     * بعدی تسویه می‌گردد.
     */
    const currentBalance = Number(barberWallet.balance ?? 0);
    if (currentBalance < amount) {
      this.logger.warn(
        `کیف پول آرایشگر ${params.barberUserId} برای بازپرداخت ${amount} کافی نبود (موجودی: ${currentBalance})؛ بدهی ثبت شد.`,
      );
    }

    barberWallet.balance = currentBalance - amount;
    await walletRepo.save(barberWallet);
    await transactionRepo.save(
      transactionRepo.create({
        walletId: barberWallet.id,
        amount,
        type: TransactionType.WITHDRAWAL,
        status: TransactionStatus.COMPLETED,
        description: `${BARBER_CANCELLATION_DEBIT_PREFIX} ${params.bookingId}`,
        referenceId: params.paymentId,
      }),
    );

    await this.createPendingCustomerRefund(manager, customerWallet, {
      bookingId: params.bookingId,
      paymentId: params.paymentId,
      amount: params.customerRefundAmount ?? amount,
    });
  }

  async queueCustomerRefund(params: {
    customerUserId: number;
    bookingId: string;
    paymentId: string;
    amount: number;
  }): Promise<Transaction> {
    return this.dataSource.transaction(manager =>
      this.queueCustomerRefundWithManager(manager, params),
    );
  }

  async queueCustomerRefundWithManager(
    manager: EntityManager,
    params: {
      customerUserId: number;
      bookingId: string;
      paymentId: string;
      amount: number;
    },
  ): Promise<Transaction> {
    const customerWallet = await this.getOrCreateWalletWithManager(
      manager,
      params.customerUserId,
    );
    return this.createPendingCustomerRefund(manager, customerWallet, params);
  }

  private async getOrCreateWalletWithManager(
    manager: EntityManager,
    userId: number,
  ): Promise<Wallet> {
    const walletRepo = manager.getRepository(Wallet);
    await manager
      .createQueryBuilder()
      .insert()
      .into(Wallet)
      .values({ userId, balance: 0 })
      .orIgnore()
      .execute();

    const wallet = await walletRepo.findOne({
      where: { userId },
      lock: { mode: 'pessimistic_write' },
    });
    if (!wallet) {
      throw new BadRequestException(
        'کیف پول مشتری برای ثبت بازپرداخت یافت نشد.',
      );
    }
    return wallet;
  }

  private async createPendingCustomerRefund(
    manager: EntityManager,
    customerWallet: Wallet,
    params: {
      bookingId: string;
      paymentId: string;
      amount: number;
    },
  ): Promise<Transaction> {
    const amount = Number(params.amount.toFixed(2));
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException('مبلغ بازپرداخت نامعتبر است.');
    }

    const transactionRepo = manager.getRepository(Transaction);
    const existingRefund = await transactionRepo.findOne({
      where: {
        walletId: customerWallet.id,
        type: TransactionType.REFUND,
        referenceId: params.paymentId,
      },
    });
    if (existingRefund) return existingRefund;

    return transactionRepo.save(
      transactionRepo.create({
        walletId: customerWallet.id,
        amount,
        type: TransactionType.REFUND,
        status: TransactionStatus.PENDING,
        description: `${CUSTOMER_REFUND_PENDING_PREFIX} | رزرو ${params.bookingId}`,
        referenceId: params.paymentId,
      }),
    );
  }

  // ==================== برداشت ====================

  async requestWithdraw(userId: number, dto: WithdrawRequestDto) {
    // کیف پول باید وجود داشته باشد؛ ساخت آن خارج از تراکنش انجام می‌شود
    await this.getOrCreateWallet(userId);

    // بررسی کارت
    const card = await this.bankCardRepo.findOne({
      where: { id: dto.cardId, userId },
    });
    if (!card) {
      throw new NotFoundException('کارت بانکی یافت نشد');
    }

    return this.dataSource.transaction(async manager => {
      /**
       * قفل ردیف کیف پول و بررسی موجودی *داخل* تراکنش.
       *
       * پیش از این موجودی بیرون از تراکنش خوانده و بررسی می‌شد و بعد
       * `save` انجام می‌شد؛ دو درخواست هم‌زمان می‌توانستند هر دو از یک
       * موجودی عبور کنند و کیف پول بیش از اندازه برداشت شود.
       */
      const wallet = await manager
        .getRepository(Wallet)
        .createQueryBuilder('wallet')
        .where('wallet.userId = :userId', { userId })
        .setLock('pessimistic_write')
        .getOne();

      if (!wallet) {
        throw new NotFoundException('کیف پول یافت نشد');
      }

      const balance = Number(wallet.balance);
      const amount = Number(dto.amount);

      if (!Number.isFinite(amount) || amount <= 0) {
        throw new BadRequestException('مبلغ برداشت معتبر نیست');
      }

      if (balance < amount) {
        throw new BadRequestException('موجودی کافی نیست');
      }

      wallet.balance = balance - amount;
      await manager.save(wallet);

      // ثبت تراکنش با وضعیت PENDING (منتظر تایید ادمین)
      const transaction = manager.create(Transaction, {
        walletId: wallet.id,
        amount,
        type: TransactionType.WITHDRAWAL,
        status: TransactionStatus.PENDING,
        description:
          dto.description ||
          `برداشت به کارت ${card.bankName} - ${card.cardNumber.slice(-4)}`,
        referenceId: card.id,
      });
      await manager.save(transaction);

      return {
        message: 'درخواست برداشت با موفقیت ثبت شد و در انتظار تأیید است',
        transaction,
      };
    });
  }

  /**
   * تایید برداشت توسط ادمین.
   *
   * موجودی هنگام ثبت درخواست کسر شده بود؛ اینجا فقط وضعیت تراکنش نهایی
   * می‌شود. شناسهٔ پیگیری واریز بانکی (اختیاری) در توضیح ذخیره می‌شود تا
   * بعداً قابل رهگیری باشد.
   */
  async approveWithdrawal(id: string, reference?: string) {
    const transaction = await this.transactionRepo.findOne({ where: { id } });

    if (!transaction) {
      throw new NotFoundException('درخواست برداشت یافت نشد');
    }

    if (
      transaction.type !== TransactionType.WITHDRAWAL ||
      transaction.status !== TransactionStatus.PENDING
    ) {
      throw new BadRequestException(
        'این درخواست برداشت در وضعیت قابل تایید نیست یا قبلاً بررسی شده است',
      );
    }

    const note = reference?.trim();
    const description = [
      transaction.description,
      note ? `شناسهٔ پیگیری واریز: ${note}` : '',
    ]
      .filter(Boolean)
      .join(' | ');

    const result = await this.transactionRepo.update(
      {
        id,
        type: TransactionType.WITHDRAWAL,
        status: TransactionStatus.PENDING,
      },
      { status: TransactionStatus.COMPLETED, description },
    );

    if (result.affected === 0) {
      throw new BadRequestException(
        'این درخواست هم‌زمان توسط ادمین دیگری بررسی شد. صفحه را بازخوانی کنید.',
      );
    }

    return this.transactionRepo.findOne({ where: { id } });
  }

  /**
   * رد برداشت توسط ادمین.
   *
   * چون موجودی در لحظهٔ ثبت درخواست کسر شده بود، رد کردن بدون برگرداندن
   * مبلغ یعنی از بین رفتن پول آرایشگر. اینجا مبلغ به کیف پول برگردانده
   * می‌شود و یک تراکنش DEPOSIT برای شفافیت دفتر مالی ثبت می‌شود.
   */
  async rejectWithdrawal(id: string, reason?: string) {
    return this.dataSource.transaction(async manager => {
      const transactionRepo = manager.getRepository(Transaction);
      const walletRepo = manager.getRepository(Wallet);

      const transaction = await transactionRepo
        .createQueryBuilder('transaction')
        .where('transaction.id = :id', { id })
        .setLock('pessimistic_write')
        .getOne();

      if (!transaction) {
        throw new NotFoundException('درخواست برداشت یافت نشد');
      }

      if (
        transaction.type !== TransactionType.WITHDRAWAL ||
        transaction.status !== TransactionStatus.PENDING
      ) {
        throw new BadRequestException(
          'این درخواست برداشت در وضعیت قابل رد کردن نیست یا قبلاً بررسی شده است',
        );
      }

      const wallet = await walletRepo
        .createQueryBuilder('wallet')
        .where('wallet.id = :id', { id: transaction.walletId })
        .setLock('pessimistic_write')
        .getOne();

      if (!wallet) {
        throw new NotFoundException('کیف پول یافت نشد');
      }

      const note = reason?.trim();
      transaction.status = TransactionStatus.FAILED;
      transaction.description = [
        transaction.description,
        note ? `رد شد: ${note}` : 'رد شد',
      ]
        .filter(Boolean)
        .join(' | ');

      await transactionRepo.save(transaction);

      wallet.balance = Number(wallet.balance) + Number(transaction.amount);
      await walletRepo.save(wallet);

      await transactionRepo.save(
        transactionRepo.create({
          walletId: wallet.id,
          amount: transaction.amount,
          type: TransactionType.DEPOSIT,
          status: TransactionStatus.COMPLETED,
          description: 'برگشت مبلغ برداشت ردشده',
          referenceId: transaction.id,
        }),
      );

      return transaction;
    });
  }

  // ==================== کارت‌های بانکی ====================

  async getCards(userId: number): Promise<BankCard[]> {
    return this.bankCardRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async addCard(userId: number, dto: CreateCardDto): Promise<BankCard> {
    // بررسی تکراری نبودن شماره کارت برای این کاربر
    const existing = await this.bankCardRepo.findOne({
      where: { userId, cardNumber: dto.cardNumber },
    });
    if (existing) {
      throw new BadRequestException('این شماره کارت قبلاً ثبت شده است');
    }

    // نرمال‌سازی شبا به حروف بزرگ بدون فاصله
    dto.shebaNumber = String(dto.shebaNumber ?? '')
      .trim()
      .toUpperCase()
      .replace(/[\s\-]/g, '');

    // استعلام شبا و احراز هویت صاحب حساب از طریق زحل
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('کاربر یافت نشد');
    }

    await this.zohalService.verifyIbanOwnership({
      iban: dto.shebaNumber,
      userFullName: user.fullName,
      userPhone: user.phone,
    });

    // اگر کاربر کارتی ندارد، این کارت پیش‌فرض شود
    const count = await this.bankCardRepo.count({ where: { userId } });
    const isDefault = count === 0 ? true : dto.isDefault || false;

    const card = this.bankCardRepo.create({
      userId,
      ...dto,
      isDefault,
    });
    return this.bankCardRepo.save(card);
  }

  async deleteCard(userId: number, cardId: string): Promise<void> {
    const card = await this.bankCardRepo.findOne({
      where: { id: cardId, userId },
    });
    if (!card) {
      throw new NotFoundException('کارت بانکی یافت نشد');
    }
    // اگر آخرین کارت است، اجازه حذف ندهید
    const count = await this.bankCardRepo.count({ where: { userId } });
    if (count <= 1) {
      throw new BadRequestException('حداقل یک کارت باید داشته باشید');
    }
    await this.bankCardRepo.delete(cardId);
  }
}
