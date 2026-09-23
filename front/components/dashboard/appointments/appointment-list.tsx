// components/dashboard/appointments/AppointmentList.tsx
'use client';

import { CalendarX2, Loader2, SearchX } from 'lucide-react';
import { useMemo } from 'react';

import { Skeleton } from '@/components/ui/skeleton';
import {
  faWeekdayName,
  formatJalaliDate,
  parseISODateLocal,
} from '@/lib/jalali';
import { toPersianDigits } from '@/lib/utils';
import { useBarberBookings } from '@/services/features/booking/hooks';

import AppointmentCard from './appointment-card';
import { getRelativeDayLabel } from './appointment-date-utils';
import { getFilterDateRange } from './appointment-date-utils';
import { AppointmentFilterKey } from './appointment-filter';

interface AppointmentListProps {
  filter: AppointmentFilterKey;
  search: string;
}

export default function AppointmentList({
  filter,
  search,
}: AppointmentListProps) {
  // محاسبه تاریخ بر اساس فیلتر
  const dateParams = useMemo(() => getFilterDateRange(filter), [filter]);

  const { data, isLoading, isFetching, error } = useBarberBookings({
    ...dateParams,
    limit: 100,
    search: search.trim() || undefined,
  });

  const groups = useMemo(() => {
    const bookings = data?.data ?? [];

    const map = new Map<
      string,
      { date: string; relative: string | null; bookings: typeof bookings }
    >();

    for (const booking of bookings) {
      if (!map.has(booking.date)) {
        map.set(booking.date, {
          date: booking.date,
          relative: getRelativeDayLabel(booking.date),
          bookings: [],
        });
      }

      map.get(booking.date)!.bookings.push(booking);
    }

    return Array.from(map.values()).map(group => ({
      ...group,
      label: `${faWeekdayName(parseISODateLocal(group.date))} ${formatJalaliDate(
        parseISODateLocal(group.date),
      )}`,
    }));
  }, [data]);

  if (isLoading) {
    return (
      <div className="space-y-2 sm:space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full rounded-3xl" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-dashed border-red-200 bg-red-50/50 py-10 text-center">
        <p className="text-sm font-bold text-red-500">
          خطا در بارگذاری نوبت‌ها. لطفاً دوباره تلاش کنید.
        </p>
      </div>
    );
  }

  const total = data?.data?.length ?? 0;

  if (total === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-gray-200 bg-gray-50/50 py-12 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-2/60 text-primary">
          {search.trim() ? <SearchX size={22} /> : <CalendarX2 size={22} />}
        </div>

        <p className="mt-3 text-sm font-black text-gray-800">
          {search.trim()
            ? 'نوبتی با این جستجو پیدا نشد'
            : 'در این بازه نوبتی ثبت نشده است'}
        </p>

        <p className="mt-1 text-xs text-gray-400">
          {search.trim()
            ? 'نام یا شماره دیگری را امتحان کن.'
            : 'با دکمه «ثبت نوبت دستی» اولین نوبت را ایجاد کن.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5" id="list">
      {groups.map(group => (
        <div key={group.date}>
          {/* هدر تاریخ */}
          <div className="mb-2 flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-primary-2 px-2.5 py-1 text-[11px] font-black text-primary">
              {group.relative ?? group.label}
              {group.relative && (
                <span className="font-bold text-primary/60">
                  · {group.label}
                </span>
              )}
            </span>

            <span className="text-[10px] font-bold text-gray-400">
              {toPersianDigits(group.bookings.length)} نوبت
            </span>

            <span className="h-px flex-1 bg-gray-100" />
          </div>

          <div className="space-y-2 sm:space-y-3">
            {group.bookings.map(booking => (
              <AppointmentCard key={booking.id} booking={booking} />
            ))}
          </div>
        </div>
      ))}

      {isFetching && (
        <div className="flex items-center justify-center gap-2 py-2 text-xs text-gray-400">
          <Loader2 size={14} className="animate-spin" />
          در حال بروزرسانی...
        </div>
      )}
    </div>
  );
}
