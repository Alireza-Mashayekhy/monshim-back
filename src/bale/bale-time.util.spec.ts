import {
  formatCount,
  formatJalaliDate,
  formatJalaliDateVerbose,
  formatTehranDateTime,
  formatToman,
  getReportPeriodRange,
} from './bale-time.util';

describe('bale-time.util', () => {
  // 2026-10-23T12:00:00.000Z = جمعه ۱ آبان ۱۴۰۵ ساعت ۱۵:۳۰ به وقت تهران
  const fixedNow = new Date('2026-10-23T12:00:00.000Z');

  it('فرمت مبلغ تومان و تعداد را با ارقام فارسی برمی‌گرداند', () => {
    expect(formatToman(1_500_000)).toBe('۱,۵۰۰,۰۰۰ تومان');
    expect(formatToman(0)).toBe('۰ تومان');
    expect(formatToman(-25_000)).toBe('-۲۵,۰۰۰ تومان');
    expect(formatCount(1234)).toBe('۱,۲۳۴');
  });

  it('تاریخ میلادی و زمان UTC را به شمسی و ساعت تهران تبدیل می‌کند', () => {
    expect(formatJalaliDate('2026-10-23')).toBe('۱۴۰۵/۰۸/۰۱');
    expect(formatJalaliDateVerbose('2026-10-23')).toBe('جمعه ۱ آبان ۱۴۰۵');
    expect(formatTehranDateTime(fixedNow)).toBe('۱۴۰۵/۰۸/۰۱ ساعت ۱۵:۳۰');
  });

  it('بازهٔ روزانه (امروز و دیروز) را بر اساس نیمه‌شب تهران محاسبه می‌کند', () => {
    const daily = getReportPeriodRange('daily', fixedNow);
    expect(daily.startDateIso).toBe('2026-10-23');
    expect(daily.endDateIso).toBe('2026-10-23');
    // 00:00 تهران (+03:30) برابر 20:30 روز قبل به وقت UTC است
    expect(daily.startUtc.toISOString()).toBe('2026-10-22T20:30:00.000Z');
    expect(daily.endExclusiveUtc.toISOString()).toBe(
      '2026-10-23T20:30:00.000Z',
    );

    const yesterday = getReportPeriodRange('yesterday', fixedNow);
    expect(yesterday.startDateIso).toBe('2026-10-22');
    expect(yesterday.endDateIso).toBe('2026-10-22');
  });

  it('بازهٔ هفتگی را از شنبه تا جمعه به تقویم ایران محاسبه می‌کند', () => {
    // 2026-10-23 جمعه است -> شروع هفته باید شنبه 2026-10-17 باشد
    const weekly = getReportPeriodRange('weekly', fixedNow);
    expect(weekly.startDateIso).toBe('2026-10-17');
    expect(weekly.endDateIso).toBe('2026-10-23');

    const lastWeek = getReportPeriodRange('last_week', fixedNow);
    expect(lastWeek.startDateIso).toBe('2026-10-10');
    expect(lastWeek.endDateIso).toBe('2026-10-16');
  });

  it('بازهٔ ماهانه و ماه گذشته را دقیقاً منطبق بر ماه شمسی محاسبه می‌کند', () => {
    // ۱ آبان ۱۴۰۵ تا ۳۰ آبان ۱۴۰۵
    const monthly = getReportPeriodRange('monthly', fixedNow);
    expect(monthly.startDateIso).toBe('2026-10-23');
    expect(monthly.endDateIso).toBe('2026-11-21');
    expect(monthly.title).toContain('آبان ۱۴۰۵');

    // ماه قبل: ۱ مهر ۱۴۰۵ تا ۳۰ مهر ۱۴۰۵
    const lastMonth = getReportPeriodRange('last_month', fixedNow);
    expect(lastMonth.startDateIso).toBe('2026-09-23');
    expect(lastMonth.endDateIso).toBe('2026-10-22');
    expect(lastMonth.title).toContain('مهر ۱۴۰۵');
  });

  it('در فروردین‌ماه، «ماه گذشته» را به اسفند سال قبل شمسی می‌برد', () => {
    // 2026-03-25 = ۵ فروردین ۱۴۰۵ -> ماه قبل اسفند ۱۴۰۴
    const farvardinNow = new Date('2026-03-25T10:00:00.000Z');
    const lastMonth = getReportPeriodRange('last_month', farvardinNow);
    expect(lastMonth.title).toContain('اسفند ۱۴۰۴');
    expect(lastMonth.startDateIso).toBe('2026-02-20');
    expect(lastMonth.endDateIso).toBe('2026-03-20');
  });

  it('بازهٔ سالانه را از ۱ فروردین تا پایان اسفند محاسبه می‌کند', () => {
    const yearly = getReportPeriodRange('yearly', fixedNow);
    // ۱۴۰۵/۰۱/۰۱ = 2026-03-21 تا ۱۴۰۵/۱۲/۲۹ = 2027-03-20
    expect(yearly.startDateIso).toBe('2026-03-21');
    expect(yearly.endDateIso).toBe('2027-03-20');
    expect(yearly.title).toContain('۱۴۰۵');
  });
});
