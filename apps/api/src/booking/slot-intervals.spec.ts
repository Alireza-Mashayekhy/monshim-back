import {
  DEFAULT_SLOT_INTERVAL_MINUTES,
  hasOverlap,
  intervalsOverlap,
  isAllowedSlotIntervalMinutes,
  normalizeSlotIntervalMinutes,
  timeToMinutes,
} from './slot-intervals';

describe('slot-intervals', () => {
  it('ساعت را به دقیقه تبدیل می‌کند', () => {
    expect(timeToMinutes('09:30')).toBe(570);
    expect(timeToMinutes('00:00')).toBe(0);
    expect(Number.isNaN(timeToMinutes('bad'))).toBe(true);
  });

  it('بازه‌های چسبیده را تداخل نمی‌داند', () => {
    expect(
      intervalsOverlap({ start: 60, end: 90 }, { start: 90, end: 120 }),
    ).toBe(false);
  });

  it('بازه‌های هم‌پوشان را تداخل می‌داند', () => {
    expect(
      intervalsOverlap({ start: 60, end: 100 }, { start: 90, end: 120 }),
    ).toBe(true);
    // بازهٔ جدید کاملاً داخل بازهٔ موجود
    expect(
      intervalsOverlap({ start: 70, end: 80 }, { start: 60, end: 120 }),
    ).toBe(true);
  });

  it('بازهٔ نامعتبر را اشغال‌شده در نظر می‌گیرد', () => {
    expect(hasOverlap({ start: NaN, end: 60 }, [])).toBe(true);
  });

  it('فقط گام‌های ۱۵، ۳۰، ۴۵ و ۶۰ دقیقه را مجاز می‌داند و پیش‌فرض را ۳۰ دقیقه برمی‌گرداند', () => {
    expect(DEFAULT_SLOT_INTERVAL_MINUTES).toBe(30);

    expect(isAllowedSlotIntervalMinutes(15)).toBe(true);
    expect(isAllowedSlotIntervalMinutes(30)).toBe(true);
    expect(isAllowedSlotIntervalMinutes(45)).toBe(true);
    expect(isAllowedSlotIntervalMinutes(60)).toBe(true);

    expect(isAllowedSlotIntervalMinutes(20)).toBe(false);
    expect(isAllowedSlotIntervalMinutes(0)).toBe(false);
    expect(isAllowedSlotIntervalMinutes(null)).toBe(false);

    expect(normalizeSlotIntervalMinutes(undefined)).toBe(30);
    expect(normalizeSlotIntervalMinutes(null)).toBe(30);
    expect(normalizeSlotIntervalMinutes(25)).toBe(30);
    expect(normalizeSlotIntervalMinutes(15)).toBe(15);
    expect(normalizeSlotIntervalMinutes(45)).toBe(45);
    expect(normalizeSlotIntervalMinutes(60)).toBe(60);
    expect(normalizeSlotIntervalMinutes('45')).toBe(45);
  });
});
