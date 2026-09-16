'use client';

import { CalendarDays, RefreshCw } from 'lucide-react';
import { useMemo, useState } from 'react';

import { AppointmentsList } from '@/components/pages/appointments/appointments-list';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useMyBookings } from '@/services/features/booking/hooks';
import type { MyBooking } from '@/services/features/booking/types';

type Tab = 'upcoming' | 'past';

/** زمان نوبت بر حسب میلی‌ثانیه (برای مرتب‌سازی و تشخیص گذشته) */
const bookingTime = (booking: MyBooking): number => {
  const value = new Date(
    `${booking.date}T${booking.time || '00:00'}`,
  ).getTime();
  return Number.isNaN(value) ? 0 : value;
};

const isPastBooking = (booking: MyBooking): boolean =>
  ['completed', 'canceled', 'rejected'].includes(booking.status) ||
  bookingTime(booking) < Date.now();

export default function AppointmentsPage() {
  const [tab, setTab] = useState<Tab>('upcoming');

  const { data, isLoading, isError, refetch, isRefetching } = useMyBookings();

  const { upcoming, past } = useMemo(() => {
    const all = data?.data ?? [];

    const upcomingList: MyBooking[] = [];
    const pastList: MyBooking[] = [];

    all.forEach(booking => {
      (isPastBooking(booking) ? pastList : upcomingList).push(booking);
    });

    upcomingList.sort((a, b) => bookingTime(a) - bookingTime(b));
    pastList.sort((a, b) => bookingTime(b) - bookingTime(a));

    return { upcoming: upcomingList, past: pastList };
  }, [data]);

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: 'upcoming', label: 'پیش‌رو', count: upcoming.length },
    { key: 'past', label: 'گذشته', count: past.length },
  ];

  return (
    <div className="p-4">
      {/* هدر */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-xl font-bold text-gray-800">نوبت‌های من</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            نوبت‌های رزرو شده و گذشته‌ی شما
          </p>
        </div>
        <Button
          variant="outline"
          size="icon"
          className="size-9 rounded-full text-gray-500"
          onClick={() => refetch()}
          aria-label="به‌روزرسانی"
        >
          <RefreshCw size={16} className={isRefetching ? 'animate-spin' : ''} />
        </Button>
      </div>

      {/* تب‌ها */}
      <div className="flex gap-2 mb-4">
        {tabs.map(item => (
          <button
            key={item.key}
            type="button"
            onClick={() => setTab(item.key)}
            className={cn(
              'flex-1 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
              tab === item.key
                ? 'bg-primary-600 border-primary-600 text-white'
                : 'bg-white border-gray-200 text-gray-500 hover:border-primary-200 hover:text-primary-700',
            )}
          >
            {item.label}
            <span className="mx-1">({item.count})</span>
          </button>
        ))}
      </div>

      {/* لیست */}
      {tab === 'upcoming' ? (
        <AppointmentsList
          bookings={upcoming}
          isLoading={isLoading}
          isError={isError}
          emptyTitle="نوبت فعالی ندارید"
          emptyDescription="هنوز نوبتی رزرو نکرده‌اید. از بخش جستجو آرایشگاه مورد نظر را پیدا کنید."
        />
      ) : (
        <AppointmentsList
          bookings={past}
          isLoading={isLoading}
          isError={isError}
          emptyTitle="نوبت گذشته‌ای ندارید"
          emptyDescription="پس از انجام یا لغو نوبت‌ها، سوابق آن‌ها اینجا نمایش داده می‌شود."
        />
      )}

      <div className="mt-6 flex items-center justify-center gap-1.5 text-[10px] text-gray-300">
        <CalendarDays size={12} />
        برای رزرو جدید به بخش جستجو مراجعه کنید
      </div>
    </div>
  );
}
