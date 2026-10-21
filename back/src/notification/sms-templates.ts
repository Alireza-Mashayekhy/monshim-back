// src/notification/sms-templates.ts
import * as jalaali from 'jalaali-js';
import { SMS_PARAM_MAX_LENGTH } from 'src/common/constants/constants';

/**
 * کد قالب‌های پیامک سرویس SMS IR
 * (قالب‌ها در پنل sms.ir تعریف و تایید شده‌اند)
 */
export const SMS_TEMPLATES = {
  /** ✅ تأیید رزرو — پیامک به مشتری (رزرو آنلاین و دستی بدون بیعانه) */
  BOOKING_SUCCESS_CUSTOMER: 165709,

  /** ✅ رزرو جدید — پیامک به آرایشگر (رزرو آنلاین) */
  NEW_BOOKING_BARBER: 175954,

  /** ❌ لغو رزرو — پیامک به مشتری (لغو توسط خود مشتری) */
  BOOKING_CANCELED_CUSTOMER: 403504,

  /** ❌ رزرو لغو شد — پیامک به آرایشگر (لغو توسط مشتری) */
  BOOKING_CANCELED_BARBER: 312735,

  /** ❌ رد رزرو — پیامک به مشتری (رد توسط آرایشگر) */
  BOOKING_REJECTED_CUSTOMER: 187211,

  /** ⏰ یادآوری نوبت — پیامک به مشتری (در زمان یادآوری) */
  BOOKING_REMINDER_CUSTOMER: 121540,

  /** ⏳ لینک پرداخت بیعانه — پیامک به مشتری */
  DEPOSIT_LINK_CUSTOMER: 196593,
} as const;

/** تبدیل ارقام انگلیسی به فارسی */
export function toFaDigits(value: string | number): string {
  return String(value).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[+d]);
}

/**
 * تاریخ ISO (YYYY-MM-DD) به شمسی خوانا: ۱۴۰۵/۰۶/۳۱
 */
export function formatJalaliDateForSms(isoDate: string): string {
  try {
    const [y, m, d] = isoDate.split('-').map(Number);

    if (!y || !m || !d) return isoDate;

    const j = jalaali.toJalaali(y, m, d);

    return toFaDigits(
      `${j.jy}/${String(j.jm).padStart(2, '0')}/${String(j.jd).padStart(2, '0')}`,
    );
  } catch {
    return isoDate;
  }
}

/** ساعت HH:mm به فارسی: ۱۶:۳۰ */
export function formatTimeForSms(time: string): string {
  return toFaDigits(time.slice(0, 5));
}

/**
 * کوتاه‌کردن مقادیر نمایشی (نام، نام سالن، نام خدمت) تا سقف مجاز SMS.ir.
 *
 * سرویس SMS.ir مقدار هر پارامتر قالب را حداکثر ۲۵ کاراکتر می‌پذیرد و در
 * صورت عبور از این حد، درخواست را با HTTP 400 (کد وضعیت 114) رد می‌کند.
 * برای متن‌های توضیحی، کوتاه‌کردن بهتر از ارسال‌نشدن پیامک است.
 */
export function clipForSms(
  value: string | null | undefined,
  fallback = '',
  maxLength: number = SMS_PARAM_MAX_LENGTH,
): string {
  const text = String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!text) return fallback;
  if (text.length <= maxLength) return text;

  return `${text.slice(0, maxLength - 1).trimEnd()}…`;
}

export interface BookingSmsParams {
  customerName: string;
  serviceName: string;
  date: string;
  time: string;
  salonName: string;
}

export interface BarberParams {
  customerName: string;
  serviceName: string;
  date: string;
  time: string;
}

export interface DepositLinkParams {
  customerName: string;
  salonName: string;
  paymentToken: string;
}

/** پارامترهای مشترک قالب‌های نوبت */
export function bookingParams(params: BookingSmsParams) {
  return [
    { name: 'NAME', value: clipForSms(params.customerName, 'مشتری') },
    { name: 'SERVICE', value: clipForSms(params.serviceName, 'خدمت') },
    { name: 'DATE', value: formatJalaliDateForSms(params.date) },
    { name: 'TIME', value: formatTimeForSms(params.time) },
    { name: 'SALON_NAME', value: clipForSms(params.salonName, 'سالن') },
  ];
}

/** پارامترهای قالب «رزرو جدید برای آرایشگر» (#NAME# = نام مشتری) */
export function barberNewBookingParams(params: BarberParams) {
  return [
    { name: 'NAME', value: clipForSms(params.customerName, 'مشتری') },
    { name: 'SERVICE', value: clipForSms(params.serviceName, 'خدمت') },
    { name: 'DATE', value: formatJalaliDateForSms(params.date) },
    { name: 'TIME', value: formatTimeForSms(params.time) },
  ];
}

/** پارامترهای قالب «لغو برای آرایشگر» */
export function barberCanceledParams(params: BarberParams) {
  return barberNewBookingParams(params);
}

/**
 * پارامترهای قالب «لینک بیعانه».
 *
 * توجه: مقدار #PAYMENT_LINK# توکن لینک پرداخت است و نباید کوتاه شود؛
 * توکن هنگام ساخت نوبت با طول امنِ ۲۴ کاراکتر تولید می‌شود
 * (DEPOSIT_TOKEN_BYTES در constants) تا زیر سقف ۲۵ کاراکتر SMS.ir بماند.
 */
export function depositLinkParams(params: DepositLinkParams) {
  return [
    { name: 'NAME', value: clipForSms(params.customerName, 'مشتری') },
    { name: 'SALON_NAME', value: clipForSms(params.salonName, 'سالن') },
    { name: 'PAYMENT_LINK', value: String(params.paymentToken ?? '').trim() },
  ];
}
