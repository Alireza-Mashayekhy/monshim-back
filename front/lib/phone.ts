import * as z from 'zod';

/**
 * تبدیل ارقام فارسی (۰-۹) و عربی (٠-٩) به ارقام انگلیسی (0-9)
 */
export function toEnglishDigits(value: string): string {
  return value.replace(/[۰-۹٠-٩]/g, digit =>
    // هر دو بازه به ۰..۹ ختم می‌شوند، بنابراین ۴ بیت آخر همان رقم است
    String(digit.charCodeAt(0) & 0xf),
  );
}

/** حذف هر چیزی به‌جز ارقام (فاصله، خط تیره، پرانتز و...) */
export function onlyDigits(value: string | null | undefined): string {
  if (!value) return '';
  return toEnglishDigits(value).replace(/\D/g, '');
}

/**
 * نرمال‌سازی شماره موبایل برای ارسال به بک‌اند:
 * - ارقام فارسی/عربی → انگلیسی
 * - حذف جداکننده‌ها (فاصله، خط تیره، پرانتز، +)
 * - تبدیل پیش‌شماره‌ها: 0098… / +98… / 98… → 09…
 * - اضافه کردن صفر ابتدای شماره‌هایی مثل 9123456789
 * - محدود شدن به ۱۱ رقم
 */
export function normalizePhone(value: string | null | undefined): string {
  let digits = onlyDigits(value);

  if (digits.startsWith('0098')) {
    digits = `0${digits.slice(4)}`;
  } else if (digits.startsWith('98') && digits.length > 11) {
    digits = `0${digits.slice(2)}`;
  } else if (digits.startsWith('9') && digits.length >= 10) {
    digits = `0${digits}`;
  }

  return digits.slice(0, 11);
}

/** الگوی شماره موبایل معتبر ایران */
const IRANIAN_MOBILE_REGEX = /^09\d{9}$/;

export const isValidPhone = (value: string | null | undefined): boolean =>
  IRANIAN_MOBILE_REGEX.test(normalizePhone(value));

/**
 * اسکیمای شماره موبایل — مقدار را نرمال می‌کند و سپس اعتبارسنجی می‌کند؛
 * خروجی آن همیشه با ارقام انگلیسی و به فرمت 09123456789 است.
 */
export const phoneSchema = z
  .string()
  .transform(value => normalizePhone(value))
  .refine(value => IRANIAN_MOBILE_REGEX.test(value), {
    message: 'شماره تلفن وارد شده اشتباه است.',
  });
