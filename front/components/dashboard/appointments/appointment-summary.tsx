// components/dashboard/appointments/AppointmentSummary.tsx
'use client';

import {
  ArrowUpLeft,
  CalendarDays,
  Clock3,
  Hourglass,
  Wallet,
} from 'lucide-react';
import Link from 'next/link';

import AppCard from '@/components/shared/app-card';
import { Skeleton } from '@/components/ui/skeleton';
import { toISODate } from '@/lib/jalali';
import { formatPrice, toPersianDigits } from '@/lib/utils';
import { useBarberBookings } from '@/services/features/booking/hooks';
import { Booking } from '@/services/features/booking/types';

function SummarySkeleton() {
  return (
    <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4 lg:gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <AppCard key={i} className="p-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-9 w-9 rounded-xl" />
          </div>
          <Skeleton className="mt-4 h-6 w-20" />
          <Skeleton className="mt-3 h-3 w-14" />
        </AppCard>
      ))}
    </div>
  );
}

export default function AppointmentSummary() {
  const todayIso = toISODate(new Date());

  const { data, isLoading } = useBarberBookings({
    startDate: todayIso,
    endDate: todayIso,
    limit: 100,
  });

  if (isLoading) {
    return <SummarySkeleton />;
  }

  const bookings: Booking[] = data?.data ?? [];

  // نوبت‌های فعال امروز (لغو/رد شده حساب نمی‌شوند)
  const activeBookings = bookings.filter(
    b => b.status !== 'canceled' && b.status !== 'rejected',
  );

  const count = activeBookings.length;
  const income = activeBookings.reduce((sum, b) => sum + Number(b.price), 0);
  const pendingCount = bookings.filter(b => b.status === 'pending').length;

  // نزدیک‌ترین نوبتِ هنوز نرسیده‌ی امروز
  const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();

  const toMinutes = (t: string) => {
    const [h, m] = t.split(':').map(Number);

    return h * 60 + m;
  };

  const nextBooking =
    activeBookings
      .filter(b => toMinutes(b.time) >= nowMinutes)
      .sort((a, b) => toMinutes(a.time) - toMinutes(b.time))[0] ?? null;

  return (
    <div className="space-y-2 sm:space-y-3">
      <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:gap-4 lg:grid-cols-4">
        <StatTile
          icon={CalendarDays}
          label="نوبت‌های امروز"
          value={toPersianDigits(count)}
          sub="شامل همه نوبت‌های فعال"
        />

        <StatTile
          icon={Wallet}
          label="درآمد امروز"
          value={`${toPersianDigits(formatPrice(income))}`}
          sub="تومان — نوبت‌های فعال"
        />

        <StatTile
          icon={Hourglass}
          label="در انتظار تایید"
          value={toPersianDigits(pendingCount)}
          sub={pendingCount > 0 ? 'نیاز به بررسی شما' : 'همه بررسی شده'}
          highlight={pendingCount > 0}
        />

        <StatTile
          icon={Clock3}
          label="نوبت بعدی"
          value={
            nextBooking ? toPersianDigits(nextBooking.time.slice(0, 5)) : '—'
          }
          sub={
            nextBooking
              ? (nextBooking.customer?.fullName ?? 'مشتری')
              : 'امروز نوبت دیگری نداری'
          }
        />
      </div>

      {/* نوار نوبت بعدی */}
      {nextBooking && (
        <AppCard className="border-primary/25 bg-primary-3 p-3.5 sm:p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-sm font-black text-white">
                {toPersianDigits(nextBooking.time.slice(0, 2))}
              </div>

              <div className="min-w-0">
                <p className="truncate text-xs font-black text-gray-900">
                  نوبت بعدی: {nextBooking.customer?.fullName ?? 'مشتری'} — ساعت{' '}
                  {toPersianDigits(nextBooking.time.slice(0, 5))}
                </p>

                <p className="mt-0.5 truncate text-[11px] font-medium text-gray-400">
                  {nextBooking.service?.name ?? 'خدمت'} ·{' '}
                  {toPersianDigits(formatPrice(nextBooking.price))} تومان
                </p>
              </div>
            </div>

            <Link
              href="#list"
              className="inline-flex shrink-0 items-center gap-0.5 text-[11px] font-black text-primary hover:underline"
            >
              مشاهده
              <ArrowUpLeft size={12} />
            </Link>
          </div>
        </AppCard>
      )}
    </div>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
  sub,
  highlight,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
}) {
  return (
    <AppCard className="p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-xs font-bold text-gray-500">{label}</p>

        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
            highlight
              ? 'bg-amber-100 text-amber-600'
              : 'bg-primary-2 text-primary'
          }`}
        >
          <Icon size={17} />
        </div>
      </div>

      <h2 className="mt-3 break-words text-lg font-black leading-none tracking-tight text-gray-900 sm:text-2xl">
        {value}
      </h2>

      {sub && (
        <p className="mt-2.5 truncate text-[11px] font-medium text-gray-400">
          {sub}
        </p>
      )}
    </AppCard>
  );
}
