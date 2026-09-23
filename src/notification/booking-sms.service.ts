// src/notification/booking-sms.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { SmsIrService } from 'src/common/services/sms-ir.service';

import {
  barberCanceledParams,
  barberNewBookingParams,
  BarberParams,
  bookingParams,
  BookingSmsParams,
  DepositLinkParams,
  depositLinkParams,
  SMS_TEMPLATES,
} from './sms-templates';

/**
 * سرویس ارسال پیامک‌های مرتبط با نوبت‌ها.
 *
 * نکته مهم: هیچ‌کدام از متدهای این سرویس نباید جریان اصلی
 * (ثبت/لغو نوبت) را بشکنند؛ خطاها فقط لاگ می‌شوند.
 */
@Injectable()
export class BookingSmsService {
  private readonly logger = new Logger(BookingSmsService.name);

  constructor(private readonly smsIrService: SmsIrService) {}

  /** ✅ تأیید رزرو برای مشتری (قالب 165709) — رایگان برای آرایشگر */
  async sendBookingSuccessToCustomer(
    customerPhone: string,
    params: BookingSmsParams,
  ): Promise<void> {
    await this.safeSend(
      customerPhone,
      SMS_TEMPLATES.BOOKING_SUCCESS_CUSTOMER,
      bookingParams(params),
      'تأیید رزرو به مشتری',
    );
  }

  /** ✅ رزرو جدید برای آرایشگر (قالب 175954) — رایگان */
  async sendNewBookingToBarber(
    barberPhone: string,
    params: BarberParams,
  ): Promise<void> {
    await this.safeSend(
      barberPhone,
      SMS_TEMPLATES.NEW_BOOKING_BARBER,
      barberNewBookingParams(params),
      'رزرو جدید به آرایشگر',
    );
  }

  /** ❌ لغو رزرو برای مشتری (قالب 403504) — رایگان */
  async sendBookingCanceledToCustomer(
    customerPhone: string,
    params: BookingSmsParams,
  ): Promise<void> {
    await this.safeSend(
      customerPhone,
      SMS_TEMPLATES.BOOKING_CANCELED_CUSTOMER,
      bookingParams(params),
      'لغو رزرو به مشتری',
    );
  }

  /** ❌ لغو رزرو برای آرایشگر (قالب 312735) — رایگان */
  async sendBookingCanceledToBarber(
    barberPhone: string,
    params: BarberParams,
  ): Promise<void> {
    await this.safeSend(
      barberPhone,
      SMS_TEMPLATES.BOOKING_CANCELED_BARBER,
      barberCanceledParams(params),
      'لغو رزرو به آرایشگر',
    );
  }

  /** ❌ رد رزرو برای مشتری — رایگان */
  async sendBookingRejectedToCustomer(
    customerPhone: string,
    params: BookingSmsParams,
  ): Promise<void> {
    await this.safeSend(
      customerPhone,
      SMS_TEMPLATES.BOOKING_REJECTED_CUSTOMER,
      bookingParams(params),
      'رد رزرو به مشتری',
    );
  }

  /** ⏰ یادآوری نوبت برای مشتری (قالب 121540) — ۲ پیامک از آرایشگر کسر می‌شود */
  async sendReminderToCustomer(
    customerPhone: string,
    params: BookingSmsParams,
  ): Promise<void> {
    await this.safeSend(
      customerPhone,
      SMS_TEMPLATES.BOOKING_REMINDER_CUSTOMER,
      bookingParams(params),
      'یادآوری نوبت به مشتری',
    );
  }

  /** ⏳ لینک پرداخت بیعانه برای مشتری (قالب 196593) — رایگان برای آرایشگر */
  async sendDepositLinkToCustomer(
    customerPhone: string,
    params: DepositLinkParams,
  ): Promise<void> {
    await this.safeSend(
      customerPhone,
      SMS_TEMPLATES.DEPOSIT_LINK_CUSTOMER,
      depositLinkParams(params),
      'لینک بیعانه به مشتری',
    );
  }

  /**
   * ارسال امن: خطای پیامک هرگز به جریان اصلی نوبت منتقل نمی‌شود
   */
  private async safeSend(
    mobile: string,
    templateId: number,
    parameters: { name: string; value: string }[],
    label: string,
  ): Promise<void> {
    if (!mobile) {
      this.logger.warn(`${label}: شماره گیرنده خالی است`);

      return;
    }

    try {
      const result = await this.smsIrService.sendTemplate(
        mobile,
        templateId,
        parameters,
      );

      if (result) {
        this.logger.log(
          `${label} ارسال شد (messageId=${result.messageId}) به ${mobile}`,
        );
      }
    } catch (error: any) {
      this.logger.error(
        `خطا در ارسال ${label} به ${mobile}: ${error?.message ?? String(error)}`,
      );
    }
  }
}
