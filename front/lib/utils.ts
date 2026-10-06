// Re-export از پکیج `cn` که drop-in replacement برای clsx + tailwind-merge است.
// نگه‌داشتن این re-export برای سازگاری با ~۶۷ فایلی که از `@/lib/utils` ایمپورت
// می‌کنند، تا مهاجرت تدریجی بدون شکستن build انجام شود.
// همچنین `ClassValue` را به‌صورت محلی تعریف می‌کنیم تا فایل‌هایی که از
// `import type { ClassValue } from '@/lib/utils'` استفاده می‌کنند، همچنان
// type-check شوند (پکیج `cn` این نوع را export نمی‌کند ولی clsx آن را
// داشت — این همان ساختار است).
export { cn } from 'cn';

export type ClassValue =
  | string
  | number
  | boolean
  | undefined
  | null
  | ClassValue[]
  | { [key: string]: boolean | undefined | null | ClassValue };

export function toPersianDigits(value: number | string) {
  return String(value).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[+d]);
}

/**
 * اعداد را با ارقام فارسی و جداکنندهٔ هزارگان برمی‌گرداند.
 *
 * `toLocaleString('fa-IR')` در هر فراخوانی یک `Intl.NumberFormat` جدید می‌سازد
 * (یا از کش داخلی ICU پیدا می‌کند)؛ در لیست‌هایی که هر کارت چند عدد نشان می‌دهد
 * و با هر رندر تکرار می‌شود این هزینه جمع می‌شود. با یک نمونهٔ ماژول‌سطح،
 * فراخوانی‌های بعدی فقط یک `format()` ارزان هستند. خروجی دقیقاً مثل قبل است.
 */
const FA_NUMBER_FORMATTER = new Intl.NumberFormat('fa-IR');

export const formatFaNumber = (value: number | string): string =>
  FA_NUMBER_FORMATTER.format(
    typeof value === 'number' ? value : Number(value.replace(/,/g, '')),
  );

const FA_WEEKDAY_SHORT_FORMATTER = new Intl.DateTimeFormat('fa-IR', {
  weekday: 'short',
});

export const getFullImageUrl = (
  path: string | null | undefined,
): string | null => {
  if (!path) return null;
  return path.startsWith('http')
    ? path
    : `${process.env.NEXT_PUBLIC_IMAGE_URL || ''}${path}`;
};

export const formatPrice = (value: number | string): string => {
  if (value === null || value === undefined || value === '') return '۰';
  const strValue =
    typeof value === 'string' ? value.replace(/,/g, '') : String(value);
  const num = parseFloat(strValue);
  if (isNaN(num)) return '۰';
  return Math.floor(num).toLocaleString('en-US');
};

export const getNext7Days = (): { date: string; label: string }[] => {
  const days = [];
  const now = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    const label = FA_WEEKDAY_SHORT_FORMATTER.format(d);
    days.push({ date: dateStr, label });
  }
  return days;
};

export const DefaultImage = '/placeholder.webp';

export const formatNumberInput = (value: string) => {
  return value.replace(/\B(?=(\d{3})+(?!\d))/g, '،');
};

export const unformatNumberInput = (value: string) => {
  return parseFloat(value.replace(/,/g, '')) || 0;
};

export const getDurationLabel = (days: number): string => {
  switch (days) {
    case 30:
      return 'یک‌ماهه';
    case 90:
      return 'سه‌ماهه';
    case 180:
      return 'شش‌ماهه';
    case 365:
      return 'یک‌ساله';
    default:
      return `${toPersianDigits(days)} روزه`;
  }
};
