// src/notification/reminder.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Booking, BookingStatus } from 'src/booking/entities/booking.entity';
import { UserSubscriptionService } from 'src/subscription/user-subscription.service';
import { IsNull, LessThan, Repository } from 'typeorm';

import { BookingSmsService } from './booking-sms.service';

const REMINDER_SMS_COST = 2;
const BATCH_LIMIT = 100;

@Injectable()
export class ReminderService {
  private readonly logger = new Logger(ReminderService.name);

  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepo: Repository<Booking>,

    private readonly userSubscriptionService: UserSubscriptionService,

    private readonly bookingSmsService: BookingSmsService,
  ) {}

  /**
   * هر ۵ دقیقه یک‌بار، نوبت‌هایی که وقت ارسال یادآوری‌شان رسیده را پیدا کرده،
   * ۲ پیامک از اعتبار آرایشگر کسر و پیامک یادآوری (قالب 121540) را می‌فرستد.
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async processReminders() {
    const now = new Date();

    const bookings = await this.bookingRepo.find({
      where: {
        sendSmsReminder: true,
        reminderSentAt: IsNull(),
        status: BookingStatus.CONFIRMED,
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
      // زمان نوبت بر اساس ساعت لوکال سرور (به وقت ایران)
      const bookingDateTime = new Date(
        `${booking.date}T${booking.time.slice(0, 5)}:00`,
      );

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

        // کسر ۲ پیامک از اعتبار آرایشگر
        await this.userSubscriptionService.deductSms(
          barberUserId,
          REMINDER_SMS_COST,
          `پیامک یادآوری نوبت ${booking.date}`,
        );

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
          `یادآوری نوبت ${booking.id} برای آرایشگر ${barberUserId} ارسال و ${REMINDER_SMS_COST} پیامک کسر شد`,
        );
      } catch (error: any) {
        // کسر پیامک ناموفق بود (اعتبار تمام شده / اشتراک منقضی) — ارسال نمی‌شود
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
    return this.bookingRepo.count({
      where: {
        sendSmsReminder: true,
        reminderSentAt: IsNull(),
        reminderHours: LessThan(100000),
      },
    });
  }
}
