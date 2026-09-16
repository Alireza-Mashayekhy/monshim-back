import gregorian from 'react-date-object/calendars/gregorian';
import persian from 'react-date-object/calendars/persian';
import { DateObject } from 'react-multi-date-picker';

/**
 * تبدیل تاریخ میلادی (ISO: YYYY-MM-DD) به شمسی (YYYY/MM/DD)
 */
export function isoToJalali(isoDate: string | null | undefined): string {
  if (!isoDate) return '';

  try {
    const date = new DateObject({
      date: isoDate,
      calendar: gregorian,
    });

    const jalali = date.convert(persian);

    return `${jalali.year}/${String(jalali.month).padStart(2, '0')}/${String(
      jalali.day,
    ).padStart(2, '0')}`;
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

  try {
    const [year, month, day] = jalaliDate.split('/').map(Number);

    if (!year || !month || !day) return null;

    const date = new DateObject({
      year,
      month,
      day,
      calendar: persian,
    });

    const gregorianDate = date.convert(gregorian);

    return `${gregorianDate.year}-${String(gregorianDate.month).padStart(
      2,
      '0',
    )}-${String(gregorianDate.day).padStart(2, '0')}`;
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

  return date.toLocaleTimeString('fa-IR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * فرمت کردن تاریخ به صورت شمسی (مثل ۱۴۰۵/۰۶/۰۸)
 */
export function formatPersianDate(isoDate: string | null | undefined): string {
  if (!isoDate) return '';

  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return '';

  return date.toLocaleDateString('fa-IR');
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

  return date.toLocaleDateString('fa-IR', { weekday: 'long' });
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
