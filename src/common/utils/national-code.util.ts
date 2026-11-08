/**
 * اعتبارسنجی و نرمال‌سازی کد ملی ایران
 * طبق الگوریتم رسمی رقم کنترل سازمان ثبت‌احوال کشور
 *
 * این فایل باید دقیقاً همان رفتار `front/lib/national-code.ts` را داشته باشد؛
 * هر تغییری این‌جا باید در سمت کلاینت هم اعمال شود.
 */

const PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';

/**
 * فاصله‌ها (حتی NBSP و فاصلهٔ باریک)، نیم‌فاصله (ZWNJ/ZWJ)، علامت‌های
 * جهت‌دهی متن (LRM/RLM و ...)، خط تیره و جداکننده‌های عددی.
 *
 * این کاراکترها دیده نمی‌شوند ولی جزو طول رشته هستند؛ اگر هنگام کپی کد ملی
 * از یک متن فارسی همراه آن بیایند، کد ۱۰ رقمی «نامعتبر» تشخیص داده می‌شد.
 */
const INVISIBLE_AND_SEPARATORS_REGEX =
  /[\s\u00ad\u200b-\u200f\u202a-\u202e\u2060-\u2069\u061c\u0640\-_\u2010-\u2015\u2212.,،٬]/g;

/** تبدیل ارقام فارسی (۰-۹) و عربی (٠-٩) به ارقام لاتین */
export function toEnglishDigits(input: string): string {
  return String(input)
    .replace(/[۰-۹]/g, digit => String(PERSIAN_DIGITS.indexOf(digit)))
    .replace(/[٠-٩]/g, digit => String(ARABIC_DIGITS.indexOf(digit)));
}

/** تبدیل ارقام لاتین به فارسی؛ برای نمایش در پیام خطا */
export function toPersianDigits(input: string | number): string {
  return String(input).replace(/\d/g, digit => PERSIAN_DIGITS[Number(digit)]);
}

/**
 * ارقام فارسی/عربی را لاتین می‌کند و فاصله/خط تیره/کاراکترهای نامرئی را حذف
 * می‌کند. حروف حذف نمی‌شوند تا اعتبارسنجی بتواند آن‌ها را رد کند.
 */
export function normalizeNationalCode(
  input: string | number | null | undefined,
): string {
  if (input === null || input === undefined) return '';
  return toEnglishDigits(String(input))
    .trim()
    .replace(INVISIBLE_AND_SEPARATORS_REGEX, '');
}

export function isValidIranianNationalCode(
  input: string | number | null | undefined,
): boolean {
  const clean = normalizeNationalCode(input);

  // دقیقاً ۱۰ رقم باید باشد
  if (!/^\d{10}$/.test(clean)) {
    return false;
  }

  // تمام ارقام یکسان نامعتبر هستند (مثل 0000000000، 1111111111 و ...)
  if (/^(\d)\1{9}$/.test(clean)) {
    return false;
  }

  const check = parseInt(clean[9], 10);
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(clean[i], 10) * (10 - i);
  }

  const remainder = sum % 11;
  if (remainder < 2) {
    return check === remainder;
  }
  return check === 11 - remainder;
}

/**
 * پیام خطای دقیق کد ملی؛ `null` یعنی مقدار معتبر است.
 * پیام «باید ۱۰ رقم باشد» فقط وقتی برمی‌گردد که واقعاً تعداد ارقام درست نباشد.
 */
export function getNationalCodeError(
  input: string | number | null | undefined,
): string | null {
  const clean = normalizeNationalCode(input);

  if (!clean) {
    return 'کد ملی الزامی است';
  }

  if (/\D/.test(clean)) {
    return 'کد ملی فقط باید شامل رقم باشد';
  }

  if (clean.length !== 10) {
    return `کد ملی باید ۱۰ رقم باشد (${toPersianDigits(clean.length)} رقم وارد شده است)`;
  }

  if (!isValidIranianNationalCode(clean)) {
    return 'کد ملی وارد شده معتبر نیست؛ لطفاً رقم‌های آن را دوباره بررسی کنید';
  }

  return null;
}
