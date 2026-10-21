import { Booking, BookingStatus } from '../booking/entities/booking.entity';
import { BookingSmsService } from './booking-sms.service';
import { ReminderService } from './reminder.service';

// @nestjs/schedule v12 فقط ESM است و jest (روی Node 22) نمی‌تواند require کند؛
// دکوراتور Cron موضوع این تست نیست و با نسخه‌ی ساده جایگزین می‌شود.
jest.mock('@nestjs/schedule', () => ({
  Cron: () => () => undefined,
  CronExpression: { EVERY_5_MINUTES: '0 */5 * * * *' },
}));

// نوبت ۱۲:۰۰ به وقت تهران == ۰۸:۳۰ UTC
const BOOKING_DATE = '2026-10-20';
const BOOKING_TIME = '12:00';
const REMINDER_HOURS = 2;

const buildBooking = (overrides: Partial<Booking> = {}): Booking =>
  ({
    id: 'booking-1',
    date: BOOKING_DATE,
    time: BOOKING_TIME,
    status: BookingStatus.CONFIRMED,
    sendSmsReminder: true,
    reminderHours: REMINDER_HOURS,
    reminderSentAt: null,
    customer: { fullName: 'مشتری', phone: '09120000000' },
    service: { name: 'اصلاح مو' },
    barber: { salonName: 'سالن تست', userId: 10 },
    ...overrides,
  }) as unknown as Booking;

describe('ReminderService', () => {
  const setup = () => {
    const bookingRepo = {
      find: jest.fn().mockResolvedValue([]),
      save: jest.fn().mockResolvedValue(undefined),
      count: jest.fn().mockResolvedValue(0),
    };

    const bookingSmsService = {
      sendReminderToCustomer: jest.fn().mockResolvedValue(undefined),
    };

    const service = new ReminderService(
      bookingRepo as never,
      bookingSmsService as unknown as BookingSmsService,
    );

    return { service, bookingRepo, bookingSmsService };
  };

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('sends the reminder exactly reminderHours before the Tehran appointment', async () => {
    // زمان ارسال صحیح: ۱۰:۰۰ تهران == ۰۶:۳۰ UTC — دو ساعت قبل از نوبت ۱۲:۰۰
    jest.setSystemTime(new Date('2026-10-20T06:31:00.000Z'));

    const { service, bookingRepo, bookingSmsService } = setup();
    const booking = buildBooking();
    bookingRepo.find.mockResolvedValue([booking]);

    await service.processReminders();

    expect(bookingSmsService.sendReminderToCustomer).toHaveBeenCalledTimes(1);
    expect(bookingSmsService.sendReminderToCustomer).toHaveBeenCalledWith(
      '09120000000',
      expect.objectContaining({
        date: BOOKING_DATE,
        time: BOOKING_TIME,
        salonName: 'سالن تست',
      }),
    );
    expect(booking.reminderSentAt).toBeInstanceOf(Date);
    expect(bookingRepo.save).toHaveBeenCalledWith(booking);
  });

  it('does not send or mark anything before the reminder is due', async () => {
    // ۰۶:۲۹ UTC هنوز دو ساعت قبل از نوبت کامل نشده (۱ دقیقه مانده)
    jest.setSystemTime(new Date('2026-10-20T06:29:00.000Z'));

    const { service, bookingRepo, bookingSmsService } = setup();
    bookingRepo.find.mockResolvedValue([buildBooking()]);

    await service.processReminders();

    expect(bookingSmsService.sendReminderToCustomer).not.toHaveBeenCalled();
    expect(bookingRepo.save).not.toHaveBeenCalled();
  });

  it('marks past appointments as reminded without sending an SMS', async () => {
    // بعد از ساعت نوبت (۰۸:۳۰ UTC گذشته) پیامک بی‌معنی است — فقط علامت بزند
    jest.setSystemTime(new Date('2026-10-20T10:00:00.000Z'));

    const { service, bookingRepo, bookingSmsService } = setup();
    const booking = buildBooking();
    bookingRepo.find.mockResolvedValue([booking]);

    await service.processReminders();

    expect(bookingSmsService.sendReminderToCustomer).not.toHaveBeenCalled();
    expect(booking.reminderSentAt).toBeInstanceOf(Date);
    expect(bookingRepo.save).toHaveBeenCalledWith(booking);
  });

  it('only queries confirmed bookings with a positive reminderHours', async () => {
    jest.setSystemTime(new Date('2026-10-20T06:31:00.000Z'));

    const { service, bookingRepo } = setup();
    bookingRepo.find.mockResolvedValue([buildBooking()]);

    await service.processReminders();

    const findArg = bookingRepo.find.mock.calls[0][0] as {
      where: Array<Record<string, unknown>>;
    };

    // دو شرط: نوبت بدون لینک بیعانه، و نوبتِ بیعانه‌ای که بیعانه‌اش پرداخت شده
    expect(findArg.where).toHaveLength(2);

    const [direct, deposit] = findArg.where;

    expect(direct.sendDepositLink).toBe(false);
    expect(direct.sendSmsReminder).toBe(true);
    expect(direct.status).toBe(BookingStatus.CONFIRMED);
    // reminderSentAt IS NULL و reminderHours > 0 باید در SQL فیلتر شوند
    expect((direct.reminderSentAt as { _type?: string })._type).toBe('isNull');
    expect((direct.reminderHours as { _type?: string })._type).toBe('moreThan');

    // یادآوری نوبت بیعانه‌ای فقط وقتی می‌رود که بیعانه پرداخت شده باشد
    expect(deposit.sendDepositLink).toBe(true);
    expect(deposit.depositPaidAt).toBeDefined();
  });

  it('skips bookings whose reminderHours is missing', async () => {
    jest.setSystemTime(new Date('2026-10-20T06:31:00.000Z'));

    const { service, bookingRepo, bookingSmsService } = setup();
    bookingRepo.find.mockResolvedValue([buildBooking({ reminderHours: null })]);

    await service.processReminders();

    expect(bookingSmsService.sendReminderToCustomer).not.toHaveBeenCalled();
    expect(bookingRepo.save).not.toHaveBeenCalled();
  });
});
