import { DEPOSIT_PAYMENT_TIMEOUT_HOURS } from '@/constants/booking';

const TIME_FORMAT = new Intl.DateTimeFormat('fa-IR', {
  hour: '2-digit',
  minute: '2-digit',
});

const DAY_FORMAT = new Intl.DateTimeFormat('fa-IR', {
  day: 'numeric',
  month: 'long',
});

/**
 * متن مهلت پرداخت لینک بیعانه.
 *
 * مهلت از لحظهٔ ثبت/ارسال لینک شروع می‌شود (`depositRequestedAt`) و با هر
 * «ارسال مجدد» از نو شروع می‌شود. اگر تاریخ نامعتبر یا خالی باشد `null`
 * برمی‌گردد تا کارت چیز اشتباهی نشان ندهد.
 *
 * @param requestedAt زمان ISO ثبت یا آخرین ارسال لینک
 * @param now زمان فعلی (برای تست‌پذیری)
 */
export function getDepositDeadlineLabel(
  requestedAt: string | null | undefined,
  now: number = Date.now(),
): string | null {
  if (!requestedAt) return null;

  const startedAt = new Date(requestedAt).getTime();
  if (!Number.isFinite(startedAt)) return null;

  const deadline = startedAt + DEPOSIT_PAYMENT_TIMEOUT_HOURS * 3_600_000;

  if (deadline <= now) return 'مهلت پرداخت گذشته است';

  const deadlineDate = new Date(deadline);

  if (deadlineDate.toDateString() === new Date(now).toDateString()) {
    return `مهلت پرداخت تا ساعت ${TIME_FORMAT.format(deadlineDate)}`;
  }

  return `مهلت پرداخت تا ${DAY_FORMAT.format(deadlineDate)}، ساعت ${TIME_FORMAT.format(deadlineDate)}`;
}
