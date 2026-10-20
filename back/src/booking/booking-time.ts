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

/** Same fields as above but numeric-only, for machine parsing of zone offsets. */
const BOOKING_WALL_FORMATTER = new Intl.DateTimeFormat('en-US', {
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

/**
 * Offset (ms) of the salon timezone for a given instant. Positive when the
 * zone is ahead of UTC (Asia/Tehran is fixed at +03:30 since 2022 — no DST).
 */
function getSalonZoneOffsetMs(instant: Date): number {
  const parts = BOOKING_WALL_FORMATTER.formatToParts(instant);
  const getPart = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find(part => part.type === type)?.value ?? '0');

  const wallAsUtc = Date.UTC(
    getPart('year'),
    getPart('month') - 1,
    getPart('day'),
    getPart('hour'),
    getPart('minute'),
    getPart('second'),
  );

  return wallAsUtc - instant.getTime();
}

/**
 * Interprets the timezone-naive booking columns (`date` as 'YYYY-MM-DD' and
 * `time` as 'HH:mm[:ss]') as salon-local wall clock (Asia/Tehran) and returns
 * the true UTC instant, independent of the API host's TZ setting.
 *
 * `new Date(`${date}T${time}`)` would parse in the server's own timezone and
 * is wrong on UTC hosts (e.g. the production Docker image) — use this instead.
 * Returns `null` for malformed input.
 */
export function bookingWallTimeToUtc(date: string, time: string): Date | null {
  const bookingDate = parseBookingDate(date);
  const minutesSinceMidnight = parseBookingTime(time);

  if (!bookingDate || minutesSinceMidnight === null) return null;

  const totalSeconds = Math.round(minutesSinceMidnight * 60);
  const [year, month, day] = bookingDate.split('-').map(Number);
  const hour = Math.floor(totalSeconds / 3600);
  const minute = Math.floor((totalSeconds % 3600) / 60);
  const second = totalSeconds % 60;

  // Treat the wall clock as if it were UTC, then correct by the zone offset.
  // The second pass guards against offset changes across DST transitions.
  const naiveAsUtc = Date.UTC(year, month - 1, day, hour, minute, second);

  let instant = naiveAsUtc - getSalonZoneOffsetMs(new Date(naiveAsUtc));
  instant = naiveAsUtc - getSalonZoneOffsetMs(new Date(instant));

  return new Date(instant);
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
