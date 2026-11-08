import { Transform } from 'class-transformer';
import { IRAN_PHONE_REGEX } from 'src/common/constants/constants';
import { toEnglishDigits } from 'src/common/utils/digits.util';

/**
 * نرمال‌سازی شمارهٔ موبایل ایران به قالب یکسان `09xxxxxxxxx`.
 *
 * چرا لازم است؟ کاربر (یا اپ موبایل/اسکریپت) ممکن است شماره را با ارقام
 * فارسی، فاصله، خط تیره یا پیش‌شمارهٔ بین‌المللی بفرستد:
 *   `۰۹۱۲ ۳۴۵ ۶۷۸۹`، `+989123456789`، `00989123456789`، `9123456789`
 * همه به `09123456789` تبدیل می‌شوند تا:
 *   • اعتبارسنجی `IRAN_PHONE_REGEX` روی مقدار نرمال‌شده انجام شود؛
 *   • جست‌وجوی کاربر با شماره (`where: { phone }`) همیشه یک نتیجه بدهد.
 *
 * اگر مقدار نرمال‌شده یک موبایل معتبر ایران نباشد، همان رشتهٔ نرمال‌شده
 * (بدون تغییر بیشتر) برگردانده می‌شود تا اعتبارسنجی DTO پیام خطای مناسب بدهد.
 */
export function normalizeIranMobile(value: unknown): unknown {
  if (typeof value !== 'string') return value;

  let digits = toEnglishDigits(value)
    .replace(/[^\d+]/g, '') // فاصله، خط تیره، پرانتز ...
    .replace(/^\+/, '');

  if (digits.startsWith('0098')) {
    digits = `0${digits.slice(4)}`;
  } else if (digits.startsWith('98') && digits.length >= 12) {
    digits = `0${digits.slice(2)}`;
  } else if (digits.startsWith('9') && digits.length >= 10) {
    digits = `0${digits}`;
  }

  // `slice` کوتاه‌کردن اعداد طولانی نیست؛ اگر بیش از ۱۱ رقم بود همان را
  // برمی‌گردانیم تا اعتبارسنجی رد کند و دادهٔ نامعتبر بی‌صدا اصلاح نشود.
  if (digits.length > 11) return digits;

  return digits;
}

/** آیا این مقدار یک موبایل معتبر ایران است؟ (پس از نرمال‌سازی) */
export function isValidIranMobile(value: unknown): boolean {
  const normalized = normalizeIranMobile(value);
  return typeof normalized === 'string' && IRAN_PHONE_REGEX.test(normalized);
}

/**
 * دکوراتور DTO: شمارهٔ موبایل را پیش از اعتبارسنجی نرمال می‌کند.
 * (مقدار `null`/`undefined` دست‌نخورده می‌ماند تا `@IsOptional` کار کند.)
 */
export function NormalizeMobile(): PropertyDecorator {
  return Transform(({ value }) =>
    value === null || value === undefined ? value : normalizeIranMobile(value),
  );
}
