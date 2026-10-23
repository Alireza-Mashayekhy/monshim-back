import * as jalaali from 'jalaali-js';
import {
  bookingWallTimeToUtc,
  getBookingClock,
} from 'src/booking/booking-time';

import { BaleReportPeriod } from './bale.constants';

const TEHRAN_TIME_ZONE = 'Asia/Tehran';

const TEHRAN_DATETIME_FORMATTER = new Intl.DateTimeFormat('en-GB', {
  timeZone: TEHRAN_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

export const JALALI_MONTH_NAMES = [
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
] as const;

/** نام روزهای هفته بر اساس خروجی getUTCDay (۰ = یکشنبه ... ۶ = شنبه) */
const PERSIAN_WEEKDAYS_BY_UTC_DAY = [
  'یکشنبه',
  'دوشنبه',
  'سه‌شنبه',
  'چهارشنبه',
  'پنجشنبه',
  'جمعه',
  'شنبه',
] as const;

export interface BalePeriodRange {
  period: BaleReportPeriod;
  title: string;
  rangeLabel: string;
  /** تاریخ شروع به وقت تهران (YYYY-MM-DD) — شامل این روز */
  startDateIso: string;
  /** تاریخ پایان به وقت تهران (YYYY-MM-DD) — شامل این روز */
  endDateIso: string;
  /** لحظهٔ دقیق شروع بازه (۰۰:۰۰:۰۰ تهران به UTC) */
  startUtc: Date;
  /** لحظهٔ دقیق پایان بازه به‌صورت انحصاری (۰۰:۰۰:۰۰ روز بعد تهران به UTC) */
  endExclusiveUtc: Date;
}

/** تبدیل ارقام انگلیسی به فارسی */
export function toFaDigits(value: string | number): string {
  return String(value).replace(/\d/g, digit => '۰۱۲۳۴۵۶۷۸۹'[Number(digit)]);
}

/** تبدیل ارقام فارسی/عربی به انگلیسی (برای نرمال‌سازی دستورات متنی کاربر) */
export function toEnDigits(value: string): string {
  return value
    .replace(/[۰-۹]/g, ch => String(ch.charCodeAt(0) - 0x06f0))
    .replace(/[٠-٩]/g, ch => String(ch.charCodeAt(0) - 0x0660));
}

/** فرمت خوانای تعداد به فارسی با جداکنندهٔ هزارگان */
export function formatCount(value: number | string | null | undefined): string {
  const num = Number(value ?? 0);
  if (!Number.isFinite(num)) return '۰';

  return toFaDigits(Math.round(num).toLocaleString('en-US'));
}

/** فرمت خوانای مبلغ به تومان با ارقام فارسی و جداکنندهٔ سه‌رقمی */
export function formatToman(value: number | string | null | undefined): string {
  const num = Number(value ?? 0);
  if (!Number.isFinite(num)) return '۰ تومان';

  const rounded = Math.round(num);
  const absFormatted = toFaDigits(Math.abs(rounded).toLocaleString('en-US'));

  return `${rounded < 0 ? '-' : ''}${absFormatted} تومان`;
}

function pad2(num: number): string {
  return String(num).padStart(2, '0');
}

export function gregorianToIso(gy: number, gm: number, gd: number): string {
  return `${String(gy).padStart(4, '0')}-${pad2(gm)}-${pad2(gd)}`;
}

export function addDaysIso(isoDate: string, deltaDays: number): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d + deltaDays));

  return gregorianToIso(
    utc.getUTCFullYear(),
    utc.getUTCMonth() + 1,
    utc.getUTCDate(),
  );
}

/** تبدیل تاریخ میلادی YYYY-MM-DD به شمسی ۱۴۰۵/۰۸/۰۱ */
export function formatJalaliDate(isoDate: string): string {
  try {
    const clean = String(isoDate ?? '').slice(0, 10);
    const [gy, gm, gd] = clean.split('-').map(Number);
    if (!gy || !gm || !gd) return isoDate;

    const { jy, jm, jd } = jalaali.toJalaali(gy, gm, gd);
    return toFaDigits(`${jy}/${pad2(jm)}/${pad2(jd)}`);
  } catch {
    return isoDate;
  }
}

/** تبدیل تاریخ میلادی YYYY-MM-DD به فرم خوانا: جمعه ۱ آبان ۱۴۰۵ */
export function formatJalaliDateVerbose(isoDate: string): string {
  try {
    const clean = String(isoDate ?? '').slice(0, 10);
    const [gy, gm, gd] = clean.split('-').map(Number);
    if (!gy || !gm || !gd) return isoDate;

    const utcDay = new Date(Date.UTC(gy, gm - 1, gd)).getUTCDay();
    const weekday = PERSIAN_WEEKDAYS_BY_UTC_DAY[utcDay] ?? '';
    const { jy, jm, jd } = jalaali.toJalaali(gy, gm, gd);
    const monthName = JALALI_MONTH_NAMES[jm - 1] ?? String(jm);

    return toFaDigits(`${weekday} ${jd} ${monthName} ${jy}`).trim();
  } catch {
    return isoDate;
  }
}

/** نمایش یک لحظه (Date) به تاریخ شمسی و ساعت تهران */
export function formatTehranDateTime(
  value?: Date | string | null,
  includeSeconds = false,
): string {
  const date =
    value instanceof Date ? value : value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return '—';

  const parts = TEHRAN_DATETIME_FORMATTER.formatToParts(date);
  const getPart = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find(part => part.type === type)?.value ?? '00';

  const gy = Number(getPart('year'));
  const gm = Number(getPart('month'));
  const gd = Number(getPart('day'));
  const hour = getPart('hour');
  const minute = getPart('minute');
  const second = getPart('second');

  const { jy, jm, jd } = jalaali.toJalaali(gy, gm, gd);
  const jalaliStr = `${jy}/${pad2(jm)}/${pad2(jd)}`;
  const timeStr = includeSeconds
    ? `${hour}:${minute}:${second}`
    : `${hour}:${minute}`;

  return toFaDigits(`${jalaliStr} ساعت ${timeStr}`);
}

function buildRangeFromIsoBounds(params: {
  period: BaleReportPeriod;
  title: string;
  rangeLabel: string;
  startDateIso: string;
  endDateIso: string;
}): BalePeriodRange {
  const nextDayAfterEnd = addDaysIso(params.endDateIso, 1);
  const startUtc =
    bookingWallTimeToUtc(params.startDateIso, '00:00:00') ??
    new Date(`${params.startDateIso}T00:00:00.000Z`);
  const endExclusiveUtc =
    bookingWallTimeToUtc(nextDayAfterEnd, '00:00:00') ??
    new Date(`${nextDayAfterEnd}T00:00:00.000Z`);

  return {
    ...params,
    startUtc,
    endExclusiveUtc,
  };
}

/**
 * محاسبهٔ دقیق بازهٔ گزارش بر اساس تقویم شمسی و منطقهٔ زمانی تهران (Asia/Tehran).
 *
 * - روزانه: امروز تهران از ۰۰:۰۰ تا ۲۴:۰۰
 * - هفتگی: هفتهٔ جاری شمسی (از شنبه ۰۰:۰۰ تا پایان جمعه)
 * - ماهانه: ماه جاری شمسی (از ۱ ماه تا آخرین روز همان ماه شمسی)
 * - سالانه: سال جاری شمسی (از ۱ فروردین تا پایان اسفند همان سال)
 */
export function getReportPeriodRange(
  period: BaleReportPeriod,
  now = new Date(),
): BalePeriodRange {
  const todayIso = getBookingClock(now).date;
  const [gy, gm, gd] = todayIso.split('-').map(Number);
  const { jy, jm } = jalaali.toJalaali(gy, gm, gd);

  if (period === 'daily') {
    return buildRangeFromIsoBounds({
      period,
      title: 'گزارش روزانه (امروز)',
      rangeLabel: `${formatJalaliDateVerbose(todayIso)} (${formatJalaliDate(todayIso)})`,
      startDateIso: todayIso,
      endDateIso: todayIso,
    });
  }

  if (period === 'yesterday') {
    const yesterdayIso = addDaysIso(todayIso, -1);
    return buildRangeFromIsoBounds({
      period,
      title: 'گزارش روزانه (دیروز)',
      rangeLabel: `${formatJalaliDateVerbose(yesterdayIso)} (${formatJalaliDate(yesterdayIso)})`,
      startDateIso: yesterdayIso,
      endDateIso: yesterdayIso,
    });
  }

  if (period === 'weekly' || period === 'last_week') {
    // در تقویم ایران هفته از شنبه (getUTCDay() === 6) آغاز می‌شود.
    const utcDay = new Date(Date.UTC(gy, gm - 1, gd)).getUTCDay();
    const daysSinceSaturday = (utcDay + 1) % 7;
    const currentWeekStartIso = addDaysIso(todayIso, -daysSinceSaturday);

    if (period === 'weekly') {
      const currentWeekEndIso = addDaysIso(currentWeekStartIso, 6);
      return buildRangeFromIsoBounds({
        period,
        title: 'گزارش هفتگی (این هفته)',
        rangeLabel: `${formatJalaliDate(currentWeekStartIso)} تا ${formatJalaliDate(currentWeekEndIso)}`,
        startDateIso: currentWeekStartIso,
        endDateIso: currentWeekEndIso,
      });
    }

    const lastWeekStartIso = addDaysIso(currentWeekStartIso, -7);
    const lastWeekEndIso = addDaysIso(currentWeekStartIso, -1);
    return buildRangeFromIsoBounds({
      period,
      title: 'گزارش هفتگی (هفته گذشته)',
      rangeLabel: `${formatJalaliDate(lastWeekStartIso)} تا ${formatJalaliDate(lastWeekEndIso)}`,
      startDateIso: lastWeekStartIso,
      endDateIso: lastWeekEndIso,
    });
  }

  if (period === 'monthly' || period === 'last_month') {
    const targetJy = period === 'monthly' ? jy : jm === 1 ? jy - 1 : jy;
    const targetJm = period === 'monthly' ? jm : jm === 1 ? 12 : jm - 1;
    const monthLen = jalaali.jalaaliMonthLength(targetJy, targetJm);

    const startG = jalaali.toGregorian(targetJy, targetJm, 1);
    const endG = jalaali.toGregorian(targetJy, targetJm, monthLen);
    const startDateIso = gregorianToIso(startG.gy, startG.gm, startG.gd);
    const endDateIso = gregorianToIso(endG.gy, endG.gm, endG.gd);
    const monthName = JALALI_MONTH_NAMES[targetJm - 1] ?? String(targetJm);

    return buildRangeFromIsoBounds({
      period,
      title:
        period === 'monthly'
          ? `گزارش ماهانه (${monthName} ${toFaDigits(targetJy)})`
          : `گزارش ماه گذشته (${monthName} ${toFaDigits(targetJy)})`,
      rangeLabel: `${formatJalaliDate(startDateIso)} تا ${formatJalaliDate(endDateIso)}`,
      startDateIso,
      endDateIso,
    });
  }

  const targetJy = period === 'yearly' ? jy : jy - 1;
  const esfandLen = jalaali.jalaaliMonthLength(targetJy, 12);
  const startG = jalaali.toGregorian(targetJy, 1, 1);
  const endG = jalaali.toGregorian(targetJy, 12, esfandLen);
  const startDateIso = gregorianToIso(startG.gy, startG.gm, startG.gd);
  const endDateIso = gregorianToIso(endG.gy, endG.gm, endG.gd);

  return buildRangeFromIsoBounds({
    period,
    title:
      period === 'yearly'
        ? `گزارش سالانه (سال ${toFaDigits(targetJy)})`
        : `گزارش سال گذشته (سال ${toFaDigits(targetJy)})`,
    rangeLabel: `${formatJalaliDate(startDateIso)} تا ${formatJalaliDate(endDateIso)}`,
    startDateIso,
    endDateIso,
  });
}
