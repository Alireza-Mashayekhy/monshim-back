const PERSIAN_AND_ARABIC_DIGITS_REGEX = /[۰-۹٠-٩]/g;
const NUMERIC_GROUPING_AND_INVISIBLE_REGEX =
  /[\s\u00ad\u200b-\u200f\u202a-\u202e\u2060-\u2069\u061c,،٬_]/g;

/**
 * تبدیل ارقام فارسی (۰-۹) و عربی (٠-٩) به ارقام انگلیسی (0-9)
 */
export function toEnglishDigits(
  value: string | number | null | undefined,
): string {
  if (value === null || value === undefined) return '';
  return String(value).replace(PERSIAN_AND_ARABIC_DIGITS_REGEX, digit =>
    String(digit.charCodeAt(0) & 0xf),
  );
}

/**
 * نرمال‌سازی رشتهٔ عددی:
 * - تبدیل ارقام فارسی/عربی به انگلیسی
 * - تبدیل ممیز فارسی (٫) به نقطه (.)
 * - حذف جداکننده‌های هزارگان (کاما، ٬، ،) و کاراکترهای نامرئی/فاصله
 */
export function stripNumericSeparators(
  value: string | number | null | undefined,
): string {
  if (value === null || value === undefined) return '';
  return toEnglishDigits(value)
    .replace(/٫/g, '.')
    .replace(NUMERIC_GROUPING_AND_INVISIBLE_REGEX, '');
}

/**
 * استخراج ارقام صحیح انگلیسی از ورودی کاربر (مناسب مبالغ تومانی، تعداد و کدها)
 */
export function sanitizeIntegerInput(
  value: string | number | null | undefined,
): string {
  if (value === null || value === undefined) return '';
  return toEnglishDigits(value).replace(/[^0-9]/g, '');
}

/**
 * پاک‌سازی ورودی عددی اعشاری با پشتیبانی از ارقام فارسی/عربی و ممیز فارسی (٫ یا /)
 */
export function sanitizeDecimalInput(
  value: string | number | null | undefined,
  decimalPlaces?: number,
): string {
  if (value === null || value === undefined) return '';

  let raw = toEnglishDigits(value)
    .replace(/[٫/]/g, '.')
    .replace(NUMERIC_GROUPING_AND_INVISIBLE_REGEX, '')
    .replace(/[^0-9.]/g, '');

  if (!raw) return '';

  const firstDotIndex = raw.indexOf('.');
  if (firstDotIndex !== -1) {
    const intPart = raw.slice(0, firstDotIndex) || '0';
    let decPart = raw.slice(firstDotIndex + 1).replace(/\./g, '');
    if (decimalPlaces !== undefined && decimalPlaces > 0) {
      decPart = decPart.slice(0, decimalPlaces);
    }
    raw = `${intPart}.${decPart}`;
  }

  return raw;
}
