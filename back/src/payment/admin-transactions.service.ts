import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/users/entities/user.entity';
import {
  Transaction,
  TransactionStatus,
  TransactionType,
} from 'src/wallet/entities/transaction.entity';
import {
  BARBER_CANCELLATION_DEBIT_PREFIX,
  CUSTOMER_REFUND_PENDING_PREFIX,
  CUSTOMER_REFUND_SETTLED_PREFIX,
} from 'src/wallet/refund.constants';
import { WalletService } from 'src/wallet/wallet.service';
import { Brackets, Repository, SelectQueryBuilder } from 'typeorm';

import { AdminTransactionQueryDto } from './dto/admin-transaction-query.dto';
import {
  Payment,
  PaymentPurpose,
  PaymentStatus,
} from './entities/payment.entity';

/**
 * ============================================================================
 * گزارش مالی ادمین (‎/admin/wallet‎)
 * ============================================================================
 *
 * قاعدهٔ واحدِ این گزارش:
 *
 *   «فقط پولی که واقعاً از درگاه پرداخت وارد شده و نزد ما مانده است.»
 *
 * از این قاعده سه نتیجهٔ عملی گرفته می‌شود:
 *
 *  ۱) از سمت درگاه فقط پرداخت‌هایی می‌آیند که `status = PAID` هستند
 *     (تلاش‌های ناموفق، نیمه‌کاره و لغوشدهٔ درگاه هرگز وارد گزارش نمی‌شوند).
 *
 *  ۲) پرداخت‌هایی که بعداً برگشت خورده‌اند (رزرو لغو/رد شده و پول به مشتری
 *     برمی‌گردد) هم کنار گذاشته می‌شوند؛ چون نه درآمد ما هستند و نه پول
 *     آرایشگر. تشخیص «برگشت‌خورده» با دو نشانهٔ قابل اتکا انجام می‌شود:
 *       • یک تراکنش REFUND با `referenceId = payment.id` ثبت شده باشد
 *         (همان رکوردی که در صف بازپرداخت مشتری قرار می‌گیرد)
 *       • یا در `payment.metadata` پرچم `refundQueued: true` باشد
 *
 *  ۳) در دفتر کیف پول:
 *       • تراکنش‌های FAILED نمایش داده نمی‌شوند.
 *       • «کسر کیف پول آرایشگر بابت لغو رزرو» به‌طور کامل حذف می‌شود؛ چون
 *         فقط قرینهٔ یک واریزِ باطل‌شده است و نمایش آن، هم کارت‌ها را به هم
 *         می‌ریزد و هم باعث می‌شود ادمین فکر کند پول واقعی جابه‌جا شده است.
 *       • واریز «درآمد رزرو نوبت» فقط وقتی می‌ماند که به یک پرداخت موفقِ
 *         برگشت‌نخوردهٔ رزرو وصل باشد. رزرو دستی، رزرو پرداخت‌نشده و رزروی
 *         که پرداختش برگشت خورده، هیچ درآمدی برای آرایشگر ایجاد نمی‌کند.
 *
 * رکورد «بازپرداخت مشتری» (REFUND در انتظار واریز دستی) عمداً حفظ می‌شود،
 * چون یک تعهد واقعی است که ادمین باید آن را به‌صورت دستی واریز و تسویه کند؛
 * اما در هیچ‌کدام از کارت‌های خلاصه جمع زده نمی‌شود.
 */

type TransactionSource = 'gateway' | 'wallet';

type TransactionUser = {
  id: number;
  fullName: string;
  phone: string;
  roles: string[];
  salonName: string | null;
};

export interface AdminTransactionRow {
  id: string;
  source: TransactionSource;
  isCustomerRefundRequest: boolean;
  type: PaymentPurpose | TransactionType;
  status: PaymentStatus | TransactionStatus;
  amount: number;
  commissionAmount: number | null;
  estimatedCommissionAmount: number | null;
  serviceAmount: number | null;
  barberAmount: number | null;
  description: string | null;
  user: TransactionUser | null;
  createdAt: Date;
  paidAt: Date | null;
  orderId: string | null;
  trackId: number | string | null;
  referenceNumber: string | null;
  referenceId: string | null;
  cardNumber: string | null;
}

export interface AdminTransactionSummary {
  matchedCount: number;
  /** مجموع پرداخت‌های موفقِ برگشت‌نخوردهٔ درگاه */
  gatewayReceivedAmount: number;
  successfulGatewayPaymentCount: number;
  /** پرداخت رزروهای موفق و برگشت‌نخورده (شامل کمیسیون) */
  bookingPaymentsAmount: number;
  /** کمیسیون قطعی همان رزروها */
  bookingCommissionAmount: number;
  bookingCommissionUnknownCount: number;
  subscriptionRevenueAmount: number;
  publicPageRevenueAmount: number;
  publicPageCount: number;
  walletTopUpAmount: number;
  /** کمیسیون + اشتراک + صفحه اختصاصی */
  netRevenueAmount: number;
  /** درآمد رزروی که واقعاً در کیف پول آرایشگر مانده است */
  barberWalletCreditsAmount: number;
  pendingWithdrawalsAmount: number;
  pendingWithdrawalCount: number;
  completedWithdrawalsAmount: number;
  /** بازپرداخت‌های مشتری که هنوز دستی واریز نشده‌اند (جمع زده نمی‌شود) */
  pendingCustomerRefundsAmount: number;
  pendingCustomerRefundCount: number;
}

type PaymentSummaryRow = {
  amount: string | number;
  purpose: PaymentPurpose;
  status: PaymentStatus;
  metadata: string | null;
};

type WalletSummaryRow = {
  amount: string | number;
  type: TransactionType;
  status: TransactionStatus;
  description: string | null;
  referenceId: string | null;
};

type PaymentMetadata = Record<string, unknown> & {
  depositLink?: boolean | string;
  depositAmount?: number | string | null;
  commissionAmount?: number | string | null;
  totalPrice?: number | string | null;
  price?: number | string | null;
  refundQueued?: boolean | string | null;
  items?: Array<{ price?: number | string | null }>;
};

/** نشانهٔ متنیِ پرداختِ برگشت‌خورده در ستون JSON متادیتا */
const REFUNDED_METADATA_PATTERN = '%"refundQueued":true%';

/** شرح تراکنش واریز درآمد رزرو به کیف پول آرایشگر */
const BOOKING_CREDIT_DESCRIPTION_PATTERN = 'درآمد رزرو نوبت%';

@Injectable()
export class AdminTransactionsService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
    @InjectRepository(Transaction)
    private readonly transactionRepo: Repository<Transaction>,

    private readonly walletService: WalletService,
  ) {}

  async list(query: AdminTransactionQueryDto) {
    this.validateDateRange(query);

    const page = Math.max(1, Math.floor(Number(query.page) || 1));
    const limit = Math.min(
      100,
      Math.max(1, Math.floor(Number(query.limit) || 25)),
    );
    const offset = (page - 1) * limit;
    const includeGateway = query.source !== 'wallet';
    const includeWallet = query.source !== 'gateway';
    const paymentQuery = this.createPaymentQuery(query);
    const walletQuery = this.createWalletQuery(query);

    const [paymentResult, walletResult, paymentSummaryRows, walletSummaryRows] =
      await Promise.all([
        includeGateway
          ? paymentQuery
              .clone()
              .take(offset + limit)
              .getManyAndCount()
          : Promise.resolve([[], 0] as [Payment[], number]),
        includeWallet
          ? walletQuery
              .clone()
              .take(offset + limit)
              .getManyAndCount()
          : Promise.resolve([[], 0] as [Transaction[], number]),
        includeGateway
          ? this.getPaymentSummaryRows(paymentQuery)
          : Promise.resolve([]),
        includeWallet
          ? this.getWalletSummaryRows(walletQuery)
          : Promise.resolve([]),
      ]);

    const [payments, paymentCount] = paymentResult;
    const [walletEntries, walletCount] = walletResult;
    const transactions = [
      ...payments.map(payment => this.mapPayment(payment)),
      ...walletEntries.map(transaction =>
        this.mapWalletTransaction(transaction),
      ),
    ].sort((left, right) => this.compareTransactions(left, right));
    const total = paymentCount + walletCount;

    return {
      data: {
        transactions: transactions.slice(offset, offset + limit),
        summary: this.summarize(paymentSummaryRows, walletSummaryRows, total),
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async exportData(query: AdminTransactionQueryDto) {
    this.validateDateRange(query);

    const includeGateway = query.source !== 'wallet';
    const includeWallet = query.source !== 'gateway';
    const paymentQuery = this.createPaymentQuery(query);
    const walletQuery = this.createWalletQuery(query);
    const [payments, walletEntries, paymentSummaryRows, walletSummaryRows] =
      await Promise.all([
        includeGateway ? paymentQuery.clone().getMany() : Promise.resolve([]),
        includeWallet ? walletQuery.clone().getMany() : Promise.resolve([]),
        includeGateway
          ? this.getPaymentSummaryRows(paymentQuery)
          : Promise.resolve([]),
        includeWallet
          ? this.getWalletSummaryRows(walletQuery)
          : Promise.resolve([]),
      ]);

    const transactions = [
      ...payments.map(payment => this.mapPayment(payment)),
      ...walletEntries.map(transaction =>
        this.mapWalletTransaction(transaction),
      ),
    ].sort((left, right) => this.compareTransactions(left, right));

    return {
      data: {
        transactions,
        summary: this.summarize(
          paymentSummaryRows,
          walletSummaryRows,
          transactions.length,
        ),
      },
    };
  }

  async settleCustomerRefund(id: string, transferReference?: string) {
    const transaction = await this.transactionRepo.findOne({ where: { id } });
    if (!transaction) {
      throw new BadRequestException('درخواست بازپرداخت یافت نشد.');
    }
    if (
      transaction.type !== TransactionType.REFUND ||
      transaction.status !== TransactionStatus.PENDING ||
      !transaction.description?.startsWith(CUSTOMER_REFUND_PENDING_PREFIX)
    ) {
      throw new BadRequestException(
        'این مورد درخواست بازپرداختِ در انتظار پرداخت نیست یا قبلاً بسته شده است.',
      );
    }

    const note = transaction.description
      .slice(CUSTOMER_REFUND_PENDING_PREFIX.length)
      .trim();
    const reference = transferReference?.trim();
    const description = [
      CUSTOMER_REFUND_SETTLED_PREFIX,
      note,
      reference ? `شناسه پیگیری واریز: ${reference}` : '',
    ]
      .filter(Boolean)
      .join(' | ');
    const result = await this.transactionRepo.update(
      {
        id,
        type: TransactionType.REFUND,
        status: TransactionStatus.PENDING,
      },
      { status: TransactionStatus.COMPLETED, description },
    );
    if (result.affected === 0) {
      throw new BadRequestException(
        'این درخواست هم‌زمان توسط ادمین دیگری ثبت یا پرداخت شده است.',
      );
    }

    return this.transactionRepo.findOne({ where: { id } });
  }

  /** تایید برداشت آرایشگر (موجودی قبلاً کسر شده است) */
  async approveWithdrawal(id: string, transferReference?: string) {
    return this.walletService.approveWithdrawal(id, transferReference);
  }

  /** رد برداشت آرایشگر + برگرداندن مبلغ به کیف پول */
  async rejectWithdrawal(id: string, reason?: string) {
    return this.walletService.rejectWithdrawal(id, reason);
  }

  // ==================== ساخت کوئری‌ها ====================

  /**
   * شناسهٔ پرداخت‌هایی که برگشت خورده‌اند.
   *
   * هر جا برای یک پرداخت، رکورد بازپرداختِ مشتری (REFUND) ساخته می‌شود؛
   * یعنی لغو رزرو قطعی شده و پول باید برگردد. این زیرکوئری عمداً
   * غیرهم‌بسته (non-correlated) است تا MySQL یک‌بار آن را بسازد، نه یک‌بار
   * برای هر ردیف پرداخت.
   */
  private refundedPaymentIdsSubquery() {
    return `(
      SELECT refund_tx.referenceId FROM transactions refund_tx
      WHERE refund_tx.type = :refundTxType
        AND refund_tx.referenceId IS NOT NULL
    )`;
  }

  /**
   * شرط «این پرداخت برگشت نخورده است».
   *
   * دو نشانه بررسی می‌شود تا هم داده‌های قدیمی (که فقط رکورد بازپرداخت
   * دارند) پوشش داده شوند و هم داده‌های تازه‌ای که پرچم متادیتا می‌گیرند.
   *
   * @param paymentIdExpression عبارت SQL برای شناسهٔ پرداخت (payment.id یا bookingPayment.id)
   * @param metadataExpression ستون JSON متادیتای همان پرداخت
   */
  private notRefundedCondition(
    paymentIdExpression: string,
    metadataExpression: string,
  ) {
    return `(
      COALESCE(${metadataExpression}, '') NOT LIKE :refundedMetadataPattern
      AND ${paymentIdExpression} NOT IN ${this.refundedPaymentIdsSubquery()}
    )`;
  }

  private createPaymentQuery(query: AdminTransactionQueryDto) {
    const qb = this.paymentRepo
      .createQueryBuilder('payment')
      .leftJoinAndSelect('payment.user', 'user')
      .leftJoinAndSelect('user.barberProfile', 'barberProfile')
      .orderBy('payment.createdAt', 'DESC')
      .addOrderBy('payment.id', 'DESC');

    // ۱) فقط پرداخت موفق درگاه؛ تلاش‌های ناموفق/نیمه‌کاره/لغوشده هرگز نمی‌آیند.
    qb.andWhere('payment.status = :paidStatus', {
      paidStatus: PaymentStatus.PAID,
    });

    // ۲) پرداخت‌های برگشت‌خورده (رزرو لغو/ردشده) هم نمی‌آیند؛ پولی که برگشته
    //    نه دریافتیِ ماست و نه درآمد آرایشگر.
    qb.andWhere(this.notRefundedCondition('payment.id', 'payment.metadata'), {
      refundedMetadataPattern: REFUNDED_METADATA_PATTERN,
      refundTxType: TransactionType.REFUND,
    });

    if (query.type) {
      if (
        Object.values(PaymentPurpose).includes(query.type as PaymentPurpose)
      ) {
        qb.andWhere('payment.purpose = :paymentPurpose', {
          paymentPurpose: query.type,
        });
      } else {
        qb.andWhere('1 = 0');
      }
    }

    if (query.status) {
      // تنها وضعیت مجاز برای منبع درگاه، پرداخت موفق است.
      if (query.status !== 'PAID') {
        qb.andWhere('1 = 0');
      }
    }

    if (query.search?.trim()) {
      const search = `%${query.search.trim()}%`;
      qb.andWhere(
        new Brackets(searchQuery => {
          searchQuery
            .where('user.fullName LIKE :search', { search })
            .orWhere('user.phone LIKE :search', { search })
            .orWhere('payment.id LIKE :search', { search })
            .orWhere('payment.orderId LIKE :search', { search })
            .orWhere('payment.description LIKE :search', { search })
            .orWhere('payment.refNumber LIKE :search', { search })
            .orWhere('payment.cardNumber LIKE :search', { search })
            .orWhere('CAST(payment.trackId AS CHAR) LIKE :search', { search });
        }),
      );
    }

    this.applyDateFilters(qb, 'payment', query);
    return qb;
  }

  private createWalletQuery(query: AdminTransactionQueryDto) {
    const qb = this.transactionRepo
      .createQueryBuilder('transaction')
      .leftJoinAndSelect('transaction.wallet', 'wallet')
      .leftJoinAndSelect('wallet.user', 'user')
      .leftJoinAndSelect('user.barberProfile', 'barberProfile')
      // واریز درآمد رزرو فقط وقتی معتبر است که به پرداختِ موفقِ همان رزرو
      // وصل باشد؛ رزرو دستی یا پرداخت‌نشده هیچ پولی وارد سیستم نکرده است.
      .leftJoin(
        Payment,
        'bookingPayment',
        'bookingPayment.id = transaction.referenceId AND bookingPayment.purpose = :bookingPaymentPurpose AND bookingPayment.status = :bookingPaymentStatus',
        {
          bookingPaymentPurpose: PaymentPurpose.BOOKING,
          bookingPaymentStatus: PaymentStatus.PAID,
        },
      )
      .orderBy('transaction.createdAt', 'DESC')
      .addOrderBy('transaction.id', 'DESC');

    // ۱) تراکنش‌های ناموفق کیف پول کلاً حذف می‌شوند.
    qb.andWhere('transaction.status != :failedStatus', {
      failedStatus: TransactionStatus.FAILED,
    });

    // ۲) کسر کیف پول آرایشگر بابت لغو رزرو هرگز نمایش داده نمی‌شود.
    //    این رکورد فقط قرینهٔ واریزی است که خودش هم در گزارش نمی‌آید؛
    //    نگه‌داشتنش باعث می‌شد ادمین فکر کند پولی از آرایشگر کسر شده است.
    qb.andWhere(
      '(transaction.description IS NULL OR transaction.description NOT LIKE :cancellationDebitPrefix)',
      { cancellationDebitPrefix: `${BARBER_CANCELLATION_DEBIT_PREFIX}%` },
    );

    // ۳) واریز درآمد رزرو باید هم به پرداخت موفق وصل باشد و هم آن پرداخت
    //    برگشت نخورده باشد.
    qb.andWhere(
      `(
        COALESCE(transaction.description, '') NOT LIKE :bookingCreditPattern
        OR (
          bookingPayment.id IS NOT NULL
          AND ${this.notRefundedCondition('bookingPayment.id', 'bookingPayment.metadata')}
        )
      )`,
      {
        bookingCreditPattern: BOOKING_CREDIT_DESCRIPTION_PATTERN,
        refundedMetadataPattern: REFUNDED_METADATA_PATTERN,
        refundTxType: TransactionType.REFUND,
      },
    );

    if (query.type) {
      if (
        Object.values(TransactionType).includes(query.type as TransactionType)
      ) {
        qb.andWhere('transaction.type = :walletType', {
          walletType: query.type,
        });
      } else {
        qb.andWhere('1 = 0');
      }
    }

    if (query.status) {
      if (
        Object.values(TransactionStatus).includes(
          query.status as TransactionStatus,
        ) &&
        (query.status as TransactionStatus) !== TransactionStatus.FAILED
      ) {
        qb.andWhere('transaction.status = :walletStatus', {
          walletStatus: query.status,
        });
      } else {
        qb.andWhere('1 = 0');
      }
    }

    if (query.search?.trim()) {
      const search = `%${query.search.trim()}%`;
      qb.andWhere(
        new Brackets(searchQuery => {
          searchQuery
            .where('user.fullName LIKE :search', { search })
            .orWhere('user.phone LIKE :search', { search })
            .orWhere('transaction.id LIKE :search', { search })
            .orWhere('transaction.description LIKE :search', { search })
            .orWhere('transaction.referenceId LIKE :search', { search })
            .orWhere('CAST(transaction.amount AS CHAR) LIKE :search', {
              search,
            });
        }),
      );
    }

    this.applyDateFilters(qb, 'transaction', query);
    return qb;
  }

  private applyDateFilters(
    qb: SelectQueryBuilder<any>,
    alias: string,
    query: AdminTransactionQueryDto,
  ) {
    if (query.from) {
      const from =
        query.from.length === 10 ? `${query.from} 00:00:00` : query.from;
      qb.andWhere(`${alias}.createdAt >= :from`, { from });
    }

    if (query.to) {
      if (query.to.length === 10) {
        const toExclusive = new Date(`${query.to}T00:00:00.000Z`);
        toExclusive.setUTCDate(toExclusive.getUTCDate() + 1);
        qb.andWhere(`${alias}.createdAt < :toExclusive`, { toExclusive });
      } else {
        qb.andWhere(`${alias}.createdAt <= :to`, { to: query.to });
      }
    }
  }

  private validateDateRange(query: AdminTransactionQueryDto) {
    if (
      query.from &&
      query.to &&
      new Date(query.from).getTime() > new Date(query.to).getTime()
    ) {
      throw new BadRequestException(
        'تاریخ شروع نباید بعد از تاریخ پایان باشد.',
      );
    }
  }

  // ==================== دادهٔ خلاصه ====================

  private async getPaymentSummaryRows(query: SelectQueryBuilder<Payment>) {
    return query
      .clone()
      .select('payment.amount', 'amount')
      .addSelect('payment.purpose', 'purpose')
      .addSelect('payment.status', 'status')
      .addSelect('payment.metadata', 'metadata')
      .getRawMany<PaymentSummaryRow>();
  }

  private async getWalletSummaryRows(query: SelectQueryBuilder<Transaction>) {
    return query
      .clone()
      .select('transaction.amount', 'amount')
      .addSelect('transaction.type', 'type')
      .addSelect('transaction.status', 'status')
      .addSelect('transaction.description', 'description')
      .addSelect('transaction.referenceId', 'referenceId')
      .getRawMany<WalletSummaryRow>();
  }

  // ==================== نگاشت ردیف‌ها ====================

  private mapPayment(payment: Payment): AdminTransactionRow {
    const amount = this.toAmount(payment.amount);
    const metadata = this.parseMetadata(payment.metadata);
    const breakdown = this.getBookingBreakdown(
      payment.purpose,
      amount,
      metadata,
    );

    return {
      id: payment.id,
      source: 'gateway',
      isCustomerRefundRequest: false,
      type: payment.purpose,
      status: payment.status,
      amount,
      commissionAmount: breakdown.commissionAmount,
      estimatedCommissionAmount: 0,
      serviceAmount: breakdown.serviceAmount,
      barberAmount: breakdown.barberAmount,
      description: payment.description,
      user: this.mapUser(payment.user),
      createdAt: payment.createdAt,
      paidAt: payment.paidAt,
      orderId: payment.orderId,
      trackId: payment.trackId,
      referenceNumber: payment.refNumber,
      referenceId: payment.purposeId,
      cardNumber: payment.cardNumber,
    };
  }

  private mapWalletTransaction(transaction: Transaction): AdminTransactionRow {
    const isCustomerRefundRequest = Boolean(
      transaction.type === TransactionType.REFUND &&
      (transaction.description?.startsWith(CUSTOMER_REFUND_PENDING_PREFIX) ||
        transaction.description?.startsWith(CUSTOMER_REFUND_SETTLED_PREFIX)),
    );

    return {
      id: transaction.id,
      source: 'wallet',
      isCustomerRefundRequest,
      type: transaction.type,
      status: transaction.status,
      amount: this.toAmount(transaction.amount),
      commissionAmount: 0,
      estimatedCommissionAmount: 0,
      serviceAmount: null,
      barberAmount: null,
      description: transaction.description,
      user: this.mapUser(transaction.wallet?.user),
      createdAt: transaction.createdAt,
      paidAt:
        !isCustomerRefundRequest &&
        transaction.status === TransactionStatus.COMPLETED
          ? transaction.createdAt
          : null,
      orderId: null,
      trackId: null,
      referenceNumber: null,
      referenceId: transaction.referenceId,
      cardNumber: null,
    };
  }

  private mapUser(user: User | null | undefined): TransactionUser | null {
    if (!user) return null;

    return {
      id: Number(user.id),
      fullName: user.fullName ?? '',
      phone: user.phone ?? '',
      roles: Array.isArray(user.roles)
        ? user.roles
        : String(user.roles || '')
            .split(',')
            .map(role => role.trim())
            .filter(Boolean),
      salonName: user.barberProfile?.salonName ?? null,
    };
  }

  // ==================== جمع‌بندی کارت‌ها ====================

  private summarize(
    payments: PaymentSummaryRow[],
    walletEntries: WalletSummaryRow[],
    matchedCount: number,
  ): AdminTransactionSummary {
    const summary: AdminTransactionSummary = {
      matchedCount,
      gatewayReceivedAmount: 0,
      successfulGatewayPaymentCount: 0,
      bookingPaymentsAmount: 0,
      bookingCommissionAmount: 0,
      bookingCommissionUnknownCount: 0,
      subscriptionRevenueAmount: 0,
      publicPageRevenueAmount: 0,
      publicPageCount: 0,
      walletTopUpAmount: 0,
      netRevenueAmount: 0,
      barberWalletCreditsAmount: 0,
      pendingWithdrawalsAmount: 0,
      pendingWithdrawalCount: 0,
      completedWithdrawalsAmount: 0,
      pendingCustomerRefundsAmount: 0,
      pendingCustomerRefundCount: 0,
    };

    for (const payment of payments) {
      const amount = this.toAmount(payment.amount);
      const metadata = this.parseMetadata(payment.metadata);

      // ردیف‌های این آرایه از قبل «PAID و برگشت‌نخورده» فیلتر شده‌اند؛ این
      // دو بررسی برای اطمینان در برابر دادهٔ ناسازگار یا کهنه است.
      if (payment.status !== PaymentStatus.PAID) continue;
      if (metadata?.refundQueued === true) continue;

      summary.gatewayReceivedAmount += amount;
      summary.successfulGatewayPaymentCount += 1;

      if (payment.purpose === PaymentPurpose.BOOKING) {
        summary.bookingPaymentsAmount += amount;

        const commissionAmount = this.getBookingBreakdown(
          payment.purpose,
          amount,
          metadata,
        ).commissionAmount;
        if (commissionAmount === null) {
          summary.bookingCommissionUnknownCount += 1;
        } else {
          summary.bookingCommissionAmount += commissionAmount;
        }
      } else if (payment.purpose === PaymentPurpose.SUBSCRIPTION) {
        summary.subscriptionRevenueAmount += amount;
      } else if (payment.purpose === PaymentPurpose.PUBLIC_PAGE) {
        summary.publicPageRevenueAmount += amount;
        summary.publicPageCount += 1;
      } else if (payment.purpose === PaymentPurpose.WALLET) {
        summary.walletTopUpAmount += amount;
      }
    }

    for (const transaction of walletEntries) {
      const amount = this.toAmount(transaction.amount);
      const description = transaction.description ?? '';

      // کسر بابت لغو رزرو: قرینهٔ واریزی باطل‌شده؛ نه در کارت‌ها و نه در
      // دفتر تراکنش‌ها معنا ندارد و هرگز جمع زده نمی‌شود.
      if (
        transaction.type === TransactionType.WITHDRAWAL &&
        description.startsWith(BARBER_CANCELLATION_DEBIT_PREFIX)
      ) {
        continue;
      }

      if (transaction.type === TransactionType.REFUND) {
        // تعهد بازپرداخت به مشتری؛ فقط برای نمایش بار معلق شمرده می‌شود.
        if (transaction.status === TransactionStatus.PENDING) {
          summary.pendingCustomerRefundsAmount += amount;
          summary.pendingCustomerRefundCount += 1;
        }

        continue;
      }

      if (transaction.status === TransactionStatus.PENDING) {
        if (transaction.type === TransactionType.WITHDRAWAL) {
          summary.pendingWithdrawalsAmount += amount;
          summary.pendingWithdrawalCount += 1;
        }

        continue;
      }

      if (
        transaction.status === TransactionStatus.COMPLETED &&
        transaction.type === TransactionType.WITHDRAWAL
      ) {
        summary.completedWithdrawalsAmount += amount;
        continue;
      }

      // درآمد رزرو فقط وقتی درآمد آرایشگر است که به پرداختِ موفق و
      // برگشت‌نخورده وصل باشد (کوئری از قبل همین را تضمین کرده است).
      if (
        transaction.status === TransactionStatus.COMPLETED &&
        transaction.type === TransactionType.DEPOSIT &&
        description.startsWith('درآمد رزرو نوبت') &&
        transaction.referenceId
      ) {
        summary.barberWalletCreditsAmount += amount;
      }
    }

    summary.netRevenueAmount = this.roundAmount(
      summary.bookingCommissionAmount +
        summary.subscriptionRevenueAmount +
        summary.publicPageRevenueAmount,
    );

    for (const key of [
      'gatewayReceivedAmount',
      'bookingPaymentsAmount',
      'bookingCommissionAmount',
      'subscriptionRevenueAmount',
      'publicPageRevenueAmount',
      'walletTopUpAmount',
      'netRevenueAmount',
      'barberWalletCreditsAmount',
      'pendingWithdrawalsAmount',
      'completedWithdrawalsAmount',
      'pendingCustomerRefundsAmount',
    ] as const) {
      summary[key] = this.roundAmount(summary[key]);
    }

    return summary;
  }

  // ==================== تفکیک سهم رزرو ====================

  private getBookingBreakdown(
    purpose: PaymentPurpose,
    amount: number,
    metadata: PaymentMetadata | null,
  ) {
    if (purpose !== PaymentPurpose.BOOKING) {
      return {
        commissionAmount: 0,
        serviceAmount: null,
        barberAmount: null,
      };
    }

    if (metadata?.refundQueued === true) {
      return {
        commissionAmount: 0,
        serviceAmount: this.getServiceAmount(metadata),
        barberAmount: 0,
      };
    }

    const isDepositLink =
      metadata?.depositLink === true ||
      String(metadata?.depositLink).toLowerCase() === 'true';
    /**
     * لینک بیعانه هم مثل رزرو آنلاین شامل ۱۰٪ کمیسیون است: پرداخت مشتری =
     * بیعانه + کمیسیون، اما فقط بیعانه درآمد آرایشگر است. برای پرداخت‌های
     * قدیمی که این تفکیک را ندارند، رفتار قبلی حفظ می‌شود.
     */
    if (isDepositLink) {
      const depositAmount = this.readAmount(metadata?.depositAmount);
      const explicitCommission = this.readAmount(metadata?.commissionAmount);
      const totalServicePrice = this.getServiceAmount(metadata);

      if (depositAmount !== null || explicitCommission !== null) {
        const commissionAmount = explicitCommission ?? 0;

        return {
          commissionAmount: this.roundAmount(commissionAmount),
          serviceAmount: totalServicePrice,
          barberAmount: this.roundAmount(
            depositAmount ?? Math.max(0, amount - commissionAmount),
          ),
        };
      }

      return {
        commissionAmount: 0,
        serviceAmount: totalServicePrice,
        barberAmount: amount,
      };
    }

    const serviceAmount = this.getServiceAmount(metadata);
    const explicitBarberDeposit = this.readAmount(metadata?.depositAmount);
    const explicitCommission = this.readAmount(metadata?.commissionAmount);
    const barberBase = explicitBarberDeposit ?? serviceAmount;
    const commissionAmount =
      explicitCommission ??
      (barberBase === null ? null : Math.max(0, amount - barberBase));

    return {
      commissionAmount:
        commissionAmount === null ? null : this.roundAmount(commissionAmount),
      serviceAmount,
      barberAmount:
        barberBase ??
        (commissionAmount === null
          ? null
          : Math.max(0, amount - commissionAmount)),
    };
  }

  private getServiceAmount(metadata: PaymentMetadata | null): number | null {
    if (!metadata) return null;

    const totalPrice = this.readAmount(metadata.totalPrice);
    if (totalPrice !== null) return totalPrice;

    if (Array.isArray(metadata.items)) {
      const prices = metadata.items
        .map(item => this.readAmount(item?.price))
        .filter((price): price is number => price !== null);
      if (prices.length)
        return this.roundAmount(prices.reduce((sum, price) => sum + price, 0));
    }

    return this.readAmount(metadata.price);
  }

  private parseMetadata(value: string | null): PaymentMetadata | null {
    if (!value) return null;
    try {
      const parsed: unknown = JSON.parse(value);
      return parsed && typeof parsed === 'object'
        ? (parsed as PaymentMetadata)
        : null;
    } catch {
      return null;
    }
  }

  private readAmount(value: unknown): number | null {
    if (value === null || value === undefined || value === '') return null;
    const amount = Number(value);
    return Number.isFinite(amount) && amount >= 0 ? amount : null;
  }

  private toAmount(value: number | string | null | undefined): number {
    return this.readAmount(value) ?? 0;
  }

  private roundAmount(value: number): number {
    return Number(value.toFixed(2));
  }

  private compareTransactions(
    left: AdminTransactionRow,
    right: AdminTransactionRow,
  ) {
    const dateDifference =
      new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
    if (dateDifference !== 0) return dateDifference;
    return `${right.source}:${right.id}`.localeCompare(
      `${left.source}:${left.id}`,
    );
  }
}
