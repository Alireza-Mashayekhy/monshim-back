const BOOKING_TIME_ZONE = 'Asia/Tehran';

const BOOKING_CLOCK_FORMATTER = new Intl.DateTimeFormat('en-GB', {
  timeZone: BOOKING_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

export interface BookingClock {
  date: string;
  minutesSinceMidnight: number;
}

/**
 * The booking date/time columns are timezone-naive, so treat them as salon-local
 * time. The application serves Iranian salons; do not rely on the API host's TZ.
 */
export function getBookingClock(now = new Date()): BookingClock {
  const parts = BOOKING_CLOCK_FORMATTER.formatToParts(now);
  const getPart = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find(part => part.type === type)?.value ?? '';
  const year = getPart('year');
  const month = getPart('month');
  const day = getPart('day');
  const hour = Number(getPart('hour'));
  const minute = Number(getPart('minute'));
  const second = Number(getPart('second'));

  return {
    date: `${year}-${month}-${day}`,
    minutesSinceMidnight: hour * 60 + minute + second / 60,
  };
}

function parseBookingDate(date: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;

  const parsed = new Date(`${date}T00:00:00.000Z`);
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== date
  ) {
    return null;
  }

  return date;
}

function parseBookingTime(time: string): number | null {
  const match = /^(?:([01]\d|2[0-3])):([0-5]\d)(?::([0-5]\d))?$/.exec(time);
  if (!match) return null;

  return Number(match[1]) * 60 + Number(match[2]) + Number(match[3] ?? 0) / 60;
}

export function isBookingDateInPast(
  date: string,
  clock: BookingClock,
): boolean {
  const bookingDate = parseBookingDate(date);

  return !bookingDate || bookingDate < clock.date;
}

export function isBookingSlotInPast(
  date: string,
  time: string,
  clock: BookingClock,
): boolean {
  const bookingDate = parseBookingDate(date);
  const bookingTime = parseBookingTime(time);

  if (!bookingDate || bookingTime === null) return true;
  if (bookingDate < clock.date) return true;
  if (bookingDate > clock.date) return false;

  return bookingTime < clock.minutesSinceMidnight;
}
