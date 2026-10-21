// src/notification/reminder.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { bookingWallTimeToUtc } from 'src/booking/booking-time';
import { Booking, BookingStatus } from 'src/booking/entities/booking.entity';
import { IsNull, LessThan, MoreThan, Not, Repository } from 'typeorm';

import { BookingSmsService } from './booking-sms.service';

const BATCH_LIMIT = 100;

@Injectable()
export class ReminderService {
  private readonly logger = new Logger(ReminderService.name);

  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepo: Repository<Booking>,

    private readonly bookingSmsService: BookingSmsService,
  ) {}

  /**
   * هر ۵ دقیقه یک‌بار، نوبت‌هایی که وقت ارسال یادآوری‌شان رسیده را پیدا کرده،
   * ۲ پیامک از اعتبار آرایشگر کسر و پیامک یادآوری (قالب 121540) را می‌فرستد.
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async processReminders() {
    const now = new Date();

    /**
     * یادآوری فقط برای نوبتی می‌رود که «بیعانه‌اش پرداخت شده» باشد.
     *
     * نوبتی که با لینک بیعانه ثبت شده تا وقتی مشتری بیعانه را نداده، عملاً
     * قطعی نیست؛ فرستادن یادآوری برای آن هم مشتری را گمراه می‌کند و هم
     * اعتبار پیامک آرایشگر را هدر می‌دهد.
     */
    const paidReminderFilter = {
      sendSmsReminder: true,
      reminderSentAt: IsNull(),
      reminderHours: MoreThan(0),
      status: BookingStatus.CONFIRMED,
    };

    const bookings = await this.bookingRepo.find({
      where: [
        { ...paidReminderFilter, sendDepositLink: false },
        {
          ...paidReminderFilter,
          sendDepositLink: true,
          depositPaidAt: Not(IsNull()),
        },
      ],
      order: {
        date: 'ASC',
        time: 'ASC',
      },
      relations: {
        customer: true,
        service: true,
        barber: {
          user: true,
        },
      },
      take: BATCH_LIMIT,
    });

    const due = bookings.filter(
      b => b.reminderHours != null && b.reminderHours > 0,
    );

    for (const booking of due) {
      // زمان نوبت به وقت سالن (تهران) — مستقل از منطقه زمانی سرور
      const bookingDateTime = bookingWallTimeToUtc(booking.date, booking.time);

      if (!bookingDateTime) {
        this.logger.warn(
          `یادآوری نوبت ${booking.id}: تاریخ/ساعت نامعتبر است (${booking.date} ${booking.time})`,
        );

        continue;
      }

      const sendAt =
        bookingDateTime.getTime() - (booking.reminderHours ?? 0) * 3600_000;

      // هنوز وقتش نشده
      if (sendAt > now.getTime()) continue;

      // نوبت گذشته است؛ یادآوری بی‌معنی است — فقط علامت بزن
      if (bookingDateTime <= now) {
        booking.reminderSentAt = now;

        await this.bookingRepo.save(booking);

        continue;
      }

      const barberUserId = booking.barber?.userId;
      const customerPhone = booking.customer?.phone;

      try {
        if (!barberUserId || !customerPhone) {
          this.logger.warn(
            `یادآوری نوبت ${booking.id}: اطلاعات آرایشگر/مشتری ناقص است`,
          );

          continue;
        }

        await this.bookingSmsService.sendReminderToCustomer(customerPhone, {
          customerName: booking.customer.fullName ?? 'مشتری',
          serviceName: booking.service?.name ?? 'خدمت',
          date: booking.date,
          time: booking.time,
          salonName: booking.barber?.salonName ?? 'سالن شما',
        });

        booking.reminderSentAt = now;
        await this.bookingRepo.save(booking);

        this.logger.log(
          `یادآوری نوبت ${booking.id} برای آرایشگر ${barberUserId} ارسال شد`,
        );
      } catch (error: any) {
        // خطای ارسال یادآوری نباید باعث شکست پردازش سایر نوبت‌ها شود.
        this.logger.warn(
          `یادآوری نوبت ${booking.id} ارسال نشد: ${
            error?.message ?? String(error)
          }`,
        );
      }
    }
  }

  /**
   * (عمومی) نوبت‌های دارای یادآوریِ ارسال‌نشده — برای استفاده‌های بعدی
   */
  async countPendingReminders() {
    const base = {
      sendSmsReminder: true,
      reminderSentAt: IsNull(),
      reminderHours: LessThan(100000),
    };

    // همان قاعدهٔ ارسال: بیعانه‌پرداخت‌نشده در شمارش هم حساب نمی‌شود.
    return this.bookingRepo.count({
      where: [
        { ...base, sendDepositLink: false },
        { ...base, sendDepositLink: true, depositPaidAt: Not(IsNull()) },
      ],
    });
  }
}
