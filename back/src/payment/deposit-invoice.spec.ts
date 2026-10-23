import { NotFoundException } from '@nestjs/common';

jest.mock('@nestjs/schedule', () => ({
  Cron: () => () => undefined,
  CronExpression: { EVERY_10_MINUTES: '0 */10 * * * *' },
}));

import { Booking, BookingStatus } from 'src/booking/entities/booking.entity';
import { SiteSettings } from 'src/settings/entities/setting.entity';

import { Payment } from './entities/payment.entity';
import { PaymentService } from './payment.service';

describe('PaymentService deposit invoice & gateway payment flow', () => {
  const BASE_TOKEN = 'ABCDEFGH12345678abcdefgh';

  function makeBookingsFixture(): Booking[] {
    const requestedAt = new Date(Date.now() - 30 * 60 * 1000);
    const barber: any = {
      id: '12',
      userId: 100,
      salonName: 'پیرایش VIP آریا',
      address: 'تهران، سعادت‌آباد، خیابان سرو',
      profileImage: '/uploads/barber.jpg',
      city: { id: '1', name: 'تهران' },
      user: {
        id: 100,
        fullName: 'آریا رضایی',
        phone: '09121112233',
      },
    };
    const customer: any = {
      id: 200,
      fullName: 'سارا محمدی',
      phone: '09123456789',
    };

    const row1 = {
      id: '501',
      customerId: 200,
      customer,
      barberId: '12',
      barber,
      serviceId: '1',
      service: {
        id: '1',
        name: 'رنگ و مش تخصصی',
        price: 1_200_000,
        depositPrice: 400_000, // deposit = 400,000
        durationMinutes: 60,
      },
      date: '2099-05-10',
      time: '14:00',
      status: BookingStatus.CONFIRMED,
      price: 1_200_000,
      customerNote: 'لطفاً تناژ دودی باشد',
      depositToken: BASE_TOKEN,
      sendDepositLink: true,
      depositRequestedAt: requestedAt,
      depositPaidAt: null,
      canceledBy: null,
      createdAt: requestedAt,
    } as unknown as Booking;

    const row2 = {
      id: '502',
      customerId: 200,
      customer,
      barberId: '12',
      barber,
      serviceId: '2',
      service: {
        id: '2',
        name: 'اصلاح و براشینگ',
        price: 300_000,
        depositPrice: null, // no deposit -> full price 300,000
        durationMinutes: 30,
      },
      date: '2099-05-10',
      time: '15:00',
      status: BookingStatus.CONFIRMED,
      price: 300_000,
      customerNote: null,
      depositToken: `${BASE_TOKEN}:1`,
      sendDepositLink: true,
      depositRequestedAt: requestedAt,
      depositPaidAt: null,
      canceledBy: null,
      createdAt: requestedAt,
    } as unknown as Booking;

    return [row1, row2];
  }

  function buildService(bookings: Booking[]) {
    const savedPayments: Payment[] = [];
    let nextId = 900;

    const bookingQb: any = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      setLock: jest.fn().mockReturnThis(),
      getMany: jest.fn(async () => bookings),
    };

    const bookingRepo: any = {
      createQueryBuilder: jest.fn(() => bookingQb),
      findOne: jest.fn(({ where }: any) =>
        Promise.resolve(bookings.find(item => item.id === where.id)),
      ),
      save: jest.fn(async (rows: Booking[]) => rows),
    };

    const paymentQb: any = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getOne: jest.fn(
        async () => savedPayments[savedPayments.length - 1] ?? null,
      ),
    };

    const paymentRepo: any = {
      create: jest.fn((data: Partial<Payment>) => ({ ...data })),
      save: jest.fn(async (entity: Payment) => {
        if (!entity.id) entity.id = String(++nextId);
        const idx = savedPayments.findIndex(p => p.id === entity.id);
        if (idx >= 0) savedPayments[idx] = entity;
        else savedPayments.push(entity);
        return entity;
      }),
      update: jest.fn(async (criteria: any, patch: Partial<Payment>) => {
        const id = typeof criteria === 'object' ? criteria.id : criteria;
        const found = savedPayments.find(p => p.id === String(id));
        if (found) {
          Object.assign(found, patch);
          return { affected: 1 };
        }
        return { affected: 0 };
      }),
      findOne: jest.fn(async ({ where }: any) => {
        if (where?.trackId !== undefined) {
          return savedPayments.find(p => p.trackId === where.trackId) ?? null;
        }
        if (where?.id !== undefined) {
          return savedPayments.find(p => p.id === where.id) ?? null;
        }
        return null;
      }),
      createQueryBuilder: jest.fn(() => paymentQb),
    };

    const settingsRepo: any = {
      findOne: jest.fn(async () => ({ commissionPercent: 10 }) as SiteSettings),
    };

    const walletService: any = {
      depositOnceWithManager: jest.fn(async () => ({})),
      debitBarberAndQueueRefund: jest.fn(async () => ({})),
    };

    const dataSource: any = {
      transaction: jest.fn(async (cb: any) =>
        cb({
          getRepository: (entity: unknown) => {
            if (entity === Booking) return bookingRepo;
            if (entity === Payment) return paymentRepo;
            return {};
          },
        }),
      ),
    };

    const configService: any = {
      get: jest.fn((key: string) => {
        if (key === 'FRONT_URL') return 'https://monshim.ir';
        if (key === 'APP_URL') return 'https://monshim.ir';
        return undefined;
      }),
    };

    const bookingSmsService: any = {
      sendDepositPaidToBarber: jest.fn().mockResolvedValue(undefined),
    };

    const service = new PaymentService(
      paymentRepo,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      bookingRepo,
      {} as any,
      settingsRepo,
      {} as any,
      bookingSmsService,
      {} as any,
      walletService,
      configService,
      dataSource,
    );

    return {
      service,
      savedPayments,
      walletService,
      bookingQb,
      bookingSmsService,
    };
  }

  it('builds unified multi-service invoice with exact deposit + 10% max-deposit commission math', async () => {
    const bookings = makeBookingsFixture();
    const { service } = buildService(bookings);

    // Works even when called with a sibling suffixed token!
    const invoice = await service.getDepositInvoiceByToken(`${BASE_TOKEN}:1`);

    expect(invoice.token).toBe(BASE_TOKEN);
    expect(invoice.status).toBe('payable');
    expect(invoice.salon.name).toBe('پیرایش VIP آریا');
    expect(invoice.customer.maskedPhone).toBe('0912***6789');
    expect(invoice.items).toHaveLength(2);

    // Item 1: price 1,200,000, deposit 400,000
    expect(invoice.items[0]).toMatchObject({
      name: 'رنگ و مش تخصصی',
      price: 1_200_000,
      payableAmount: 400_000,
      hasDeposit: true,
    });
    // Item 2: price 300,000, no deposit -> full price 300,000
    expect(invoice.items[1]).toMatchObject({
      name: 'اصلاح و براشینگ',
      price: 300_000,
      payableAmount: 300_000,
      hasDeposit: false,
    });

    // Total services = 1,500,000
    // Deposit sum = 400,000 + 300,000 = 700,000
    // Max item payable = 400,000 -> 10% commission = 40,000
    // Amount to pay in gateway = 740,000
    // Remaining in salon = 1,500,000 - 700,000 = 800,000
    expect(invoice.pricing).toEqual({
      totalServicePrice: 1_500_000,
      depositAmount: 700_000,
      maxPayableAmount: 400_000,
      commissionPercent: 10,
      commissionAmount: 40_000,
      remainingInSalon: 800_000,
      amountToPay: 740_000,
    });
    expect(invoice.appointment.startTime).toBe('14:00');
    expect(invoice.appointment.endTime).toBe('15:30');
    expect(invoice.appointment.totalDurationMinutes).toBe(90);
  });

  it('initiates gateway payment on button click, verifies Zibal callback, credits barber only depositAmount, and redirects to /deposit/:token receipt', async () => {
    const bookings = makeBookingsFixture();
    const { service, walletService, bookingSmsService } =
      buildService(bookings);

    const initiated = await service.initiateDepositPaymentByToken(BASE_TOKEN);

    expect(initiated.amount).toBe(740_000);
    expect(initiated.depositAmount).toBe(700_000);
    expect(initiated.commissionAmount).toBe(40_000);
    expect(initiated.paymentUrl).toContain(String(initiated.trackId));

    const callbackUrl = await service.handleCallback({
      trackId: String(initiated.trackId),
      success: '1',
      status: '2',
      orderId: initiated.orderId,
    });

    // Redirects guest customer straight back to standalone digital receipt page!
    expect(callbackUrl).toContain(
      `https://monshim.ir/deposit/${BASE_TOKEN}?payment=success&trackId=${initiated.trackId}`,
    );

    // Both sibling bookings are marked depositPaidAt
    expect(bookings[0].depositPaidAt).toBeInstanceOf(Date);
    expect(bookings[1].depositPaidAt).toBeInstanceOf(Date);

    // اطلاع پرداخت موفق فقط یک‌بار و با مشخصات نوبت به آرایشگر پیامک می‌شود.
    await new Promise<void>(resolve => setImmediate(resolve));
    expect(bookingSmsService.sendDepositPaidToBarber).toHaveBeenCalledTimes(1);
    expect(bookingSmsService.sendDepositPaidToBarber).toHaveBeenCalledWith(
      '09121112233',
      {
        customerName: 'سارا محمدی',
        date: '2099-05-10',
        time: '14:00',
      },
    );

    await service.handleCallback({
      trackId: String(initiated.trackId),
      success: '1',
      status: '2',
      orderId: initiated.orderId,
    });
    await new Promise<void>(resolve => setImmediate(resolve));
    expect(bookingSmsService.sendDepositPaidToBarber).toHaveBeenCalledTimes(1);

    // Barber wallet receives ONLY 700,000 Toman (40,000 Toman commission stays with platform)
    expect(walletService.depositOnceWithManager).toHaveBeenCalledTimes(1);
    expect(walletService.depositOnceWithManager).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        userId: 100,
        amount: 700_000,
      }),
    );

    // Re-fetching invoice now returns paid digital receipt state
    const paidInvoice = await service.getDepositInvoiceByToken(BASE_TOKEN);
    expect(paidInvoice.status).toBe('paid');
    expect(paidInvoice.receipt).toMatchObject({
      amount: 740_000,
      trackId: initiated.trackId,
    });
  });

  it('queues full customer refund (deposit + commission) if salon canceled while customer was in gateway', async () => {
    const bookings = makeBookingsFixture();
    const { service, walletService, bookingSmsService } =
      buildService(bookings);

    const initiated = await service.initiateDepositPaymentByToken(BASE_TOKEN);

    // Salon cancels while customer is completing Zibal payment
    bookings[0].status = BookingStatus.CANCELED;
    bookings[0].canceledBy = 'barber';
    bookings[1].status = BookingStatus.CANCELED;
    bookings[1].canceledBy = 'barber';

    const callbackUrl = await service.handleCallback({
      trackId: String(initiated.trackId),
      success: '1',
      status: '2',
      orderId: initiated.orderId,
    });

    expect(callbackUrl).toContain('payment=failed');
    expect(walletService.debitBarberAndQueueRefund).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        barberUserId: 100,
        customerUserId: 200,
        amount: 700_000,
        customerRefundAmount: 740_000,
      }),
    );
    await new Promise<void>(resolve => setImmediate(resolve));
    expect(bookingSmsService.sendDepositPaidToBarber).not.toHaveBeenCalled();
  });

  it('rejects malformed tokens before touching database', async () => {
    const bookings = makeBookingsFixture();
    const { service, bookingQb } = buildService(bookings);

    await expect(
      service.getDepositInvoiceByToken('bad%token_123'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(bookingQb.getMany).not.toHaveBeenCalled();
  });
});
