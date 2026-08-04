// src/wallet/wallet.service.ts
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { getPagination } from 'src/common/query';
import { DataSource, Repository } from 'typeorm';

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

@Injectable()
export class WalletService {
  constructor(
    @InjectRepository(Wallet)
    private walletRepo: Repository<Wallet>,
    @InjectRepository(Transaction)
    private transactionRepo: Repository<Transaction>,
    @InjectRepository(BankCard)
    private bankCardRepo: Repository<BankCard>,
    private dataSource: DataSource,
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
    } catch (error) {
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
    return { balance: wallet.balance };
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

  // ==================== برداشت ====================

  async requestWithdraw(userId: number, dto: WithdrawRequestDto) {
    const wallet = await this.getOrCreateWallet(userId);

    // بررسی موجودی
    if (wallet.balance < dto.amount) {
      throw new BadRequestException('موجودی کافی نیست');
    }

    // بررسی کارت
    const card = await this.bankCardRepo.findOne({
      where: { id: dto.cardId, userId },
    });
    if (!card) {
      throw new NotFoundException('کارت بانکی یافت نشد');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // کاهش موجودی
      wallet.balance = Number(wallet.balance) - dto.amount;
      await queryRunner.manager.save(wallet);

      // ثبت تراکنش با وضعیت PENDING (منتظر تأیید ادمین)
      const transaction = queryRunner.manager.create(Transaction, {
        walletId: wallet.id,
        amount: dto.amount,
        type: TransactionType.WITHDRAWAL,
        status: TransactionStatus.PENDING,
        description:
          dto.description ||
          `برداشت به کارت ${card.bankName} - ${card.cardNumber.slice(-4)}`,
        referenceId: card.id,
      });
      await queryRunner.manager.save(transaction);

      await queryRunner.commitTransaction();

      return {
        message: 'درخواست برداشت با موفقیت ثبت شد و در انتظار تأیید است',
        transaction,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
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
