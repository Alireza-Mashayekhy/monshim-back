import { BadRequestException } from '@nestjs/common';

jest.mock('@nestjs/schedule', () => ({
  Cron: () => () => undefined,
  CronExpression: { EVERY_10_MINUTES: '0 */10 * * * *' },
}));

import { BookingsService } from './booking.service';
import { BookingStatus } from './entities/booking.entity';

describe('BookingsService reschedule', () => {
  const date = '2099-05-10';

  function buildService(
    extraBookings: any[] = [],
    options?: {
      slotIntervalMinutes?: number;
      startTime?: string;
      endTime?: string;
      serviceDuration?: number;
    },
  ) {
    const barber = {
      id: 'barber-profile-1',
      userId: 100,
      salonName: 'سالن آریا',
      isApproved: true,
      slotIntervalMinutes: options?.slotIntervalMinutes,
    };
    const customer = {
      id: 200,
      fullName: 'سارا محمدی',
      phone: '09123456789',
    };
    const serviceItem = {
      id: 'service-1',
      barberId: 100,
      name: 'رنگ مو',
      durationMinutes: options?.serviceDuration ?? 60,
      isActive: true,
    };
    const booking: any = {
      id: 'booking-1',
      customerId: customer.id,
      customer,
      barberId: barber.id,
      barber,
      serviceId: serviceItem.id,
      service: serviceItem,
      date,
      time: '14:00',
      status: BookingStatus.CONFIRMED,
      holdsSlot: true,
    };

    const bookingRepo: any = {
      findOne: jest.fn().mockResolvedValue(booking),
      find: jest.fn().mockResolvedValue([booking, ...extraBookings]),
      save: jest.fn((value: any) => Promise.resolve(value)),
    };
    const barberProfileRepo: any = {
      findOne: jest.fn().mockResolvedValue(barber),
    };
    const serviceRepo: any = {
      find: jest.fn().mockResolvedValue([serviceItem]),
    };
    const workHoursRepo: any = {
      find: jest.fn().mockResolvedValue([
        {
          barberId: barber.id,
          dayOfWeek: (new Date(date).getDay() + 1) % 7,
          startTime: options?.startTime ?? '08:00',
          endTime: options?.endTime ?? '20:00',
        },
      ]),
    };
    const slotHoldRepo: any = { find: jest.fn().mockResolvedValue([]) };
    const bookingSmsService: any = {
      sendBookingTimeChangedToCustomer: jest.fn().mockResolvedValue(undefined),
    };

    const service = new BookingsService(
      bookingRepo,
      barberProfileRepo,
      serviceRepo,
      workHoursRepo,
      {} as any,
      {} as any,
      slotHoldRepo,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      bookingSmsService,
    );

    return { service, booking, bookingRepo, bookingSmsService };
  }

  it('ساعت را بدون شمردن تداخل رزرو با خودش تغییر می‌دهد و به مشتری پیامک می‌فرستد', async () => {
    const { service, booking, bookingRepo, bookingSmsService } = buildService();

    const result = await service.updateTime(booking.id, 100, ['barber'], {
      time: '14:30',
    });

    expect(result.time).toBe('14:30');
    expect(bookingRepo.save).toHaveBeenCalledWith(booking);
    expect(
      bookingSmsService.sendBookingTimeChangedToCustomer,
    ).toHaveBeenCalledWith('09123456789', {
      customerName: 'سارا محمدی',
      serviceName: 'رنگ مو',
      date,
      time: '14:30',
      salonName: 'سالن آریا',
    });
  });

  it('ساعتی را که با نوبت دیگر تداخل دارد قبول نمی‌کند و پیامک نمی‌فرستد', async () => {
    const otherBooking = {
      id: 'booking-2',
      time: '14:30',
      service: { durationMinutes: 60 },
    };
    const { service, booking, bookingRepo, bookingSmsService } = buildService([
      otherBooking,
    ]);

    await expect(
      service.updateTime(booking.id, 100, ['barber'], { time: '14:30' }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(bookingRepo.save).not.toHaveBeenCalled();
    expect(
      bookingSmsService.sendBookingTimeChangedToCustomer,
    ).not.toHaveBeenCalled();
  });

  it('برای ساعت تکراری نوبت را دوباره ذخیره یا پیامک ارسال نمی‌کند', async () => {
    const { service, booking, bookingRepo, bookingSmsService } = buildService();

    await service.updateTime(booking.id, 100, ['barber'], { time: '14:00' });

    expect(bookingRepo.save).not.toHaveBeenCalled();
    expect(
      bookingSmsService.sendBookingTimeChangedToCustomer,
    ).not.toHaveBeenCalled();
  });

  describe('getAvailableSlots با بازه زمانی انتخابی آرایشگر (slotIntervalMinutes)', () => {
    it.each([
      {
        interval: undefined,
        expected: ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30'],
      },
      {
        interval: 15,
        expected: [
          '09:00',
          '09:15',
          '09:30',
          '09:45',
          '10:00',
          '10:15',
          '10:30',
          '10:45',
          '11:00',
          '11:15',
          '11:30',
          '11:45',
        ],
      },
      {
        interval: 30,
        expected: ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30'],
      },
      {
        interval: 45,
        expected: ['09:00', '09:45', '10:30', '11:15'],
      },
      {
        interval: 60,
        expected: ['09:00', '10:00', '11:00'],
      },
    ])(
      'برای بازه ۰۹:۰۰ تا ۱۲:۰۰ و خدمت ۱۵ دقیقه‌ای با گام $interval اسلات‌های درست را می‌سازد',
      async ({ interval, expected }) => {
        const { service, bookingRepo } = buildService([], {
          slotIntervalMinutes: interval,
          startTime: '09:00',
          endTime: '12:00',
          serviceDuration: 15,
        });
        bookingRepo.find.mockResolvedValueOnce([]);

        const slots = await service.getAvailableSlots('100', date, [
          'service-1',
        ]);

        expect(slots).toEqual(expected);
      },
    );
  });
});
