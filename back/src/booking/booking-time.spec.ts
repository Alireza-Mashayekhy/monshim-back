import {
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
