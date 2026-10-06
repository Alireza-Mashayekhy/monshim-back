import { gregorianToJalali, jalaliToGregorian } from '@/lib/jalali';

/**
 * ابزارهای تاریخ/ساعت فارسی.
 *
 * ── چرا این فایل بازنویسی شد؟ ─────────────────────────────────────────────
 * نسخهٔ قبلی برای تبدیل تاریخ از `react-multi-date-picker` و `react-date-object`
 * استفاده می‌کرد (یک خط `import { DateObject }`) و چون این ماژول در ۱۵+ فایل
 * (از جمله `app/(user)/home/page.tsx` و کامپوننت‌های داشبورد) import می‌شود،
 * کل آن کتابخانهٔ سنگین (به‌همراه تقویم‌ها/لوکال‌هایش) وارد باندل کلاینتِ آن
 * مسیرها می‌شد — هم حجم JS و هم زمان پردازش/اجرای آن روی CPU.
 *
 * الان تبدیل‌ها با `lib/jalali.ts` (پوشش نازک `jalaali-js`، چند کیلوبایت) انجام
 * می‌شود؛ نتیجه بیت‌به‌بیت همان است و خروجی با تست مقایسه‌ای روی بازهٔ وسیعی از
 * تاریخ‌ها بررسی شده است.
 *
 * ── چرا فرمترها ماژول‌سطح‌اند؟ ────────────────────────────────────────────
 * `toLocaleDateString('fa-IR', …)` در هر فراخوانی یک `Intl.DateTimeFormat`
 * می‌سازد/حل می‌کند و تبدیل تقویم میلادی→شمسی (ICU) انجام می‌دهد؛ در لیست‌هایی
 * که ده‌ها ردیف دارند و در هر رندر تکرار می‌شوند، همین کار به‌تنهایی می‌تواند
 * چند میلی‌ثانیه از رشتهٔ اصلی را در هر رندر بگیرد. با ساخت یک‌بارهٔ این
 * فرمترها، فراخوانی‌های بعدی فقط یک `format()` ارزان هستند.
 */
const FA_TIME_FORMATTER = new Intl.DateTimeFormat('fa-IR', {
  hour: '2-digit',
  minute: '2-digit',
});

const FA_DATE_FORMATTER = new Intl.DateTimeFormat('fa-IR');

const FA_WEEKDAY_FORMATTER = new Intl.DateTimeFormat('fa-IR', {
  weekday: 'long',
});

/** رشتهٔ ISO (میلادی) را بدون دخالت Timezone به اجزای تاریخ تبدیل می‌کند. */
function parseIsoDateParts(
  isoDate: string,
): { year: number; month: number; day: number } | null {
  const match = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/.exec(isoDate.trim());
  if (match) {
    return {
      year: Number(match[1]),
      month: Number(match[2]),
      day: Number(match[3]),
    };
  }

  const parsed = new Date(isoDate);
  if (Number.isNaN(parsed.getTime())) return null;

  return {
    year: parsed.getFullYear(),
    month: parsed.getMonth() + 1,
    day: parsed.getDate(),
  };
}

const pad2 = (value: number) => String(value).padStart(2, '0');

/**
 * تبدیل تاریخ میلادی (ISO: YYYY-MM-DD) به شمسی (YYYY/MM/DD)
 */
export function isoToJalali(isoDate: string | null | undefined): string {
  if (!isoDate) return '';

  const parts = parseIsoDateParts(isoDate);
  if (!parts) return '';

  try {
    const jalali = gregorianToJalali(
      new Date(parts.year, parts.month - 1, parts.day),
    );

    return `${jalali.jy}/${pad2(jalali.jm)}/${pad2(jalali.jd)}`;
  } catch {
    return '';
  }
}

/**
 * تبدیل تاریخ شمسی (YYYY/MM/DD) به میلادی (YYYY-MM-DD)
 */
export function jalaliToIso(
  jalaliDate: string | null | undefined,
): string | null {
  if (!jalaliDate) return null;

  const [year, month, day] = jalaliDate.split('/').map(Number);
  if (!year || !month || !day) return null;

  try {
    const date = jalaliToGregorian(year, month, day);

    return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(
      date.getDate(),
    )}`;
  } catch {
    return null;
  }
}

/**
 * فرمت کردن ساعت به صورت فارسی (مثل ۱۰:۳۰)
 */
export function formatPersianTime(isoDate: string | null | undefined): string {
  if (!isoDate) return '';

  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return '';

  return FA_TIME_FORMATTER.format(date);
}

/**
 * فرمت کردن تاریخ به صورت شمسی (مثل ۱۴۰۵/۰۶/۰۸)
 */
export function formatPersianDate(isoDate: string | null | undefined): string {
  if (!isoDate) return '';

  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return '';

  return FA_DATE_FORMATTER.format(date);
}

/**
 * نام روز هفته به فارسی (مثل «یکشنبه»)
 */
export function formatPersianWeekday(
  isoDate: string | null | undefined,
): string {
  if (!isoDate) return '';

  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return '';

  return FA_WEEKDAY_FORMATTER.format(date);
}

/**
 * تاریخ کوتاه برای لیست تیکت‌ها:
 * امروز → ساعت، دیروز → «دیروز»، بقیه → تاریخ شمسی
 */
export function formatTicketDate(isoDate: string | null | undefined): string {
  if (!isoDate) return '';

  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return '';

  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).getTime();

  const diffDays = Math.floor((startOfToday - date.getTime()) / 86_400_000);

  if (date.getTime() >= startOfToday) return formatPersianTime(isoDate);
  if (diffDays < 1) return 'دیروز';

  return formatPersianDate(isoDate);
}
