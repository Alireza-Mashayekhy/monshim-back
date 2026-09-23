// components/dashboard/appointments/appointment-date-utils.ts
import { toISODate } from '@/lib/jalali';

import { AppointmentFilterKey } from './appointment-filter';

export interface DateRange {
  startDate?: string;
  endDate?: string;
}

/** بازه تاریخ مربوط به هر فیلتر (بر اساس تقویم لوکال، نه UTC) */
export function getFilterDateRange(
  filter: AppointmentFilterKey,
  now = new Date(),
): DateRange {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  if (filter === 'today') {
    const iso = toISODate(today);

    return { startDate: iso, endDate: iso };
  }

  if (filter === 'tomorrow') {
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const iso = toISODate(tomorrow);

    return { startDate: iso, endDate: iso };
  }

  if (filter === 'week') {
    // هفته فارسی: از شنبه تا جمعه
    const start = new Date(today);
    start.setDate(today.getDate() - ((today.getDay() + 1) % 7));

    const end = new Date(start);
    end.setDate(start.getDate() + 6);

    return { startDate: toISODate(start), endDate: toISODate(end) };
  }

  if (filter === 'month') {
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    return { startDate: toISODate(start), endDate: toISODate(end) };
  }

  return {};
}

/** آیا تاریخ داده‌شده امروز یا فرداست؟ (برای برچسب هدر گروه‌ها) */
export function getRelativeDayLabel(
  isoDate: string,
  now = new Date(),
): 'امروز' | 'فردا' | null {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  if (isoDate === toISODate(today)) return 'امروز';
  if (isoDate === toISODate(tomorrow)) return 'فردا';

  return null;
}
