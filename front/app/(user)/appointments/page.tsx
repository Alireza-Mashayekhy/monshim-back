'use client';

import { CalendarX2, RefreshCw } from 'lucide-react';
import { useMemo, useState } from 'react';

import { AppointmentsList } from '@/components/pages/appointments/appointments-list';
import { Button } from '@/components/ui/button';
import { toFa } from '@/lib/jalali';
import { cn } from '@/lib/utils';
import { useMyBookings } from '@/services/features/booking/hooks';
import type {
  BookingStatus,
  MyBooking,
} from '@/services/features/booking/types';

type TabKey = 'upcoming' | 'completed' | 'canceled';

const TABS: { key: TabKey; label: string; statuses: BookingStatus[] }[] = [
  { key: 'upcoming', label: 'پیش‌رو', statuses: ['pending', 'confirmed'] },
  { key: 'completed', label: 'تکمیل شده', statuses: ['completed'] },
  { key: 'canceled', label: 'لغو شده', statuses: ['canceled', 'rejected'] },
];

const EMPTY_STATES: Record<TabKey, { title: string; description: string }> = {
  upcoming: {
    title: 'نوبت فعالی ندارید',
    description:
      'هنوز نوبتی رزرو نکرده‌اید. از بخش جستجو سالن مورد نظر را پیدا کنید.',
  },
  completed: {
    title: 'نوبت تکمیل‌شده‌ای ندارید',
    description: 'پس از پایان نوبت‌ها، سوابق آن‌ها اینجا نمایش داده می‌شود.',
  },
  canceled: {
    title: 'نوبت لغو‌شده‌ای ندارید',
    description:
      'نوبت‌هایی که لغو یا رد شده‌اند در این بخش نمایش داده می‌شوند.',
  },
};

/** زمان نوبت بر حسب میلی‌ثانیه (برای مرتب‌سازی و تشخیص گذشته) */
const bookingTime = (booking: MyBooking): number => {
  const value = new Date(
    `${booking.date}T${booking.time || '00:00'}`,
  ).getTime();
  return Number.isNaN(value) ? 0 : value;
};

export default function AppointmentsPage() {
  const [tab, setTab] = useState<TabKey>('upcoming');

  const { data, isLoading, isError, refetch, isRefetching } = useMyBookings();

  const { upcoming, completed, canceled } = useMemo(() => {
    const all = data?.data ?? [];

    const upcomingList: MyBooking[] = [];
    const completedList: MyBooking[] = [];
    const canceledList: MyBooking[] = [];

    all.forEach(booking => {
      if (TABS[0].statuses.includes(booking.status)) upcomingList.push(booking);
      else if (TABS[1].statuses.includes(booking.status))
        completedList.push(booking);
      else if (TABS[2].statuses.includes(booking.status))
        canceledList.push(booking);
    });

    upcomingList.sort((a, b) => bookingTime(a) - bookingTime(b));
    completedList.sort((a, b) => bookingTime(b) - bookingTime(a));
    canceledList.sort((a, b) => bookingTime(b) - bookingTime(a));

    return {
      upcoming: upcomingList,
      completed: completedList,
      canceled: canceledList,
    };
  }, [data]);

  const lists: Record<TabKey, MyBooking[]> = { upcoming, completed, canceled };

  const currentList = lists[tab];
  const emptyState = EMPTY_STATES[tab];

  return (
    <div className="p-4">
      {/* هدر */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-xl font-bold text-gray-800">نوبت‌های من</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            مدیریت نوبت‌های رزرو شده
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
      <div className="bg-gray-100/80 rounded-2xl p-1 flex gap-1 mb-4">
        {TABS.map(item => {
          const count = lists[item.key].length;
          const active = tab === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => setTab(item.key)}
              className={cn(
                'flex-1 rounded-xl px-2 py-2 text-xs font-bold transition-all cursor-pointer',
                active
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-gray-500 hover:text-gray-700',
              )}
            >
              {item.label}
              <span
                className={cn(
                  'mr-1',
                  active ? 'text-primary/70' : 'text-gray-400',
                )}
              >
                ({toFa(count)})
              </span>
            </button>
          );
        })}
      </div>

      {/* لیست */}
      <AppointmentsList
        bookings={currentList}
        isLoading={isLoading}
        isError={isError}
        emptyTitle={emptyState.title}
        emptyDescription={emptyState.description}
      />

      <div className="mt-6 flex items-center justify-center gap-1.5 text-[10px] text-gray-300">
        <CalendarX2 size={12} />
        برای رزرو جدید به بخش جستجو مراجعه کنید
      </div>
    </div>
  );
}
