/**
 * ابزارهای خالصِ بازهٔ زمانی نوبت.
 *
 * عمداً بدون وابستگی به Nest/TypeORM است تا هم مستقیم تست شود و هم همهٔ
 * نقاط بررسی تداخل (تقویم، رزرو آنلاین، ثبت دستی، تایید) از یک قاعدهٔ
 * واحد استفاده کنند.
 */

export interface BusyInterval {
  /** دقیقه از نیمه‌شب */
  start: number;
  end: number;
}

export function timeToMinutes(value: string): number {
  const [hours, minutes] = String(value).split(':').map(Number);

  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return NaN;

  return hours * 60 + minutes;
}

export function intervalsOverlap(a: BusyInterval, b: BusyInterval): boolean {
  return a.start < b.end && a.end > b.start;
}

/** آیا بازهٔ جدید با هیچ‌کدام از بازه‌های اشغال تداخل دارد؟ */
export function hasOverlap(
  candidate: BusyInterval,
  busy: BusyInterval[],
): boolean {
  if (!Number.isFinite(candidate.start) || !Number.isFinite(candidate.end)) {
    return true; // بازهٔ نامعتبر را «اشغال» در نظر می‌گیریم تا ریسک نکنیم
  }

  return busy.some(interval => intervalsOverlap(candidate, interval));
}
