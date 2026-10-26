import { Transform } from 'class-transformer';

const PERSIAN_AND_ARABIC_DIGITS_REGEX = /[۰-۹٠-٩]/g;
const NUMERIC_GROUPING_AND_INVISIBLE_REGEX =
  /[\s\u00ad\u200b-\u200f\u202a-\u202e\u2060-\u2069\u061c,،٬_]/g;

/**
 * تبدیل ارقام فارسی (۰-۹) و عربی (٠-٩) به ارقام انگلیسی (0-9)
 */
export function toEnglishDigits(input: string): string {
  return String(input).replace(PERSIAN_AND_ARABIC_DIGITS_REGEX, digit =>
    String(digit.charCodeAt(0) & 0xf),
  );
}

/**
 * نرمال‌سازی رشتهٔ عددی (ارقام فارسی/عربی، ممیز فارسی و جداکننده‌های هزارگان)
 */
export function normalizeNumericString(input: string): string {
  return toEnglishDigits(input)
    .replace(/٫/g, '.')
    .replace(NUMERIC_GROUPING_AND_INVISIBLE_REGEX, '');
}

/**
 * تبدیل مقدار ورودی (شامل رشته‌های دارای ارقام فارسی/عربی و کاما) به عدد انگلیسی
 */
export function normalizeNumberValue(value: unknown): unknown {
  if (typeof value === 'number') return value;
  if (typeof value !== 'string') return value;

  const normalized = normalizeNumericString(value).trim();
  if (!normalized) return value;

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : value;
}

/**
 * دکوراتور DTO برای تبدیل ارقام فارسی/عربی به انگلیسی در فیلدهای رشته‌ای
 */
export function NormalizeDigits(): PropertyDecorator {
  return Transform(({ value }) =>
    typeof value === 'string' ? toEnglishDigits(value) : value,
  );
}

/**
 * دکوراتور DTO برای تبدیل رشته‌های عددی فارسی/عربی به number
 * (سازگار با `enableImplicitConversion: true` در ValidationPipe)
 */
export function NormalizeNumber(): PropertyDecorator {
  return Transform(({ value, obj, key }) => {
    const raw =
      typeof value === 'number' &&
      Number.isNaN(value) &&
      obj &&
      typeof obj === 'object' &&
      key in obj
        ? (obj as Record<string, unknown>)[key]
        : value;
    return normalizeNumberValue(raw);
  });
}
