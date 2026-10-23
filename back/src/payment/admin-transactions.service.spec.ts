import {
  TransactionStatus,
  TransactionType,
} from 'src/wallet/entities/transaction.entity';

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

  it('درآمد خالص سامانه را دقیقاً برابر مجموع کمیسیون + فروش اشتراک + فروش صفحه اختصاصی محاسبه می‌کند', async () => {
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
      // ۳. خرید اشتراک: ۲۵۰ هزار تومان (۱۰۰٪ سهم سامانه)
      {
        amount: '250000',
        purpose: PaymentPurpose.SUBSCRIPTION,
        status: PaymentStatus.PAID,
        metadata: null,
      },
      // ۴. خرید پکیج صفحه اختصاصی: ۴۹۰ هزار تومان (۱۰۰٪ سهم سامانه)
      {
        amount: '490000',
        purpose: PaymentPurpose.PUBLIC_PAGE,
        status: PaymentStatus.PAID,
        metadata: null,
      },
      // ۵. شارژ کیف پول از درگاه: ۱۰۰ هزار تومان (درآمد سامانه نیست)
      {
        amount: '100000',
        purpose: PaymentPurpose.WALLET,
        status: PaymentStatus.PAID,
        metadata: null,
      },
      // ۶. رزرو دارای تداخل که بلافاصله در صف بازپرداخت رفته (نباید درآمد حساب شود)
      {
        amount: '80000',
        purpose: PaymentPurpose.BOOKING,
        status: PaymentStatus.PAID,
        metadata: JSON.stringify({
          refundQueued: true,
          commissionAmount: 8000,
        }),
      },
    ];

    const walletSummaries = [
      // درآمد واریزشده به کیف‌پول آرایشگر از رزرو اول
      {
        amount: '100000',
        type: TransactionType.DEPOSIT,
        status: TransactionStatus.COMPLETED,
        description: 'درآمد رزرو نوبت #1',
        referenceId: 'paid-booking-1',
        bookingPaymentId: 'paid-booking-1',
      },
      // درآمد واریزشده به کیف‌پول آرایشگر از رزرو دوم
      {
        amount: '50000',
        type: TransactionType.DEPOSIT,
        status: TransactionStatus.COMPLETED,
        description: 'درآمد رزرو نوبت #2',
        referenceId: 'paid-booking-2',
        bookingPaymentId: 'paid-booking-2',
      },
      // ثبت کیف پول ناشی از نوبت دستیِ پرداخت‌نشده نباید در محاسبات بیاید.
      {
        amount: '90000',
        type: TransactionType.DEPOSIT,
        status: TransactionStatus.COMPLETED,
        description: 'درآمد رزرو نوبت دستی',
        referenceId: 'manual-booking-without-payment',
        bookingPaymentId: null,
      },
    ];

    const paymentQb = createMockQueryBuilder({
      payments: [],
      paymentSummaries,
      count: 0,
    });
    const walletQb = createMockQueryBuilder({
      transactions: [],
      walletSummaries,
      count: 0,
    });

    const paymentRepo: any = {
      createQueryBuilder: jest.fn().mockReturnValue(paymentQb),
    };
    const transactionRepo: any = {
      createQueryBuilder: jest.fn().mockReturnValue(walletQb),
    };
    const walletService: any = {};

    const service = new AdminTransactionsService(
      paymentRepo,
      transactionRepo,
      walletService,
    );

    const result = await service.list({ page: 1, limit: 25 });
    const summary = result.data.summary;

    // کمیسیون = ۱۰,۰۰۰ + ۵,۰۰۰ = ۱۵,۰۰۰
    expect(summary.bookingCommissionAmount).toBe(15_000);
    // فروش اشتراک = ۲۵۰,۰۰۰
    expect(summary.subscriptionRevenueAmount).toBe(250_000);
    // فروش صفحه اختصاصی = ۴۹۰,۰۰۰
    expect(summary.publicPageRevenueAmount).toBe(490_000);
    expect(summary.publicPageCount).toBe(1);

    // درآمد خالص سامانه = ۱۵,۰۰۰ کمیسیون + ۲۵۰,۰۰۰ اشتراک + ۴۹۰,۰۰۰ صفحه اختصاصی = ۷۵۵,۰۰۰
    expect(summary.netRevenueAmount).toBe(755_000);

    // شارژ کیف پول = ۱۰۰,۰۰۰ (جدا از درآمد خالص سامانه)
    expect(summary.walletTopUpAmount).toBe(100_000);

    // واریزی به کیف پول آرایشگران = ۱۵۰,۰۰۰
    expect(summary.barberWalletCreditsAmount).toBe(150_000);

    // کل ورودی درگاه
    expect(summary.gatewayReceivedAmount).toBe(1_085_000);
  });

  it('فقط پرداخت‌های موفق درگاه (PAID) را کوئری می‌کند و پرداخت‌های ناتمام و ناموفق را حذف می‌کند', async () => {
    const paymentQb = createMockQueryBuilder({ payments: [], count: 0 });
    const walletQb = createMockQueryBuilder({ transactions: [], count: 0 });

    const paymentRepo: any = {
      createQueryBuilder: jest.fn().mockReturnValue(paymentQb),
    };
    const transactionRepo: any = {
      createQueryBuilder: jest.fn().mockReturnValue(walletQb),
    };
    const walletService: any = {};

    const service = new AdminTransactionsService(
      paymentRepo,
      transactionRepo,
      walletService,
    );

    await service.list({ page: 1, limit: 25 });

    // اطمینان از اعمال شرط پرداخت موفق
    expect(paymentQb.andWhere).toHaveBeenCalledWith(
      'payment.status = :paidStatus',
      { paidStatus: PaymentStatus.PAID },
    );

    // اطمینان از حذف تراکنش‌های FAILED کیف پول
    expect(walletQb.andWhere).toHaveBeenCalledWith(
      'transaction.status != :failedStatus',
      { failedStatus: TransactionStatus.FAILED },
    );

    // درآمد رزرو فقط وقتی در دفتر کیف پول نمایش داده می‌شود که به پرداخت
    // موفق درگاه متصل باشد؛ وضعیت CONFIRMED رزرو برای اثبات پرداخت کافی نیست.
    expect(walletQb.leftJoin).toHaveBeenCalledWith(
      expect.anything(),
      'bookingPayment',
      expect.stringContaining('bookingPayment.status = :bookingPaymentStatus'),
      {
        bookingPaymentPurpose: PaymentPurpose.BOOKING,
        bookingPaymentStatus: PaymentStatus.PAID,
      },
    );
    expect(walletQb.andWhere).toHaveBeenCalledWith(
      expect.stringContaining('bookingPayment.id IS NOT NULL'),
      expect.objectContaining({
        bookingCreditType: TransactionType.DEPOSIT,
        bookingCreditDescription: 'درآمد رزرو نوبت%',
      }),
    );
  });
});
