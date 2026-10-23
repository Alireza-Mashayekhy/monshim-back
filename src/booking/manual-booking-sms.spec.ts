import { BadRequestException } from '@nestjs/common';

jest.mock('@nestjs/schedule', () => ({
  Cron: () => () => undefined,
  CronExpression: { EVERY_10_MINUTES: '0 */10 * * * *' },
}));

import { UserSubscriptionStatus } from 'src/subscription/entities/user-subscription.entity';

import { BookingsService } from './booking.service';

describe('BookingsService.createManualByBarber (Deposit Link + SMS Reminder)', () => {
  const date = '2099-06-15';

  function createHarness(smsRemaining: number | null) {
    const barber = {
      id: 'barber-profile-1',
      userId: 100,
      salonName: 'پیرایش آریا',
      isApproved: true,
    };
    const member = {
      id: 'club-member-1',
      customerId: 200,
      customer: {
        id: 200,
        fullName: 'محمد حسینی',
        phone: '09123456789',
      },
    };
    const services = [
      {
        id: 'service-1',
        barberId: 100,
        name: 'اصلاح مو',
        price: 250000,
        depositPrice: 100000,
        durationMinutes: 30,
        isActive: true,
      },
      {
        id: 'service-2',
        barberId: 100,
        name: 'اصلاح صورت',
        price: 150000,
        depositPrice: 50000,
        durationMinutes: 15,
        isActive: true,
      },
    ];

    const bookingRepo: any = {
      find: jest.fn().mockResolvedValue([]),
      create: jest.fn((input: any) => ({ ...input })),
      save: jest.fn((rows: any[]) =>
        Promise.resolve(
          rows.map((row, idx) => ({
            ...row,
            id: `booking-${idx + 1}`,
          })),
        ),
      ),
    };
    const barberProfileRepo: any = {
      findOne: jest.fn().mockResolvedValue(barber),
    };
    const serviceRepo: any = {
      find: jest.fn().mockResolvedValue(services),
    };
    const workHoursRepo: any = {
      find: jest.fn().mockResolvedValue([
        {
          barberId: barber.id,
          dayOfWeek: (new Date(date).getDay() + 1) % 7,
          startTime: '08:00',
          endTime: '22:00',
        },
      ]),
    };
    const userSubscriptionRepo: any = {
      findOne: jest.fn().mockResolvedValue(
        smsRemaining === null
          ? null
          : {
              id: 1,
              userId: barber.userId,
              status: UserSubscriptionStatus.ACTIVE,
              smsTotal: 100,
              smsUsed: 100 - smsRemaining,
              endDate: new Date('2099-12-30T00:00:00.000Z'),
            },
      ),
    };
    const userRepo: any = {
      findOne: jest.fn().mockResolvedValue(member.customer),
    };
    const slotHoldRepo: any = {
      find: jest.fn().mockResolvedValue([]),
    };
    const userSubscriptionService: any = {
      deductSms: jest.fn().mockResolvedValue(undefined),
    };
    const clubService: any = {
      findMemberForBarber: jest.fn().mockResolvedValue(member),
      addFromSuccessfulBooking: jest.fn().mockResolvedValue(undefined),
    };
    const bookingSmsService: any = {
      sendDepositLinkToCustomer: jest.fn().mockResolvedValue(undefined),
      sendBookingSuccessToCustomer: jest.fn().mockResolvedValue(undefined),
    };
    const baleNotificationService: any = {
      notifyBookingCreated: jest.fn().mockResolvedValue(undefined),
      notifyManualBookingCreated: jest.fn().mockResolvedValue(undefined),
    };

    const service = new BookingsService(
      bookingRepo,
      barberProfileRepo,
      serviceRepo,
      workHoursRepo,
      userSubscriptionRepo,
      userRepo,
      slotHoldRepo,
      {} as any,
      {} as any,
      {} as any,
      clubService,
      userSubscriptionService,
      bookingSmsService,
      baleNotificationService,
    );

    return {
      service,
      bookingRepo,
      userSubscriptionService,
      bookingSmsService,
    };
  }

  it('allows sendDepositLink=true together with sendSmsReminder=true when barber has >= 2 SMS credits', async () => {
    const { service, bookingRepo, userSubscriptionService, bookingSmsService } =
      createHarness(2);

    const saved = await service.createManualByBarber(100, {
      clubCustomerId: 'club-member-1',
      serviceIds: ['service-1', 'service-2'],
      date,
      time: '10:00',
      sendDepositLink: true,
      sendSmsReminder: true,
      reminderHours: 4,
    });

    expect(userSubscriptionService.deductSms).toHaveBeenCalledWith(
      100,
      2,
      'پیامک یادآوری نوبت دستی',
    );
    expect(bookingSmsService.sendDepositLinkToCustomer).toHaveBeenCalledTimes(
      1,
    );
    expect(bookingRepo.save).toHaveBeenCalledTimes(1);
    expect(saved.bookings).toHaveLength(2);
    expect(saved.bookings[0]).toMatchObject({
      sendDepositLink: true,
      sendSmsReminder: true,
      reminderHours: 4,
    });
    expect(saved.bookings[1]).toMatchObject({
      sendDepositLink: true,
      sendSmsReminder: false,
      reminderHours: null,
    });
  });

  it('requires 4 SMS credits when sendDepositLink=false and sendSmsReminder=true', async () => {
    const { service } = createHarness(2);

    await expect(
      service.createManualByBarber(100, {
        clubCustomerId: 'club-member-1',
        serviceIds: ['service-1'],
        date,
        time: '11:00',
        sendDepositLink: false,
        sendSmsReminder: true,
        reminderHours: 2,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects sendSmsReminder=true when reminderHours is omitted', async () => {
    const { service, userSubscriptionService } = createHarness(10);

    await expect(
      service.createManualByBarber(100, {
        clubCustomerId: 'club-member-1',
        serviceIds: ['service-1'],
        date,
        time: '12:00',
        sendDepositLink: true,
        sendSmsReminder: true,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(userSubscriptionService.deductSms).not.toHaveBeenCalled();
  });
});
