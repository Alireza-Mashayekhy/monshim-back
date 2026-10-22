// src/payment/admin-withdrawals.service.ts
import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { getPagination } from 'src/common/query';
import { BankCard } from 'src/wallet/entities/bank-card.entity';
import {
  Transaction,
  TransactionStatus,
  TransactionType,
} from 'src/wallet/entities/transaction.entity';
import { BARBER_CANCELLATION_DEBIT_PREFIX } from 'src/wallet/refund.constants';
import { WalletService } from 'src/wallet/wallet.service';
import { Brackets, In, Repository, SelectQueryBuilder } from 'typeorm';

import { AdminWithdrawalQueryDto } from './dto/admin-withdrawal-query.dto';

export interface AdminWithdrawalUser {
  id: number;
  fullName: string;
  phone: string;
  roles: string[];
  salonName: string | null;
}

export interface AdminWithdrawalCard {
  id: string;
  bankName: string;
  cardNumber: string;
  shebaNumber: string | null;
  ownerName: string;
  isDefault: boolean;
}

export interface AdminWithdrawalRow {
  id: string;
  amount: number;
  status: TransactionStatus;
  description: string | null;
  requestedAt: Date;
  /** موجودی کیف پول در لحظهٔ خواندن؛ مبلغ درخواست قبلاً از آن کسر شده است. */
  walletBalance: number;
  user: AdminWithdrawalUser | null;
  /** کارت مقصد؛ اگر آرایشگر بعداً کارت را حذف کند null است. */
  card: AdminWithdrawalCard | null;
}

export interface AdminWithdrawalSummary {
  totalCount: number;
  totalAmount: number;
  pendingCount: number;
  pendingAmount: number;
  completedCount: number;
  completedAmount: number;
  rejectedCount: number;
  rejectedAmount: number;
}

type WithdrawalSummaryRow = {
  totalCount: string | number;
  totalAmount: string | number;
  pendingCount: string | number;
  pendingAmount: string | number;
  completedCount: string | number;
  completedAmount: string | number;
  rejectedCount: string | number;
  rejectedAmount: string | number;
};

@Injectable()
export class AdminWithdrawalsService {
  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepo: Repository<Transaction>,
    @InjectRepository(BankCard)
    private readonly bankCardRepo: Repository<BankCard>,
    private readonly walletService: WalletService,
  ) {}

  async list(query: AdminWithdrawalQueryDto) {
    this.validateDateRange(query);

    const page = Math.max(1, Math.floor(Number(query.page) || 1));
    const limit = Math.min(
      100,
      Math.max(1, Math.floor(Number(query.limit) || 25)),
    );
    const { skip, take } = getPagination(page, limit);

    const [transactions, total] = await this.createBaseQuery(query)
      .skip(skip)
      .take(take)
      .getManyAndCount();

    const [cards, summary] = await Promise.all([
      this.getCards(transactions),
      this.getSummary(),
    ]);
    const cardMap = new Map(cards.map(card => [card.id, card]));

    const withdrawals = transactions.map(transaction =>
      this.mapRow(
        transaction,
        transaction.referenceId
          ? (cardMap.get(transaction.referenceId) ?? null)
          : null,
      ),
    );

    return {
      data: { withdrawals, summary },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  /** تایید برداشت: فقط وضعیت را نهایی می‌کند (موجودی قبلاً کسر شده است). */
  async approve(id: string, transferReference?: string) {
    return this.walletService.approveWithdrawal(id, transferReference);
  }

  /** رد برداشت: مبلغ به کیف پول آرایشگر برگردانده می‌شود. */
  async reject(id: string, reason?: string) {
    return this.walletService.rejectWithdrawal(id, reason);
  }

  /**
   * فیلتر مشترک لیست.
   *
   * «کسر کیف پول آرایشگر بابت لغو رزرو» هم با type=WITHDRAWAL ذخیره می‌شود
   * ولی درخواست برداشت نیست (از ابتدا COMPLETED است و پول به آرایشگر
   * برنمی‌گردد)؛ برای همین مثل گزارش مالی از لیست برداشت‌ها کنار گذاشته
   * می‌شود تا ادمین آن را با درخواست واقعی اشتباه نگیرد.
   */
  private createBaseQuery(query: AdminWithdrawalQueryDto) {
    const qb = this.transactionRepo
      .createQueryBuilder('transaction')
      .innerJoinAndSelect('transaction.wallet', 'wallet')
      .leftJoinAndSelect('wallet.user', 'user')
      .leftJoinAndSelect('user.barberProfile', 'barberProfile')
      .leftJoin(BankCard, 'card', 'card.id = transaction.referenceId')
      .where('transaction.type = :withdrawalType', {
        withdrawalType: TransactionType.WITHDRAWAL,
      })
      .andWhere(
        '(transaction.description IS NULL OR transaction.description NOT LIKE :cancellationPrefix)',
        { cancellationPrefix: `${BARBER_CANCELLATION_DEBIT_PREFIX}%` },
      )
      // درخواست‌های در انتظار همیشه بالای لیست می‌آیند تا از دید ادمین
      // خارج نشوند؛ بقیه بر اساس جدیدترین مرتب می‌شوند.
      .orderBy(
        "CASE WHEN transaction.status = 'PENDING' THEN 0 ELSE 1 END",
        'ASC',
      )
      .addOrderBy('transaction.createdAt', 'DESC')
      .addOrderBy('transaction.id', 'DESC');

    if (query.status) {
      qb.andWhere('transaction.status = :status', { status: query.status });
    }

    if (query.search?.trim()) {
      const search = `%${query.search.trim()}%`;
      qb.andWhere(
        new Brackets(searchQuery => {
          searchQuery
            .where('user.fullName LIKE :search', { search })
            .orWhere('user.phone LIKE :search', { search })
            .orWhere('barberProfile.salonName LIKE :search', { search })
            .orWhere('transaction.id LIKE :search', { search })
            .orWhere('transaction.description LIKE :search', { search })
            .orWhere('transaction.referenceId LIKE :search', { search })
            .orWhere('card.cardNumber LIKE :search', { search })
            .orWhere('card.shebaNumber LIKE :search', { search })
            .orWhere('card.ownerName LIKE :search', { search })
            .orWhere('CAST(transaction.amount AS CHAR) LIKE :search', {
              search,
            });
        }),
      );
    }

    this.applyDateFilters(qb, query);
    return qb;
  }

  private applyDateFilters(
    qb: SelectQueryBuilder<Transaction>,
    query: AdminWithdrawalQueryDto,
  ) {
    if (query.from) {
      const from =
        query.from.length === 10 ? `${query.from} 00:00:00` : query.from;
      qb.andWhere('transaction.createdAt >= :from', { from });
    }

    if (query.to) {
      if (query.to.length === 10) {
        const toExclusive = new Date(`${query.to}T00:00:00.000Z`);
        toExclusive.setUTCDate(toExclusive.getUTCDate() + 1);
        qb.andWhere('transaction.createdAt < :toExclusive', { toExclusive });
      } else {
        qb.andWhere('transaction.createdAt <= :to', { to: query.to });
      }
    }
  }

  private validateDateRange(query: AdminWithdrawalQueryDto) {
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

  private async getCards(transactions: Transaction[]) {
    const cardIds = [
      ...new Set(
        transactions
          .map(transaction => transaction.referenceId)
          .filter((value): value is string => Boolean(value)),
      ),
    ];

    if (!cardIds.length) return [];

    return this.bankCardRepo.find({ where: { id: In(cardIds) } });
  }

  /**
   * آمار کل برداشت‌ها (مستقل از فیلترهای صفحه).
   *
   * ادمین باید همیشه صف «در انتظار بررسی» را ببیند، حتی وقتی لیست را روی
   * وضعیت دیگری یا بازهٔ تاریخ فیلتر کرده است.
   */
  private async getSummary(): Promise<AdminWithdrawalSummary> {
    const row = await this.transactionRepo
      .createQueryBuilder('transaction')
      .select('COUNT(*)', 'totalCount')
      .addSelect('COALESCE(SUM(transaction.amount), 0)', 'totalAmount')
      .addSelect(
        'SUM(CASE WHEN transaction.status = :pending THEN 1 ELSE 0 END)',
        'pendingCount',
      )
      .addSelect(
        'COALESCE(SUM(CASE WHEN transaction.status = :pending THEN transaction.amount ELSE 0 END), 0)',
        'pendingAmount',
      )
      .addSelect(
        'SUM(CASE WHEN transaction.status = :completed THEN 1 ELSE 0 END)',
        'completedCount',
      )
      .addSelect(
        'COALESCE(SUM(CASE WHEN transaction.status = :completed THEN transaction.amount ELSE 0 END), 0)',
        'completedAmount',
      )
      .addSelect(
        'SUM(CASE WHEN transaction.status = :rejected THEN 1 ELSE 0 END)',
        'rejectedCount',
      )
      .addSelect(
        'COALESCE(SUM(CASE WHEN transaction.status = :rejected THEN transaction.amount ELSE 0 END), 0)',
        'rejectedAmount',
      )
      .where('transaction.type = :withdrawalType', {
        withdrawalType: TransactionType.WITHDRAWAL,
      })
      .andWhere(
        '(transaction.description IS NULL OR transaction.description NOT LIKE :cancellationPrefix)',
        { cancellationPrefix: `${BARBER_CANCELLATION_DEBIT_PREFIX}%` },
      )
      .setParameters({
        pending: TransactionStatus.PENDING,
        completed: TransactionStatus.COMPLETED,
        rejected: TransactionStatus.FAILED,
      })
      .getRawOne<WithdrawalSummaryRow>();

    return {
      totalCount: this.toNumber(row?.totalCount),
      totalAmount: this.toAmount(row?.totalAmount),
      pendingCount: this.toNumber(row?.pendingCount),
      pendingAmount: this.toAmount(row?.pendingAmount),
      completedCount: this.toNumber(row?.completedCount),
      completedAmount: this.toAmount(row?.completedAmount),
      rejectedCount: this.toNumber(row?.rejectedCount),
      rejectedAmount: this.toAmount(row?.rejectedAmount),
    };
  }

  private mapRow(
    transaction: Transaction,
    card: BankCard | null,
  ): AdminWithdrawalRow {
    const user = transaction.wallet?.user;

    return {
      id: transaction.id,
      amount: this.toAmount(transaction.amount),
      status: transaction.status,
      description: transaction.description ?? null,
      requestedAt: transaction.createdAt,
      walletBalance: this.toAmount(transaction.wallet?.balance),
      user: user
        ? {
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
          }
        : null,
      card: card
        ? {
            id: card.id,
            bankName: card.bankName,
            cardNumber: card.cardNumber,
            shebaNumber: card.shebaNumber ?? null,
            ownerName: card.ownerName,
            isDefault: Boolean(card.isDefault),
          }
        : null,
    };
  }

  private toNumber(value: string | number | null | undefined): number {
    const numeric = Number(value ?? 0);
    return Number.isFinite(numeric) ? numeric : 0;
  }

  private toAmount(value: string | number | null | undefined): number {
    return Math.round(this.toNumber(value) * 100) / 100;
  }
}
