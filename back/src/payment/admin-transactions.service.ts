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
import { Brackets, Repository, SelectQueryBuilder } from 'typeorm';

import { AdminTransactionQueryDto } from './dto/admin-transaction-query.dto';
import {
  Payment,
  PaymentPurpose,
  PaymentStatus,
} from './entities/payment.entity';

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
  gatewayReceivedAmount: number;
  successfulGatewayPaymentCount: number;
  bookingPaymentsAmount: number;
  bookingCommissionAmount: number;
  bookingCommissionUnknownCount: number;
  subscriptionRevenueAmount: number;
  walletTopUpAmount: number;
  barberWalletCreditsAmount: number;
  pendingWithdrawalsAmount: number;
  pendingWithdrawalCount: number;
  completedWithdrawalsAmount: number;
  barberCancellationDebitsAmount: number;
  barberCancellationDebitCount: number;
  pendingAmount: number;
  unsuccessfulAmount: number;
  unsuccessfulCount: number;
  pendingCount: number;
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
};

type PaymentMetadata = Record<string, unknown> & {
  depositLink?: boolean | string;
  commissionAmount?: number | string | null;
  totalPrice?: number | string | null;
  price?: number | string | null;
  items?: Array<{ price?: number | string | null }>;
};

@Injectable()
export class AdminTransactionsService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
    @InjectRepository(Transaction)
    private readonly transactionRepo: Repository<Transaction>,
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

  private createPaymentQuery(query: AdminTransactionQueryDto) {
    const qb = this.paymentRepo
      .createQueryBuilder('payment')
      .leftJoinAndSelect('payment.user', 'user')
      .leftJoinAndSelect('user.barberProfile', 'barberProfile')
      .orderBy('payment.createdAt', 'DESC')
      .addOrderBy('payment.id', 'DESC');

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
      if (
        Object.values(PaymentStatus).includes(query.status as PaymentStatus)
      ) {
        qb.andWhere('payment.status = :paymentStatus', {
          paymentStatus: query.status,
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
      .orderBy('transaction.createdAt', 'DESC')
      .addOrderBy('transaction.id', 'DESC');

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
        )
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
      .getRawMany<WalletSummaryRow>();
  }

  private mapPayment(payment: Payment): AdminTransactionRow {
    const amount = this.toAmount(payment.amount);
    const metadata = this.parseMetadata(payment.metadata);
    const breakdown = this.getBookingBreakdown(
      payment.purpose,
      amount,
      metadata,
    );
    const isPaid = payment.status === PaymentStatus.PAID;

    return {
      id: payment.id,
      source: 'gateway',
      isCustomerRefundRequest: false,
      type: payment.purpose,
      status: payment.status,
      amount,
      commissionAmount: isPaid ? breakdown.commissionAmount : 0,
      estimatedCommissionAmount:
        payment.status === PaymentStatus.PENDING
          ? breakdown.commissionAmount
          : 0,
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
      walletTopUpAmount: 0,
      barberWalletCreditsAmount: 0,
      pendingWithdrawalsAmount: 0,
      pendingWithdrawalCount: 0,
      completedWithdrawalsAmount: 0,
      barberCancellationDebitsAmount: 0,
      barberCancellationDebitCount: 0,
      pendingAmount: 0,
      unsuccessfulAmount: 0,
      unsuccessfulCount: 0,
      pendingCount: 0,
    };

    for (const payment of payments) {
      const amount = this.toAmount(payment.amount);
      if (payment.status === PaymentStatus.PAID) {
        summary.gatewayReceivedAmount += amount;
        summary.successfulGatewayPaymentCount += 1;

        if (payment.purpose === PaymentPurpose.BOOKING) {
          summary.bookingPaymentsAmount += amount;
          const metadata = this.parseMetadata(payment.metadata);
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
        } else if (payment.purpose === PaymentPurpose.WALLET) {
          summary.walletTopUpAmount += amount;
        }
      } else if (
        payment.status === PaymentStatus.FAILED ||
        payment.status === PaymentStatus.CANCELED
      ) {
        summary.unsuccessfulAmount += amount;
        summary.unsuccessfulCount += 1;
      } else if (payment.status === PaymentStatus.PENDING) {
        summary.pendingCount += 1;
        summary.pendingAmount += amount;
      }
    }

    for (const transaction of walletEntries) {
      const amount = this.toAmount(transaction.amount);
      if (transaction.status === TransactionStatus.PENDING) {
        summary.pendingCount += 1;
        summary.pendingAmount += amount;
        if (transaction.type === TransactionType.WITHDRAWAL) {
          summary.pendingWithdrawalsAmount += amount;
          summary.pendingWithdrawalCount += 1;
        }
      } else if (transaction.status === TransactionStatus.FAILED) {
        summary.unsuccessfulAmount += amount;
        summary.unsuccessfulCount += 1;
      } else if (
        transaction.status === TransactionStatus.COMPLETED &&
        transaction.type === TransactionType.WITHDRAWAL
      ) {
        if (
          transaction.description?.startsWith(BARBER_CANCELLATION_DEBIT_PREFIX)
        ) {
          summary.barberCancellationDebitsAmount += amount;
          summary.barberCancellationDebitCount += 1;
        } else {
          summary.completedWithdrawalsAmount += amount;
        }
      }

      if (
        transaction.status === TransactionStatus.COMPLETED &&
        transaction.type === TransactionType.DEPOSIT &&
        transaction.description?.startsWith('درآمد رزرو نوبت')
      ) {
        summary.barberWalletCreditsAmount += amount;
      }
    }

    for (const key of [
      'gatewayReceivedAmount',
      'bookingPaymentsAmount',
      'bookingCommissionAmount',
      'subscriptionRevenueAmount',
      'walletTopUpAmount',
      'barberWalletCreditsAmount',
      'pendingWithdrawalsAmount',
      'completedWithdrawalsAmount',
      'barberCancellationDebitsAmount',
      'pendingAmount',
      'unsuccessfulAmount',
    ] as const) {
      summary[key] = this.roundAmount(summary[key]);
    }

    return summary;
  }

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

    const isDepositLink =
      metadata?.depositLink === true ||
      String(metadata?.depositLink).toLowerCase() === 'true';
    if (isDepositLink) {
      return {
        commissionAmount: 0,
        serviceAmount: null,
        barberAmount: amount,
      };
    }

    const serviceAmount = this.getServiceAmount(metadata);
    const explicitCommission = this.readAmount(metadata?.commissionAmount);
    const commissionAmount =
      explicitCommission ??
      (serviceAmount === null ? null : Math.max(0, amount - serviceAmount));

    return {
      commissionAmount:
        commissionAmount === null ? null : this.roundAmount(commissionAmount),
      serviceAmount,
      barberAmount:
        serviceAmount ??
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
