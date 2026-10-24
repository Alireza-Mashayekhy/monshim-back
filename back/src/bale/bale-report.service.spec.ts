import { BookingStatus } from 'src/booking/entities/booking.entity';
import { PaymentPurpose } from 'src/payment/entities/payment.entity';
import { TransactionType } from 'src/wallet/entities/transaction.entity';

import { BaleReportService } from './bale-report.service';

describe('BaleReportService', () => {
  function createMockQueryBuilder(result: {
    rawMany?: any[];
    many?: any[];
    count?: number;
    rawOne?: any;
  }) {
    const qb: any = {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      innerJoinAndSelect: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      setParameters: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue(result.rawMany ?? []),
      getMany: jest.fn().mockResolvedValue(result.many ?? []),
      getCount: jest.fn().mockResolvedValue(result.count ?? 0),
      getRawOne: jest.fn().mockResolvedValue(result.rawOne ?? null),
    };
    return qb;
  }

  it('آمار پرداخت‌ها، کمیسیون سایت، رزروها و برداشت‌ها را به درستی تجمیع می‌کند', async () => {
    const paymentQb = createMockQueryBuilder({
      rawMany: [
        {
          amount: '110000',
          purpose: PaymentPurpose.BOOKING,
          metadata: JSON.stringify({
            depositAmount: 100000,
            commissionAmount: 10000,
            totalPrice: 300000,
          }),
        },
        {
          amount: '55000',
          purpose: PaymentPurpose.BOOKING,
          metadata: JSON.stringify({
            depositLink: true,
            depositAmount: 50000,
            commissionAmount: 5000,
          }),
        },
        {
          // پرداختی که به دلیل تداخل ساعت فوراً refundQueued شده نباید جزء فروش حساب شود
          amount: '88000',
          purpose: PaymentPurpose.BOOKING,
          metadata: JSON.stringify({
            refundQueued: true,
          }),
        },
        {
          amount: '250000',
          purpose: PaymentPurpose.SUBSCRIPTION,
          metadata: null,
        },
        {
          amount: '490000',
          purpose: PaymentPurpose.PUBLIC_PAGE,
          metadata: null,
        },
        {
          amount: '100000',
          purpose: PaymentPurpose.WALLET,
          metadata: null,
        },
      ],
    });

    const bookingCreatedQb = createMockQueryBuilder({
      many: [
        {
          id: 'b1',
          status: BookingStatus.COMPLETED,
          onlinePaidAt: new Date(),
          depositPaidAt: null,
          sendDepositLink: false,
        },
        {
          id: 'b2',
          status: BookingStatus.CONFIRMED,
          onlinePaidAt: null,
          depositPaidAt: new Date(),
          sendDepositLink: true,
        },
        {
          id: 'b3',
          status: BookingStatus.PENDING,
          onlinePaidAt: null,
          depositPaidAt: null,
          sendDepositLink: false,
        },
        {
          id: 'b4',
          status: BookingStatus.CANCELED,
          onlinePaidAt: null,
          depositPaidAt: null,
          sendDepositLink: false,
        },
      ],
    });
    const bookingScheduledQb = createMockQueryBuilder({ count: 7 });

    let bookingCall = 0;
    const bookingRepo: any = {
      createQueryBuilder: jest.fn(() => {
        bookingCall += 1;
        return bookingCall === 1 ? bookingCreatedQb : bookingScheduledQb;
      }),
    };

    const periodWithdrawalsQb = createMockQueryBuilder({
      rawOne: {
        requestedCount: '3',
        requestedAmount: '900000',
        completedCount: '2',
        completedAmount: '600000',
        pendingInPeriodCount: '1',
        pendingInPeriodAmount: '300000',
        rejectedCount: '0',
        rejectedAmount: '0',
      },
    });
    const livePendingWithdrawalsQb = createMockQueryBuilder({
      rawOne: { count: '2', amount: '750000' },
    });
    const livePendingRefundsQb = createMockQueryBuilder({
      rawOne: { count: '1', amount: '110000' },
    });

    let txCall = 0;
    const transactionRepo: any = {
      createQueryBuilder: jest.fn(() => {
        txCall += 1;
        if (txCall === 1) return periodWithdrawalsQb;
        if (txCall === 2) return livePendingWithdrawalsQb;
        return livePendingRefundsQb;
      }),
    };

    const service = new BaleReportService(
      { createQueryBuilder: jest.fn(() => paymentQb) } as any,
      bookingRepo,
      transactionRepo,
      {} as any,
      {
        createQueryBuilder: jest.fn(() =>
          createMockQueryBuilder({ count: 12 }),
        ),
      } as any,
      {
        createQueryBuilder: jest.fn(() => createMockQueryBuilder({ count: 3 })),
      } as any,
    );

    const fixedNow = new Date('2026-10-23T12:00:00.000Z');
    const data = await service.collectReportData('monthly', fixedNow);

    expect(data.payments.totalPaidCount).toBe(5);
    expect(data.payments.totalGatewayAmount).toBe(1_005_000);
    expect(data.payments.onlineBookingOrdersCount).toBe(1);
    expect(data.payments.depositLinkOrdersCount).toBe(1);
    expect(data.payments.bookingBarberShareAmount).toBe(150_000);
    expect(data.payments.bookingCommissionAmount).toBe(15_000);
    expect(data.payments.subscriptionAmount).toBe(250_000);
    expect(data.payments.publicPageAmount).toBe(490_000);
    expect(data.payments.walletChargeAmount).toBe(100_000);
    // خالص سایت = ۱۵,۰۰۰ کمیسیون + ۲۵۰,۰۰۰ اشتراک + ۴۹۰,۰۰۰ صفحه اختصاصی = ۷۵۵,۰۰۰
    expect(data.payments.platformNetRevenueAmount).toBe(755_000);

    expect(data.bookings.createdTotal).toBe(4);
    expect(data.bookings.onlinePaidCount).toBe(1);
    expect(data.bookings.depositPaidCount).toBe(1);
    expect(data.bookings.manualOrUnpaidCount).toBe(2);
    expect(data.bookings.scheduledActiveInPeriodCount).toBe(7);

    expect(data.withdrawals.requestedCount).toBe(3);
    expect(data.withdrawals.livePendingQueueCount).toBe(2);
    expect(data.withdrawals.livePendingQueueAmount).toBe(750_000);

    const text = service.formatReportMessage(data);
    expect(text).toContain('گزارش ماهانه');
    expect(text).toContain('۷۵۵,۰۰۰ تومان');
    expect(text).toContain('۷۵۰,۰۰۰ تومان');
  });

  it('پرداخت‌های برگشت‌خورده (دارای رکورد REFUND) را از اعداد گزارش حذف می‌کند', async () => {
    const paymentQb = createMockQueryBuilder({ rawMany: [] });
    const genericQb = createMockQueryBuilder({ rawOne: {}, count: 0 });

    const service = new BaleReportService(
      { createQueryBuilder: jest.fn(() => paymentQb) } as any,
      { createQueryBuilder: jest.fn(() => genericQb) } as any,
      { createQueryBuilder: jest.fn(() => genericQb) } as any,
      {} as any,
      { createQueryBuilder: jest.fn(() => genericQb) } as any,
      { createQueryBuilder: jest.fn(() => genericQb) } as any,
    );

    await service.collectReportData(
      'daily',
      new Date('2026-10-23T12:00:00.000Z'),
    );

    // همان قاعدهٔ «خلاصه مالی» پنل ادمین: هم پرچم متادیتا و هم رکورد REFUND
    const refundFilterCall = paymentQb.andWhere.mock.calls.find(
      ([sql]: [string]) => typeof sql === 'string' && sql.includes('refund_tx'),
    );
    expect(refundFilterCall).toBeTruthy();
    expect(refundFilterCall[0]).toContain('payment.id NOT IN (');
    expect(refundFilterCall[0]).toContain('SELECT refund_tx.referenceId');
    expect(refundFilterCall[1]).toEqual(
      expect.objectContaining({
        refundTxType: TransactionType.REFUND,
        refundedMetadataPattern: '%"refundQueued":true%',
      }),
    );
  });
});
