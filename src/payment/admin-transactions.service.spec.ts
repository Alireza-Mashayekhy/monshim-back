import {
  TransactionStatus,
  TransactionType,
} from 'src/wallet/entities/transaction.entity';
import { BARBER_CANCELLATION_DEBIT_PREFIX } from 'src/wallet/refund.constants';

import { AdminTransactionsService } from './admin-transactions.service';
import { PaymentPurpose, PaymentStatus } from './entities/payment.entity';

describe('AdminTransactionsService', () => {
  function createMockQueryBuilder(params: {
    payments?: any[];
    transactions?: any[];
    paymentSummaries?: any[];
    walletSummaries?: any[];
    count?: number;
  }) {
    const qb: any = {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      clone: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockImplementation(() => {
        if (params.payments !== undefined) {
          return Promise.resolve([
            params.payments,
            params.count ?? params.payments.length,
          ]);
        }
        if (params.transactions !== undefined) {
          return Promise.resolve([
            params.transactions,
            params.count ?? params.transactions.length,
          ]);
        }
        return Promise.resolve([[], 0]);
      }),
      getMany: jest.fn().mockImplementation(() => {
        if (params.payments !== undefined)
          return Promise.resolve(params.payments);
        if (params.transactions !== undefined)
          return Promise.resolve(params.transactions);
        return Promise.resolve([]);
      }),
      getRawMany: jest.fn().mockImplementation(() => {
        if (params.paymentSummaries !== undefined)
          return Promise.resolve(params.paymentSummaries);
        if (params.walletSummaries !== undefined)
          return Promise.resolve(params.walletSummaries);
        return Promise.resolve([]);
      }),
    };
    return qb;
  }

  function createService(params: {
    payments?: any[];
    transactions?: any[];
    paymentSummaries?: any[];
    walletSummaries?: any[];
    count?: number;
  }) {
    const paymentQb = createMockQueryBuilder({
      payments: params.payments ?? [],
      paymentSummaries: params.paymentSummaries,
      count: params.count,
    });
    const walletQb = createMockQueryBuilder({
      transactions: params.transactions ?? [],
      walletSummaries: params.walletSummaries,
      count: params.count,
    });

    const paymentRepo: any = {
      createQueryBuilder: jest.fn().mockReturnValue(paymentQb),
    };
    const transactionRepo: any = {
      createQueryBuilder: jest.fn().mockReturnValue(walletQb),
    };
    const service = new AdminTransactionsService(
      paymentRepo,
      transactionRepo,
      {} as any,
    );

    return { service, paymentQb, walletQb };
  }

  it('فقط پرداخت‌های موفق و برگشت‌نخورده را در کارت‌ها جمع می‌زند', async () => {
    const paymentSummaries = [
      // ۱. رزرو آنلاین: ۱۱۰ هزار تومان، ۱۰ هزار کمیسیون، ۱۰۰ هزار سهم آرایشگر
      {
        amount: '110000',
        purpose: PaymentPurpose.BOOKING,
        status: PaymentStatus.PAID,
        metadata: JSON.stringify({
          depositAmount: 100000,
          commissionAmount: 10000,
        }),
      },
      // ۲. رزرو با لینک بیعانه: ۵۵ هزار تومان، ۵ هزار کمیسیون، ۵۰ هزار سهم آرایشگر
      {
        amount: '55000',
        purpose: PaymentPurpose.BOOKING,
        status: PaymentStatus.PAID,
        metadata: JSON.stringify({
          depositLink: true,
          depositAmount: 50000,
          commissionAmount: 5000,
        }),
      },
      // ۳. خرید اشتراک
      {
        amount: '250000',
        purpose: PaymentPurpose.SUBSCRIPTION,
        status: PaymentStatus.PAID,
        metadata: null,
      },
      // ۴. خرید صفحه اختصاصی
      {
        amount: '490000',
        purpose: PaymentPurpose.PUBLIC_PAGE,
        status: PaymentStatus.PAID,
        metadata: null,
      },
      // ۵. شارژ کیف پول (درآمد سامانه نیست)
      {
        amount: '100000',
        purpose: PaymentPurpose.WALLET,
        status: PaymentStatus.PAID,
        metadata: null,
      },
    ];

    const walletSummaries = [
      // درآمد واقعی آرایشگر از رزرو اول و دوم
      {
        amount: '100000',
        type: TransactionType.DEPOSIT,
        status: TransactionStatus.COMPLETED,
        description: 'درآمد رزرو نوبت BOOK-1 - منشیم',
        referenceId: 'paid-booking-1',
      },
      {
        amount: '50000',
        type: TransactionType.DEPOSIT,
        status: TransactionStatus.COMPLETED,
        description: 'درآمد رزرو نوبت BOOK-2 - منشیم',
        referenceId: 'paid-booking-2',
      },
      // واریز رزرو دستی/پرداخت‌نشده: شناسهٔ پرداخت ندارد و نباید شمرده شود
      {
        amount: '90000',
        type: TransactionType.DEPOSIT,
        status: TransactionStatus.COMPLETED,
        description: 'درآمد رزرو نوبت دستی - منشیم',
        referenceId: null,
      },
      // کسر بابت لغو رزرو: هرگز نباید در هیچ کارتی بیاید
      {
        amount: '150000',
        type: TransactionType.WITHDRAWAL,
        status: TransactionStatus.COMPLETED,
        description: `${BARBER_CANCELLATION_DEBIT_PREFIX} booking-3`,
        referenceId: 'refunded-payment',
      },
      // بازپرداخت مشتری در انتظار واریز دستی (تعهد، نه درآمد)
      {
        amount: '165000',
        type: TransactionType.REFUND,
        status: TransactionStatus.PENDING,
        description: 'بازپرداخت مشتری - در انتظار واریز دستی | رزرو booking-3',
        referenceId: 'refunded-payment',
      },
      // برداشت در انتظار و برداشت انجام‌شده
      {
        amount: '200000',
        type: TransactionType.WITHDRAWAL,
        status: TransactionStatus.PENDING,
        description: 'برداشت به کارت بانک ملت',
        referenceId: null,
      },
      {
        amount: '300000',
        type: TransactionType.WITHDRAWAL,
        status: TransactionStatus.COMPLETED,
        description: 'برداشت به کارت بانک ملت',
        referenceId: null,
      },
    ];

    const { service } = createService({
      paymentSummaries,
      walletSummaries,
      count: 0,
    });

    const result = await service.list({ page: 1, limit: 25 });
    const summary = result.data.summary;

    // دریافتی واقعی درگاه = ۱۱۰ + ۵۵ + ۲۵۰ + ۴۹۰ + ۱۰۰ هزار
    expect(summary.gatewayReceivedAmount).toBe(1_005_000);
    expect(summary.successfulGatewayPaymentCount).toBe(5);

    // کمیسیون = ۱۰,۰۰۰ + ۵,۰۰۰
    expect(summary.bookingCommissionAmount).toBe(15_000);
    expect(summary.bookingPaymentsAmount).toBe(165_000);
    expect(summary.subscriptionRevenueAmount).toBe(250_000);
    expect(summary.publicPageRevenueAmount).toBe(490_000);
    expect(summary.publicPageCount).toBe(1);
    expect(summary.walletTopUpAmount).toBe(100_000);

    // درآمد خالص = ۱۵,۰۰۰ + ۲۵۰,۰۰۰ + ۴۹۰,۰۰۰
    expect(summary.netRevenueAmount).toBe(755_000);

    // فقط ۱۰۰ + ۵۰ هزار درآمد معتبر آرایشگر است (رزرو دستی کنار گذاشته شد)
    expect(summary.barberWalletCreditsAmount).toBe(150_000);

    expect(summary.pendingWithdrawalsAmount).toBe(200_000);
    expect(summary.pendingWithdrawalCount).toBe(1);
    expect(summary.completedWithdrawalsAmount).toBe(300_000);

    // تعهد بازپرداخت مشتری جدا شمرده می‌شود و روی هیچ کارتی اثر ندارد
    expect(summary.pendingCustomerRefundsAmount).toBe(165_000);
    expect(summary.pendingCustomerRefundCount).toBe(1);
  });

  it('پرداخت دارای پرچم refundQueued را حتی در دادهٔ ناسازگار درآمد حساب نمی‌کند', async () => {
    const paymentSummaries = [
      {
        amount: '80000',
        purpose: PaymentPurpose.BOOKING,
        status: PaymentStatus.PAID,
        metadata: JSON.stringify({
          refundQueued: true,
          commissionAmount: 8000,
        }),
      },
      {
        amount: '30000',
        purpose: PaymentPurpose.BOOKING,
        status: PaymentStatus.PAID,
        metadata: JSON.stringify({
          depositAmount: 27000,
          commissionAmount: 3000,
        }),
      },
    ];

    const { service } = createService({
      paymentSummaries,
      walletSummaries: [],
      count: 0,
    });

    const summary = (await service.list({ page: 1, limit: 25 })).data.summary;

    expect(summary.gatewayReceivedAmount).toBe(30_000);
    expect(summary.successfulGatewayPaymentCount).toBe(1);
    expect(summary.bookingCommissionAmount).toBe(3_000);
    expect(summary.netRevenueAmount).toBe(3_000);
  });

  it('پرداخت‌های ناموفق یا نیمه‌کارهٔ درگاه را حساب نمی‌کند', async () => {
    const paymentSummaries = [
      {
        amount: '90000',
        purpose: PaymentPurpose.BOOKING,
        status: PaymentStatus.PENDING,
        metadata: null,
      },
      {
        amount: '70000',
        purpose: PaymentPurpose.BOOKING,
        status: PaymentStatus.FAILED,
        metadata: null,
      },
      {
        amount: '60000',
        purpose: PaymentPurpose.SUBSCRIPTION,
        status: PaymentStatus.CANCELED,
        metadata: null,
      },
    ];

    const { service } = createService({
      paymentSummaries,
      walletSummaries: [],
      count: 0,
    });

    const summary = (await service.list({ page: 1, limit: 25 })).data.summary;

    expect(summary.gatewayReceivedAmount).toBe(0);
    expect(summary.successfulGatewayPaymentCount).toBe(0);
    expect(summary.bookingPaymentsAmount).toBe(0);
    expect(summary.netRevenueAmount).toBe(0);
  });

  it('کوئری درگاه فقط PAID و برگشت‌نخورده را می‌خواند', async () => {
    const { service, paymentQb } = createService({ count: 0 });

    await service.list({ page: 1, limit: 25 });

    expect(paymentQb.andWhere).toHaveBeenCalledWith(
      'payment.status = :paidStatus',
      { paidStatus: PaymentStatus.PAID },
    );

    const refundFilterCall = paymentQb.andWhere.mock.calls.find(
      ([sql]: [string]) => typeof sql === 'string' && sql.includes('refund_tx'),
    );
    expect(refundFilterCall).toBeTruthy();
    expect(refundFilterCall[0]).toContain('payment.metadata');
    expect(refundFilterCall[0]).toContain('payment.id NOT IN (');
    expect(refundFilterCall[0]).toContain(
      'SELECT refund_tx.referenceId FROM transactions refund_tx',
    );
    expect(refundFilterCall[1]).toEqual(
      expect.objectContaining({
        refundTxType: TransactionType.REFUND,
        refundedMetadataPattern: '%"refundQueued":true%',
      }),
    );
  });

  it('کوئری کیف پول کسر لغو رزرو و درآمدهای بی‌پشتوانه را حذف می‌کند', async () => {
    const { service, walletQb } = createService({ count: 0 });

    await service.list({ page: 1, limit: 25 });

    expect(walletQb.andWhere).toHaveBeenCalledWith(
      'transaction.status != :failedStatus',
      { failedStatus: TransactionStatus.FAILED },
    );

    // کسر کیف پول آرایشگر بابت لغو رزرو هرگز نمایش داده نمی‌شود
    const cancellationFilter = walletQb.andWhere.mock.calls.find(
      ([sql]: [string]) =>
        typeof sql === 'string' && sql.includes('cancellationDebitPrefix'),
    );
    expect(cancellationFilter).toBeTruthy();
    expect(cancellationFilter[1]).toEqual({
      cancellationDebitPrefix: `${BARBER_CANCELLATION_DEBIT_PREFIX}%`,
    });

    // واریز درآمد رزرو باید به پرداخت موفق و برگشت‌نخورده وصل باشد
    const creditFilter = walletQb.andWhere.mock.calls.find(
      ([sql]: [string]) =>
        typeof sql === 'string' && sql.includes('bookingCreditPattern'),
    );
    expect(creditFilter).toBeTruthy();
    expect(creditFilter[0]).toContain('bookingPayment.id IS NOT NULL');
    expect(creditFilter[0]).toContain('bookingPayment.id NOT IN (');
    expect(creditFilter[1]).toEqual(
      expect.objectContaining({
        bookingCreditPattern: 'درآمد رزرو نوبت%',
        refundTxType: TransactionType.REFUND,
      }),
    );

    expect(walletQb.leftJoin).toHaveBeenCalledWith(
      expect.anything(),
      'bookingPayment',
      expect.stringContaining('bookingPayment.status = :bookingPaymentStatus'),
      {
        bookingPaymentPurpose: PaymentPurpose.BOOKING,
        bookingPaymentStatus: PaymentStatus.PAID,
      },
    );
  });

  it('خروجی اکسل هم همان قاعدهٔ کارت‌ها را دارد', async () => {
    const { service } = createService({
      paymentSummaries: [
        {
          amount: '120000',
          purpose: PaymentPurpose.BOOKING,
          status: PaymentStatus.PAID,
          metadata: JSON.stringify({
            depositAmount: 110000,
            commissionAmount: 10000,
          }),
        },
      ],
      walletSummaries: [
        {
          amount: '110000',
          type: TransactionType.DEPOSIT,
          status: TransactionStatus.COMPLETED,
          description: 'درآمد رزرو نوبت BOOK-9 - منشیم',
          referenceId: 'paid-booking-9',
        },
        {
          amount: '110000',
          type: TransactionType.WITHDRAWAL,
          status: TransactionStatus.COMPLETED,
          description: `${BARBER_CANCELLATION_DEBIT_PREFIX} booking-9`,
          referenceId: 'paid-booking-9',
        },
      ],
      count: 0,
    });

    const result = await service.exportData({ page: 1, limit: 25 });

    expect(result.data.summary.gatewayReceivedAmount).toBe(120_000);
    expect(result.data.summary.netRevenueAmount).toBe(10_000);
    expect(result.data.summary.barberWalletCreditsAmount).toBe(110_000);
  });
});
