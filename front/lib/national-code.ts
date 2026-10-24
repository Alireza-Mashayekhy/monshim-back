/**
 * اعتبارسنجی و نرمال‌سازی کد ملی ایران در سمت کلاینت
 * طبق الگوریتم رسمی رقم کنترل سازمان ثبت‌احوال کشور
 */

const PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';

/**
 * کاراکترهایی که «دیده نمی‌شوند» ولی جزء طول رشته حساب می‌شوند:
 * فاصله‌ها (از جمله فاصلهٔ باریک و NBSP)، نیم‌فاصله (ZWNJ/ZWJ)،
 * علامت‌های جهت‌دهی متن (LRM/RLM و ...)، خط تیره‌ها و جداکننده‌های عددی.
 *
 * چرا مهم است؟ وقتی کاربر کد ملی را از یک پیام/سند فارسی کپی می‌کند،
 * معمولاً یکی از این کاراکترها هم همراه آن کپی می‌شود. قبلاً فقط `\s` و
 * `-` حذف می‌شد؛ در نتیجه کدی که در نگاه کاربر دقیقاً ۱۰ رقم بود، از نظر
 * اعتبارسنجی ۱۱ کاراکتر داشت و پیام «کد ملی وارد شده معتبر نیست (باید ۱۰
 * رقم باشد)» نمایش داده می‌شد — همان باگی که کاربر گزارش کرده بود.
 * اگر این کاراکترها *اول* رشته باشند بدتر می‌شود: `maxLength={10}` ورودی
 * را به ۱۰ کاراکتر می‌بُرد و در نتیجه یک رقم از کد ملی هم حذف می‌شد.
 */
const INVISIBLE_AND_SEPARATORS_REGEX =
  /[\s\u00ad\u200b-\u200f\u202a-\u202e\u2060-\u2069\u061c\u0640\-_\u2010-\u2015\u2212.,،٬]/g;

/** تبدیل ارقام فارسی (۰-۹) و عربی (٠-٩) به ارقام لاتین */
export function toEnglishDigits(input: string): string {
  return String(input)
    .replace(/[۰-۹]/g, digit => String(PERSIAN_DIGITS.indexOf(digit)))
    .replace(/[٠-٩]/g, digit => String(ARABIC_DIGITS.indexOf(digit)));
}

/** تبدیل ارقام لاتین به فارسی؛ برای نمایش تعداد ارقام در پیام خطا */
export function toPersianDigits(input: string | number): string {
  return String(input).replace(/\d/g, digit => PERSIAN_DIGITS[Number(digit)]);
}

/**
 * نرمال‌سازی برای اعتبارسنجی و ارسال به بک‌اند:
 * ارقام فارسی/عربی → لاتین و حذف فاصله/خط تیره/کاراکترهای نامرئی.
 * حروف و سایر نمادها حذف نمی‌شوند تا اعتبارسنجی بتواند آن‌ها را رد کند.
 */
export function normalizeNationalCode(
  input: string | number | null | undefined,
): string {
  if (input === null || input === undefined) return '';
  return toEnglishDigits(String(input))
    .trim()
    .replace(INVISIBLE_AND_SEPARATORS_REGEX, '');
}

/**
 * پاک‌سازی هنگام تایپ: فقط ارقام لاتین و حداکثر ۱۰ رقم.
 * این تابع مقدار ورودی را همان لحظه اصلاح می‌کند تا کاربر هیچ‌وقت
 * «۱۰ رقم ظاهراً درست» را با پیام خطا نبینید.
 */
export function sanitizeNationalCodeInput(
  input: string | number | null | undefined,
): string {
  if (input === null || input === undefined) return '';
  return toEnglishDigits(String(input)).replace(/\D/g, '').slice(0, 10);
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
 *
 * پیام‌ها عمداً از هم جدا شده‌اند: قبلاً هم «خالی بودن»، هم «طول نامعتبر»
 * و هم «رقم کنترل غلط» یک پیام می‌دادند («باید ۱۰ رقم باشد») و کاربری که
 * واقعاً ۱۰ رقم وارد کرده بود گیج می‌شد. الان اگر مشکل طول نباشد، پیام
 * دربارهٔ رقم کنترل است و برعکس.
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
