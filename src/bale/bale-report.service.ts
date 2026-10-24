import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { BarberProfile } from 'src/barber/entities/barber.entity';
import {
  ACTIVE_BOOKING_STATUSES,
  Booking,
  BookingStatus,
} from 'src/booking/entities/booking.entity';
import {
  Payment,
  PaymentPurpose,
  PaymentStatus,
} from 'src/payment/entities/payment.entity';
import {
  NOT_REFUNDED_PARAMS,
  notRefundedCondition,
} from 'src/payment/payment-ledger';
import { User } from 'src/users/entities/user.entity';
import { BankCard } from 'src/wallet/entities/bank-card.entity';
import {
  Transaction,
  TransactionStatus,
  TransactionType,
} from 'src/wallet/entities/transaction.entity';
import {
  BARBER_CANCELLATION_DEBIT_PREFIX,
  CUSTOMER_REFUND_PENDING_PREFIX,
} from 'src/wallet/refund.constants';
import { In, Repository } from 'typeorm';

import { BaleReportPeriod } from './bale.constants';
import {
  BalePeriodRange,
  formatCount,
  formatTehranDateTime,
  formatToman,
  getReportPeriodRange,
  toFaDigits,
} from './bale-time.util';

const DIVIDER = '━━━━━━━━━━━━━━━━━━';

export interface BaleReportData {
  range: BalePeriodRange;
  generatedAt: Date;
  payments: {
    totalPaidCount: number;
    totalGatewayAmount: number;
    onlineBookingOrdersCount: number;
    onlineBookingAmount: number;
    depositLinkOrdersCount: number;
    depositLinkAmount: number;
    bookingBarberShareAmount: number;
    bookingCommissionAmount: number;
    subscriptionCount: number;
    subscriptionAmount: number;
    publicPageCount: number;
    publicPageAmount: number;
    walletChargeCount: number;
    walletChargeAmount: number;
    platformNetRevenueAmount: number;
  };
  bookings: {
    createdTotal: number;
    onlinePaidCount: number;
    depositPaidCount: number;
    manualOrUnpaidCount: number;
    completedCount: number;
    confirmedCount: number;
    pendingCount: number;
    canceledOrRejectedCount: number;
    scheduledActiveInPeriodCount: number;
  };
  withdrawals: {
    requestedCount: number;
    requestedAmount: number;
    completedCount: number;
    completedAmount: number;
    pendingInPeriodCount: number;
    pendingInPeriodAmount: number;
    rejectedCount: number;
    rejectedAmount: number;
    livePendingQueueCount: number;
    livePendingQueueAmount: number;
    livePendingRefundsCount: number;
    livePendingRefundsAmount: number;
  };
  users: {
    newUsersCount: number;
    newBarbersCount: number;
  };
}

interface RawPaymentRow {
  amount: string | number;
  purpose: PaymentPurpose;
  metadata: string | null;
}

@Injectable()
export class BaleReportService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
    @InjectRepository(Booking)
    private readonly bookingRepo: Repository<Booking>,
    @InjectRepository(Transaction)
    private readonly transactionRepo: Repository<Transaction>,
    @InjectRepository(BankCard)
    private readonly bankCardRepo: Repository<BankCard>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(BarberProfile)
    private readonly barberProfileRepo: Repository<BarberProfile>,
  ) {}

  async generateReportText(
    period: BaleReportPeriod,
    now = new Date(),
  ): Promise<string> {
    const data = await this.collectReportData(period, now);
    return this.formatReportMessage(data);
  }

  async collectReportData(
    period: BaleReportPeriod,
    now = new Date(),
  ): Promise<BaleReportData> {
    const range = getReportPeriodRange(period, now);

    const [
      paidPayments,
      createdBookings,
      scheduledActiveCount,
      periodWithdrawals,
      livePendingWithdrawals,
      livePendingRefunds,
      newUsersCount,
      newBarbersCount,
    ] = await Promise.all([
      this.fetchPaidPaymentsInRange(range.startUtc, range.endExclusiveUtc),
      this.fetchBookingsCreatedInRange(range.startUtc, range.endExclusiveUtc),
      this.countScheduledActiveBookings(range.startDateIso, range.endDateIso),
      this.summarizeWithdrawalsInRange(range.startUtc, range.endExclusiveUtc),
      this.summarizeLivePendingWithdrawals(),
      this.summarizeLivePendingCustomerRefunds(),
      this.countNewUsers(range.startUtc, range.endExclusiveUtc),
      this.countNewBarbers(range.startUtc, range.endExclusiveUtc),
    ]);

    const paymentsSummary = this.summarizePayments(paidPayments);
    const bookingsSummary = this.summarizeBookings(
      createdBookings,
      scheduledActiveCount,
    );

    return {
      range,
      generatedAt: now,
      payments: paymentsSummary,
      bookings: bookingsSummary,
      withdrawals: {
        ...periodWithdrawals,
        livePendingQueueCount: livePendingWithdrawals.count,
        livePendingQueueAmount: livePendingWithdrawals.amount,
        livePendingRefundsCount: livePendingRefunds.count,
        livePendingRefundsAmount: livePendingRefunds.amount,
      },
      users: {
        newUsersCount,
        newBarbersCount,
      },
    };
  }

  formatReportMessage(data: BaleReportData): string {
    const { range, payments, bookings, withdrawals, users } = data;

    const lines = [
      `📊 ${range.title}`,
      `🗓 بازه: ${range.rangeLabel}`,
      DIVIDER,
      '💰 درآمد و تراکنش‌های موفق درگاه',
      `• کل ورودی موفق درگاه: ${formatToman(payments.totalGatewayAmount)} (${formatCount(payments.totalPaidCount)} تراکنش)`,
      `• رزرو آنلاین: ${formatCount(payments.onlineBookingOrdersCount)} سفارش | ${formatToman(payments.onlineBookingAmount)}`,
      `• پرداخت لینک بیعانه: ${formatCount(payments.depositLinkOrdersCount)} سفارش | ${formatToman(payments.depositLinkAmount)}`,
      `• خرید اشتراک: ${formatCount(payments.subscriptionCount)} خرید | ${formatToman(payments.subscriptionAmount)}`,
      `• خرید صفحه اختصاصی: ${formatCount(payments.publicPageCount)} خرید | ${formatToman(payments.publicPageAmount)}`,
      `• شارژ کیف پول: ${formatCount(payments.walletChargeCount)} تراکنش | ${formatToman(payments.walletChargeAmount)}`,
      `• سهم آرایشگران از رزروها: ${formatToman(payments.bookingBarberShareAmount)}`,
      `• کمیسیون سایت از رزروها: ${formatToman(payments.bookingCommissionAmount)}`,
      `✨ خالص درآمد سایت (کمیسیون + اشتراک + صفحه): ${formatToman(payments.platformNetRevenueAmount)}`,
      '',
      '📅 وضعیت نوبت‌ها',
      `• نوبت‌های ثبت‌شده در این بازه: ${formatCount(bookings.createdTotal)} نوبت`,
      `  ├ آنلاین پرداخت‌شده: ${formatCount(bookings.onlinePaidCount)} | بیعانه پرداخت‌شده: ${formatCount(bookings.depositPaidCount)} | دستی/بدون پرداخت: ${formatCount(bookings.manualOrUnpaidCount)}`,
      `  └ انجام‌شده: ${formatCount(bookings.completedCount)} | تاییدشده: ${formatCount(bookings.confirmedCount)} | در انتظار: ${formatCount(bookings.pendingCount)} | لغو/رد: ${formatCount(bookings.canceledOrRejectedCount)}`,
      `• نوبت‌های فعالِ دارای تاریخ مراجعه در این بازه: ${formatCount(bookings.scheduledActiveInPeriodCount)} نوبت`,
      '',
      '🏧 درخواست‌های برداشت آرایشگران (در این بازه)',
      `• ثبت‌شده: ${formatCount(withdrawals.requestedCount)} مورد | ${formatToman(withdrawals.requestedAmount)}`,
      `• تسویه‌شده: ${formatCount(withdrawals.completedCount)} مورد (${formatToman(withdrawals.completedAmount)}) | در انتظار: ${formatCount(withdrawals.pendingInPeriodCount)} مورد (${formatToman(withdrawals.pendingInPeriodAmount)}) | ردشده: ${formatCount(withdrawals.rejectedCount)} مورد`,
      '',
      '🔔 وضعیت فعلی صف تسویه (هم‌اکنون)',
      `• برداشت‌های منتظر تایید ادمین: ${formatCount(withdrawals.livePendingQueueCount)} درخواست (${formatToman(withdrawals.livePendingQueueAmount)})`,
      ...(withdrawals.livePendingRefundsCount > 0
        ? [
            `• بازپرداخت‌های منتظر واریز مشتری: ${formatCount(withdrawals.livePendingRefundsCount)} مورد (${formatToman(withdrawals.livePendingRefundsAmount)})`,
          ]
        : []),
      '',
      '👥 کاربران جدید در این بازه',
      `• کل ثبت‌نام‌ها: ${formatCount(users.newUsersCount)} نفر | آرایشگران جدید: ${formatCount(users.newBarbersCount)} نفر`,
      DIVIDER,
      `⏱ زمان تهیه گزارش: ${formatTehranDateTime(data.generatedAt, true)}`,
    ];

    return lines.join('\n');
  }

  /**
   * گزارش فهرست درخواست‌های برداشتِ در انتظار بررسی ادمین
   */
  async generatePendingWithdrawalsText(limit = 10): Promise<string> {
    const [summary, pendingRows] = await Promise.all([
      this.summarizeLivePendingWithdrawals(),
      this.transactionRepo
        .createQueryBuilder('transaction')
        .innerJoinAndSelect('transaction.wallet', 'wallet')
        .leftJoinAndSelect('wallet.user', 'user')
        .leftJoinAndSelect('user.barberProfile', 'barberProfile')
        .where('transaction.type = :type', { type: TransactionType.WITHDRAWAL })
        .andWhere('transaction.status = :status', {
          status: TransactionStatus.PENDING,
        })
        .andWhere(
          '(transaction.description IS NULL OR transaction.description NOT LIKE :cancellationPrefix)',
          { cancellationPrefix: `${BARBER_CANCELLATION_DEBIT_PREFIX}%` },
        )
        .orderBy('transaction.createdAt', 'ASC')
        .take(limit)
        .getMany(),
    ]);

    if (summary.count === 0) {
      return [
        '🏦 صف درخواست‌های برداشت آرایشگران',
        DIVIDER,
        '✅ در حال حاضر هیچ درخواست برداشتی در انتظار بررسی نیست.',
        DIVIDER,
        `⏱ بروزرسانی: ${formatTehranDateTime(new Date(), true)}`,
      ].join('\n');
    }

    const cardIds = [
      ...new Set(
        pendingRows
          .map(row => row.referenceId)
          .filter((id): id is string => Boolean(id)),
      ),
    ];
    const cards = cardIds.length
      ? await this.bankCardRepo.find({ where: { id: In(cardIds) } })
      : [];
    const cardMap = new Map(cards.map(c => [c.id, c]));

    const itemLines = pendingRows.map((row, idx) => {
      const user = row.wallet?.user;
      const card = row.referenceId ? cardMap.get(row.referenceId) : undefined;
      const sheba = card?.shebaNumber
        ? card.shebaNumber.startsWith('IR')
          ? card.shebaNumber
          : `IR${card.shebaNumber}`
        : '—';

      return [
        `${toFaDigits(idx + 1)}. ${user?.fullName || 'آرایشگر'} (${user?.barberProfile?.salonName || 'بدون سالن'})`,
        `   💵 مبلغ: ${formatToman(row.amount)} | 📱 ${user?.phone || '—'}`,
        `   🏦 ${card?.bankName || '—'} | کارت: ${card?.cardNumber || '—'}`,
        `   🔢 شبا: ${sheba}`,
        `   🕒 ثبت: ${formatTehranDateTime(row.createdAt)}`,
      ].join('\n');
    });

    const lines = [
      '🏦 صف درخواست‌های برداشت در انتظار تایید',
      `📌 مجموع صف: ${formatCount(summary.count)} درخواست | ${formatToman(summary.amount)}`,
      DIVIDER,
      ...itemLines,
      ...(summary.count > pendingRows.length
        ? [
            '',
            `… و ${formatCount(summary.count - pendingRows.length)} مورد دیگر در پنل مدیریت سایت.`,
          ]
        : []),
      DIVIDER,
      `⏱ بروزرسانی: ${formatTehranDateTime(new Date(), true)}`,
    ];

    return lines.join('\n');
  }

  /**
   * پرداخت‌های موفقِ درگاه در بازهٔ گزارش.
   *
   * دقیقاً همان قاعدهٔ «خلاصه مالی» پنل ادمین اعمال می‌شود تا اعداد ربات با
   * پنل یکی باشد:
   *   • فقط `status = PAID`
   *   • پرداخت‌های برگشت‌خورده (لغو/رد رزرو) کنار گذاشته می‌شوند؛ چه با
   *     رکورد REFUND با `referenceId = payment.id` شناسایی شوند، چه با پرچم
   *     `refundQueued` در متادیتا.
   */
  private async fetchPaidPaymentsInRange(
    startUtc: Date,
    endExclusiveUtc: Date,
  ): Promise<RawPaymentRow[]> {
    return this.paymentRepo
      .createQueryBuilder('payment')
      .select('payment.amount', 'amount')
      .addSelect('payment.purpose', 'purpose')
      .addSelect('payment.metadata', 'metadata')
      .where('payment.status = :status', { status: PaymentStatus.PAID })
      .andWhere(
        'COALESCE(payment.paidAt, payment.createdAt) >= :startUtc AND COALESCE(payment.paidAt, payment.createdAt) < :endExclusiveUtc',
        { startUtc, endExclusiveUtc },
      )
      .andWhere(
        notRefundedCondition('payment.id', 'payment.metadata'),
        NOT_REFUNDED_PARAMS,
      )
      .getRawMany<RawPaymentRow>();
  }

  private async fetchBookingsCreatedInRange(
    startUtc: Date,
    endExclusiveUtc: Date,
  ): Promise<
    Pick<
      Booking,
      'status' | 'onlinePaidAt' | 'depositPaidAt' | 'sendDepositLink'
    >[]
  > {
    return this.bookingRepo
      .createQueryBuilder('booking')
      .select([
        'booking.id',
        'booking.status',
        'booking.onlinePaidAt',
        'booking.depositPaidAt',
        'booking.sendDepositLink',
      ])
      .where(
        'booking.createdAt >= :startUtc AND booking.createdAt < :endExclusiveUtc',
        { startUtc, endExclusiveUtc },
      )
      .getMany();
  }

  private async countScheduledActiveBookings(
    startDateIso: string,
    endDateIso: string,
  ): Promise<number> {
    return this.bookingRepo
      .createQueryBuilder('booking')
      .where('booking.date >= :startDateIso AND booking.date <= :endDateIso', {
        startDateIso,
        endDateIso,
      })
      .andWhere('booking.status IN (:...statuses)', {
        statuses: ACTIVE_BOOKING_STATUSES,
      })
      .getCount();
  }

  private async summarizeWithdrawalsInRange(
    startUtc: Date,
    endExclusiveUtc: Date,
  ) {
    const row = await this.transactionRepo
      .createQueryBuilder('transaction')
      .select('COUNT(*)', 'requestedCount')
      .addSelect('COALESCE(SUM(transaction.amount), 0)', 'requestedAmount')
      .addSelect(
        'SUM(CASE WHEN transaction.status = :completed THEN 1 ELSE 0 END)',
        'completedCount',
      )
      .addSelect(
        'COALESCE(SUM(CASE WHEN transaction.status = :completed THEN transaction.amount ELSE 0 END), 0)',
        'completedAmount',
      )
      .addSelect(
        'SUM(CASE WHEN transaction.status = :pending THEN 1 ELSE 0 END)',
        'pendingInPeriodCount',
      )
      .addSelect(
        'COALESCE(SUM(CASE WHEN transaction.status = :pending THEN transaction.amount ELSE 0 END), 0)',
        'pendingInPeriodAmount',
      )
      .addSelect(
        'SUM(CASE WHEN transaction.status = :failed THEN 1 ELSE 0 END)',
        'rejectedCount',
      )
      .addSelect(
        'COALESCE(SUM(CASE WHEN transaction.status = :failed THEN transaction.amount ELSE 0 END), 0)',
        'rejectedAmount',
      )
      .where('transaction.type = :type', { type: TransactionType.WITHDRAWAL })
      .andWhere(
        '(transaction.description IS NULL OR transaction.description NOT LIKE :cancellationPrefix)',
        { cancellationPrefix: `${BARBER_CANCELLATION_DEBIT_PREFIX}%` },
      )
      .andWhere(
        'transaction.createdAt >= :startUtc AND transaction.createdAt < :endExclusiveUtc',
        { startUtc, endExclusiveUtc },
      )
      .setParameters({
        completed: TransactionStatus.COMPLETED,
        pending: TransactionStatus.PENDING,
        failed: TransactionStatus.FAILED,
      })
      .getRawOne<Record<string, string | number | null>>();

    return {
      requestedCount: this.toInt(row?.requestedCount),
      requestedAmount: this.toAmount(row?.requestedAmount),
      completedCount: this.toInt(row?.completedCount),
      completedAmount: this.toAmount(row?.completedAmount),
      pendingInPeriodCount: this.toInt(row?.pendingInPeriodCount),
      pendingInPeriodAmount: this.toAmount(row?.pendingInPeriodAmount),
      rejectedCount: this.toInt(row?.rejectedCount),
      rejectedAmount: this.toAmount(row?.rejectedAmount),
    };
  }

  private async summarizeLivePendingWithdrawals(): Promise<{
    count: number;
    amount: number;
  }> {
    const row = await this.transactionRepo
      .createQueryBuilder('transaction')
      .select('COUNT(*)', 'count')
      .addSelect('COALESCE(SUM(transaction.amount), 0)', 'amount')
      .where('transaction.type = :type', { type: TransactionType.WITHDRAWAL })
      .andWhere('transaction.status = :status', {
        status: TransactionStatus.PENDING,
      })
      .andWhere(
        '(transaction.description IS NULL OR transaction.description NOT LIKE :cancellationPrefix)',
        { cancellationPrefix: `${BARBER_CANCELLATION_DEBIT_PREFIX}%` },
      )
      .getRawOne<{ count?: string | number; amount?: string | number }>();

    return {
      count: this.toInt(row?.count),
      amount: this.toAmount(row?.amount),
    };
  }

  private async summarizeLivePendingCustomerRefunds(): Promise<{
    count: number;
    amount: number;
  }> {
    const row = await this.transactionRepo
      .createQueryBuilder('transaction')
      .select('COUNT(*)', 'count')
      .addSelect('COALESCE(SUM(transaction.amount), 0)', 'amount')
      .where('transaction.type = :type', { type: TransactionType.REFUND })
      .andWhere('transaction.status = :status', {
        status: TransactionStatus.PENDING,
      })
      .andWhere('transaction.description LIKE :prefix', {
        prefix: `${CUSTOMER_REFUND_PENDING_PREFIX}%`,
      })
      .getRawOne<{ count?: string | number; amount?: string | number }>();

    return {
      count: this.toInt(row?.count),
      amount: this.toAmount(row?.amount),
    };
  }

  private async countNewUsers(
    startUtc: Date,
    endExclusiveUtc: Date,
  ): Promise<number> {
    return this.userRepo
      .createQueryBuilder('user')
      .where(
        'user.createdAt >= :startUtc AND user.createdAt < :endExclusiveUtc',
        { startUtc, endExclusiveUtc },
      )
      .getCount();
  }

  private async countNewBarbers(
    startUtc: Date,
    endExclusiveUtc: Date,
  ): Promise<number> {
    return this.barberProfileRepo
      .createQueryBuilder('barber')
      .where(
        'barber.createdAt >= :startUtc AND barber.createdAt < :endExclusiveUtc',
        { startUtc, endExclusiveUtc },
      )
      .getCount();
  }

  private summarizePayments(rows: RawPaymentRow[]) {
    const result = {
      totalPaidCount: 0,
      totalGatewayAmount: 0,
      onlineBookingOrdersCount: 0,
      onlineBookingAmount: 0,
      depositLinkOrdersCount: 0,
      depositLinkAmount: 0,
      bookingBarberShareAmount: 0,
      bookingCommissionAmount: 0,
      subscriptionCount: 0,
      subscriptionAmount: 0,
      publicPageCount: 0,
      publicPageAmount: 0,
      walletChargeCount: 0,
      walletChargeAmount: 0,
      platformNetRevenueAmount: 0,
    };

    for (const row of rows) {
      const amount = this.toAmount(row.amount);
      const meta = this.parseMetadata(row.metadata);

      // پرداختی که برگشت خورده (لغو/رد رزرو) درآمد قطعی نیست. کوئری این
      // موارد را از قبل حذف می‌کند؛ این بررسی برای دادهٔ ناسازگار یا کهنه است.
      if (meta?.refundQueued === true) {
        continue;
      }

      result.totalPaidCount += 1;
      result.totalGatewayAmount += amount;

      if (row.purpose === PaymentPurpose.BOOKING) {
        const isDepositLink =
          meta?.depositLink === true ||
          String(meta?.depositLink).toLowerCase() === 'true';

        if (isDepositLink) {
          result.depositLinkOrdersCount += 1;
          result.depositLinkAmount += amount;
        } else {
          result.onlineBookingOrdersCount += 1;
          result.onlineBookingAmount += amount;
        }

        const { barberShare, commission } = this.extractBookingSplit(
          amount,
          meta,
          isDepositLink,
        );
        result.bookingBarberShareAmount += barberShare;
        result.bookingCommissionAmount += commission;
      } else if (row.purpose === PaymentPurpose.SUBSCRIPTION) {
        result.subscriptionCount += 1;
        result.subscriptionAmount += amount;
      } else if (row.purpose === PaymentPurpose.PUBLIC_PAGE) {
        result.publicPageCount += 1;
        result.publicPageAmount += amount;
      } else if (row.purpose === PaymentPurpose.WALLET) {
        result.walletChargeCount += 1;
        result.walletChargeAmount += amount;
      }
    }

    result.platformNetRevenueAmount = this.roundAmount(
      result.bookingCommissionAmount +
        result.subscriptionAmount +
        result.publicPageAmount,
    );

    result.totalGatewayAmount = this.roundAmount(result.totalGatewayAmount);
    result.onlineBookingAmount = this.roundAmount(result.onlineBookingAmount);
    result.depositLinkAmount = this.roundAmount(result.depositLinkAmount);
    result.bookingBarberShareAmount = this.roundAmount(
      result.bookingBarberShareAmount,
    );
    result.bookingCommissionAmount = this.roundAmount(
      result.bookingCommissionAmount,
    );
    result.subscriptionAmount = this.roundAmount(result.subscriptionAmount);
    result.publicPageAmount = this.roundAmount(result.publicPageAmount);
    result.walletChargeAmount = this.roundAmount(result.walletChargeAmount);

    return result;
  }

  private extractBookingSplit(
    amount: number,
    meta: Record<string, unknown> | null,
    isDepositLink: boolean,
  ): { barberShare: number; commission: number } {
    const explicitDeposit = this.readNonNegative(meta?.depositAmount);
    const explicitCommission = this.readNonNegative(meta?.commissionAmount);

    if (explicitDeposit !== null || explicitCommission !== null) {
      const commission =
        explicitCommission ?? Math.max(0, amount - (explicitDeposit ?? amount));
      const barberShare = explicitDeposit ?? Math.max(0, amount - commission);
      return { barberShare, commission };
    }

    if (isDepositLink) {
      return { barberShare: amount, commission: 0 };
    }

    const totalPrice =
      this.readNonNegative(meta?.totalPrice) ??
      this.readNonNegative(meta?.price);
    if (totalPrice !== null) {
      const commission = Math.max(0, amount - totalPrice);
      const barberShare = Math.max(0, amount - commission);
      return { barberShare, commission };
    }

    return { barberShare: amount, commission: 0 };
  }

  private summarizeBookings(
    bookings: Pick<
      Booking,
      'status' | 'onlinePaidAt' | 'depositPaidAt' | 'sendDepositLink'
    >[],
    scheduledActiveInPeriodCount: number,
  ) {
    let onlinePaidCount = 0;
    let depositPaidCount = 0;
    let manualOrUnpaidCount = 0;
    let completedCount = 0;
    let confirmedCount = 0;
    let pendingCount = 0;
    let canceledOrRejectedCount = 0;

    for (const booking of bookings) {
      if (booking.onlinePaidAt) {
        onlinePaidCount += 1;
      } else if (booking.depositPaidAt) {
        depositPaidCount += 1;
      } else {
        manualOrUnpaidCount += 1;
      }

      if (booking.status === BookingStatus.COMPLETED) {
        completedCount += 1;
      } else if (booking.status === BookingStatus.CONFIRMED) {
        confirmedCount += 1;
      } else if (booking.status === BookingStatus.PENDING) {
        pendingCount += 1;
      } else if (
        booking.status === BookingStatus.CANCELED ||
        booking.status === BookingStatus.REJECTED
      ) {
        canceledOrRejectedCount += 1;
      }
    }

    return {
      createdTotal: bookings.length,
      onlinePaidCount,
      depositPaidCount,
      manualOrUnpaidCount,
      completedCount,
      confirmedCount,
      pendingCount,
      canceledOrRejectedCount,
      scheduledActiveInPeriodCount,
    };
  }

  private parseMetadata(raw: string | null): Record<string, unknown> | null {
    if (!raw) return null;
    try {
      const parsed: unknown = JSON.parse(raw);
      return parsed && typeof parsed === 'object'
        ? (parsed as Record<string, unknown>)
        : null;
    } catch {
      return null;
    }
  }

  private readNonNegative(value: unknown): number | null {
    if (value === null || value === undefined || value === '') return null;
    const num = Number(value);
    return Number.isFinite(num) && num >= 0 ? num : null;
  }

  private toInt(value: unknown): number {
    const num = Math.floor(Number(value ?? 0));
    return Number.isFinite(num) ? num : 0;
  }

  private toAmount(value: unknown): number {
    const num = Number(value ?? 0);
    return Number.isFinite(num) ? this.roundAmount(num) : 0;
  }

  private roundAmount(value: number): number {
    return Math.round(value * 100) / 100;
  }
}
