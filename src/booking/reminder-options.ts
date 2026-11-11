/** Supported offsets for both manual and customer-created bookings. */
export const REMINDER_HOURS_OPTIONS = [1, 2, 4, 6, 12, 24] as const;

export function isReminderHours(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    REMINDER_HOURS_OPTIONS.some(hour => hour === value)
  );
}
