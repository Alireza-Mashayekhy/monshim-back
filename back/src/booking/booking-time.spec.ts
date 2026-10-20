import {
  bookingWallTimeToUtc,
  getBookingClock,
  isBookingDateInPast,
  isBookingSlotInPast,
} from './booking-time';

describe('booking time cutoff', () => {
  const now = new Date('2026-10-19T10:33:00.000Z');
  const clock = getBookingClock(now);

  it('uses the salon timezone rather than the API host timezone', () => {
    expect(clock).toEqual({
      date: '2026-10-19',
      minutesSinceMidnight: 14 * 60 + 3,
    });
  });

  it('excludes past dates and permits today/future dates', () => {
    expect(isBookingDateInPast('2026-10-18', clock)).toBe(true);
    expect(isBookingDateInPast('2026-10-19', clock)).toBe(false);
    expect(isBookingDateInPast('2026-10-20', clock)).toBe(false);
  });

  it('rejects slots that have started while keeping later slots today', () => {
    expect(isBookingSlotInPast('2026-10-19', '13:45', clock)).toBe(true);
    expect(isBookingSlotInPast('2026-10-19', '14:00', clock)).toBe(true);
    expect(isBookingSlotInPast('2026-10-19', '14:15', clock)).toBe(false);
    expect(isBookingSlotInPast('2026-10-20', '09:00', clock)).toBe(false);
  });

  it('treats malformed date/time values as unavailable', () => {
    expect(isBookingDateInPast('2026-02-31', clock)).toBe(true);
    expect(isBookingSlotInPast('2026-10-19', '24:00', clock)).toBe(true);
  });
});

describe('bookingWallTimeToUtc', () => {
  it('interprets naive columns as Tehran wall clock regardless of host timezone', () => {
    // ۱۲:۰۰ به وقت تهران == ۰۸:۳۰ UTC
    expect(bookingWallTimeToUtc('2026-10-20', '12:00')?.toISOString()).toBe(
      '2026-10-20T08:30:00.000Z',
    );
  });

  it('fires a 2h-before reminder at the correct instant (reported bug)', () => {
    // نوبت ۱۲:۰۰ تهران با یادآوری «۲ ساعت قبل» باید ۱۰:۰۰ تهران (۰۶:۳۰ UTC) ارسال شود،
    // نه ۱۳:۳۰ تهران که حاصل پارس UTC سرور است.
    const bookingInstant = bookingWallTimeToUtc('2026-10-20', '12:00');
    const sendAt = new Date((bookingInstant?.getTime() ?? 0) - 2 * 3600_000);

    expect(sendAt.toISOString()).toBe('2026-10-20T06:30:00.000Z');
    expect(sendAt.getTime()).toBeLessThan(bookingInstant?.getTime() ?? 0);
  });

  it('rolls across the day boundary like Tehran clocks read', () => {
    // ۰۰:۱۵ بامداد تهران معادل ۲۰:۴۵ شب قبل UTC است
    expect(bookingWallTimeToUtc('2026-10-21', '00:15')?.toISOString()).toBe(
      '2026-10-20T20:45:00.000Z',
    );
  });

  it('accepts seconds and rejects malformed values', () => {
    expect(bookingWallTimeToUtc('2026-10-20', '09:30:00')?.toISOString()).toBe(
      '2026-10-20T06:00:00.000Z',
    );
    expect(bookingWallTimeToUtc('2026-02-31', '10:00')).toBeNull();
    expect(bookingWallTimeToUtc('2026-10-20', '24:00')).toBeNull();
    expect(bookingWallTimeToUtc('not-a-date', '10:00')).toBeNull();
  });
});
