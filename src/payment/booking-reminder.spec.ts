import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { BarberProfile } from 'src/barber/entities/barber.entity';
import { Booking, BookingStatus } from 'src/booking/entities/booking.entity';
import { SlotHold } from 'src/booking/entities/slot-hold.entity';
import { REMINDER_HOURS_OPTIONS } from 'src/booking/reminder-options';

jest.mock('@nestjs/schedule', () => ({
  Cron: () => () => undefined,
  CronExpression: { EVERY_10_MINUTES: '0 */10 * * * *' },
}));

import { InitiateBookingPaymentDto } from './dto/initiate-booking-payment.dto';
import { Payment } from './entities/payment.entity';
import { PaymentService } from './payment.service';

describe('customer booking reminders', () => {
  function setup() {
    const rows: any[] = [];
    const services = [
      {
        id: 'service-1',
        barberId: 10,
        isActive: true,
        price: 100000,
        durationMinutes: 30,
      },
      {
        id: 'service-2',
        barberId: 10,
        isActive: true,
        price: 200000,
        durationMinutes: 30,
      },
    ];
    const qb: any = {
      setLock: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue({}),
      execute: jest.fn().mockResolvedValue({}),
    };
    const bookingRepo = {
      find: jest.fn().mockResolvedValue([]),
      create: jest.fn((row: any) => row),
      save: jest.fn((row: any) => {
        const saved = { ...row, id: `booking-${rows.length + 1}` };
        rows.push(saved);
        return Promise.resolve(saved);
      }),
    };
    const paymentRepo = {
      create: jest.fn((row: any) => row),
      save: jest.fn(row => Promise.resolve(row)),
    };
    const holdRepo = {
      createQueryBuilder: () => qb,
      find: jest.fn().mockResolvedValue([]),
      create: (row: any) => row,
      save: jest.fn(),
      delete: jest.fn(),
    };
    const barberRepo = {
      findOne: jest
        .fn()
        .mockResolvedValue({ id: 'profile-1', userId: 10, salonName: 'سالن' }),
      createQueryBuilder: () => qb,
    };
    const repositories = new Map<any, any>([
      [Booking, bookingRepo],
      [Payment, paymentRepo],
      [SlotHold, holdRepo],
      [BarberProfile, barberRepo],
    ]);
    const manager = {
      getRepository: (entity: any) => repositories.get(entity),
    };
    const dataSource = {
      transaction: (callback: any) => callback(manager),
    };
    const wallet = { depositOnceWithManager: jest.fn().mockResolvedValue({}) };
    const service = new PaymentService(
      paymentRepo as never,
      {
        findOne: jest.fn().mockResolvedValue({ id: 42, phone: '09121234567' }),
      } as never,
      barberRepo as never,
      {} as never,
      {} as never,
      { find: jest.fn().mockResolvedValue(services) } as never,
      bookingRepo as never,
      holdRepo as never,
      {} as never,
      {
        find: jest
          .fn()
          .mockResolvedValue([{ startTime: '09:00', endTime: '20:00' }]),
      } as never,
      {} as never,
      {} as never,
      {} as never,
      wallet as never,
      { get: jest.fn() } as never,
      dataSource as never,
    );
    jest.spyOn(service as any, 'getActiveHoldIntervals').mockResolvedValue([]);
    jest.spyOn(service as any, 'getSiteCommissionConfig').mockResolvedValue({});
    jest
      .spyOn(service as any, 'requestZibalPayment')
      .mockResolvedValue({ trackId: 123, paymentUrl: 'https://example.com' });
    jest
      .spyOn(service as any, 'hasFulfillmentConflict')
      .mockResolvedValue(false);
    jest
      .spyOn(service as any, 'sendPaidBookingSms')
      .mockResolvedValue(undefined);
    return { service, paymentRepo, rows, wallet };
  }

  it('validates optional reminder against the same six manual booking offsets', async () => {
    const base = {
      barberId: 10,
      serviceId: 'service-1',
      date: '2099-01-01',
      time: '12:00',
    };
    for (const reminderHours of [undefined, ...REMINDER_HOURS_OPTIONS]) {
      const dto = plainToInstance(InitiateBookingPaymentDto, {
        ...base,
        reminderHours,
      });
      expect(await validate(dto)).toHaveLength(0);
    }
    for (const reminderHours of [0, -1, 3, 25, 1.5, '2', true]) {
      const dto = plainToInstance(InitiateBookingPaymentDto, {
        ...base,
        reminderHours,
      });
      expect(
        (await validate(dto)).some(error => error.property === 'reminderHours'),
      ).toBe(true);
    }
  });

  it.each([undefined, ...REMINDER_HOURS_OPTIONS])(
    'persists %s through payment and on only the first booking, with no extra charge',
    async reminderHours => {
      const { service, paymentRepo, rows, wallet } = setup();
      await service.initiateBookingPayment(42, {
        barberId: 10,
        serviceIds: ['service-1', 'service-2'],
        date: '2099-01-01',
        time: '12:00',
        reminderHours,
      });
      // No booking or reminder exists until the gateway payment succeeds.
      expect(rows).toHaveLength(0);
      const payment = paymentRepo.save.mock.calls[0][0];
      expect(JSON.parse(payment.metadata).reminderHours).toBe(
        reminderHours ?? null,
      );
      expect(Number(payment.amount)).toBe(330000);
      payment.id = 'payment-1';
      payment.paidAt = new Date();
      await (service as any).confirmBookingAfterPayment(payment);
      expect(rows).toHaveLength(2);
      expect(rows[0]).toMatchObject({
        status: BookingStatus.PENDING,
        sendSmsReminder: reminderHours !== undefined,
        reminderHours: reminderHours ?? null,
      });
      expect(rows[1]).toMatchObject({
        sendSmsReminder: false,
        reminderHours: null,
      });
      expect(wallet.depositOnceWithManager).toHaveBeenCalledTimes(1);
    },
  );

  it('keeps old single-service metadata compatible and ignores malformed reminder metadata', async () => {
    const { service, rows } = setup();
    const payment: any = {
      id: 'old',
      userId: 42,
      amount: 110000,
      orderId: 'old',
      metadata: JSON.stringify({
        customerId: 42,
        barberUserId: 10,
        date: '2099-01-01',
        serviceId: 'service-1',
        time: '12:00',
        price: 100000,
        reminderHours: '2',
      }),
    };
    await (service as any).confirmBookingAfterPayment(payment);
    expect(rows[0]).toMatchObject({
      sendSmsReminder: false,
      reminderHours: null,
    });
  });
});
