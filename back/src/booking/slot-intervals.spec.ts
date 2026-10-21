import { hasOverlap, intervalsOverlap, timeToMinutes } from './slot-intervals';

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
});
