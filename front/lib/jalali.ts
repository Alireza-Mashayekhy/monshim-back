// Lightweight Jalali (Persian/Shamsi) helpers wrapping `jalaali-js`.
import * as jalaali from 'jalaali-js';

const FA_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
export const toFa = (s: string | number) =>
  String(s).replace(/\d/g, d => FA_DIGITS[Number(d)]);

export const FA_MONTHS = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند',
];

// Saturday=0 .. Friday=6 (Jalali week starts on Saturday — شنبه)
export const FA_WEEKDAYS = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];

// نام کامل روزهای هفته (شنبه=0 .. جمعه=6)
export const FA_WEEKDAY_NAMES = [
  'شنبه',
  'یکشنبه',
  'دوشنبه',
  'سه‌شنبه',
  'چهارشنبه',
  'پنجشنبه',
  'جمعه',
];

/** ایندکس روز هفته به‌سبک فارسی: شنبه=0 .. جمعه=6 */
export function persianWeekdayIndex(d: Date): number {
  return (d.getDay() + 1) % 7;
}

/** نام کامل روز هفته یک تاریخ */
export function faWeekdayName(d: Date): string {
  return FA_WEEKDAY_NAMES[persianWeekdayIndex(d)];
}

/** تاریخ شروع هفته (شنبه) و پایان هفته (جمعه) شامل امروز */
export function currentPersianWeekRange(now = new Date()): {
  start: Date;
  end: Date;
} {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - persianWeekdayIndex(now));

  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  return { start, end };
}

/** اولین و آخرین روز ماه جاری میلادی شامل امروز */
export function currentMonthRange(now = new Date()): {
  start: Date;
  end: Date;
} {
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  return { start, end };
}

export function jalaliToGregorian(jy: number, jm: number, jd: number): Date {
  const g = jalaali.toGregorian(jy, jm, jd);
  return new Date(g.gy, g.gm - 1, g.gd);
}

export function gregorianToJalali(d: Date) {
  return jalaali.toJalaali(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

export function jalaliMonthLength(jy: number, jm: number): number {
  return jalaali.jalaaliMonthLength(jy, jm);
}

export interface JalaliDayCell {
  day: number;
  jy: number;
  jm: number;
  jd: number;
  date: Date;
  isInMonth: boolean;
  isPast: boolean;
  isToday: boolean;
}

export function getMonthGrid(jy: number, jm: number): JalaliDayCell[][] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = toISODate(today);

  const monthLen = jalaliMonthLength(jy, jm);
  const firstDayDate = jalaliToGregorian(jy, jm, 1);
  // Convert JS getDay (0=Sun..6=Sat) to Persian (Sat=0..Fri=6)
  const firstWeekday = (firstDayDate.getDay() + 1) % 7;

  const cells: JalaliDayCell[] = [];

  // Previous month trailing cells
  const prevJm = jm === 1 ? 12 : jm - 1;
  const prevJy = jm === 1 ? jy - 1 : jy;
  const prevLen = jalaliMonthLength(prevJy, prevJm);
  for (let i = firstWeekday - 1; i >= 0; i--) {
    const day = prevLen - i;
    const date = jalaliToGregorian(prevJy, prevJm, day);
    cells.push({
      day,
      jy: prevJy,
      jm: prevJm,
      jd: day,
      date,
      isInMonth: false,
      isPast: date < today,
      isToday: toISODate(date) === todayStr,
    });
  }

  // Current month
  for (let d = 1; d <= monthLen; d++) {
    const date = jalaliToGregorian(jy, jm, d);
    cells.push({
      day: d,
      jy,
      jm,
      jd: d,
      date,
      isInMonth: true,
      isPast: date < today,
      isToday: toISODate(date) === todayStr,
    });
  }

  // Next month leading cells (to fill 42-cell / 6-week grid)
  const nextJm = jm === 12 ? 1 : jm + 1;
  const nextJy = jm === 12 ? jy + 1 : jy;
  let nd = 1;
  while (cells.length < 42) {
    const date = jalaliToGregorian(nextJy, nextJm, nd);
    cells.push({
      day: nd,
      jy: nextJy,
      jm: nextJm,
      jd: nd,
      date,
      isInMonth: false,
      isPast: date < today,
      isToday: toISODate(date) === todayStr,
    });
    nd++;
  }

  const weeks: JalaliDayCell[][] = [];
  for (let i = 0; i < 42; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

export function formatJalaliDate(d: Date): string {
  const { jy, jm, jd } = gregorianToJalali(d);
  return `${toFa(jd)} ${FA_MONTHS[jm - 1]} ${toFa(jy)}`;
}

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Parse a YYYY-MM-DD string as a *local* Date (avoids UTC shift from `new Date('YYYY-MM-DD')`).
export function parseISODateLocal(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}
