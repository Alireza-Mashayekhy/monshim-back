// components/dashboard/appointments/AppointmentList.tsx
'use client';

import { useMemo } from 'react';

import { Skeleton } from '@/components/ui/skeleton';
import { useBarberBookings } from '@/services/features/booking/hooks';

import AppointmentCard from './appointment-card';

interface AppointmentListProps {
  filter: string;
  search: string;
}

export default function AppointmentList({
  filter,
  search,
}: AppointmentListProps) {
  // محاسبه تاریخ بر اساس فیلتر
  const dateParams = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    if (filter === 'today') return { date: today };
    if (filter === 'tomorrow') {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      return { date: tomorrow.toISOString().split('T')[0] };
    }
    if (filter === 'week') {
      const start = new Date();
      const end = new Date();
      end.setDate(end.getDate() + 7);
      return {
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0],
      };
    }
    return {};
  }, [filter]);

  const { data, isLoading, error } = useBarberBookings({
    ...dateParams,
    search: search || undefined,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-28 w-full rounded-2xl" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-10 text-red-500">
        خطا در بارگذاری نوبت‌ها. لطفاً مجدداً تلاش کنید.
      </div>
    );
  }

  const bookings = data?.data || [];

  if (bookings.length === 0) {
    return (
      <p className="text-gray-400 text-center py-6 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
        نوبتی با این مشخصات یافت نشد.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {bookings.map(booking => (
        <AppointmentCard key={booking.id} booking={booking} />
      ))}
    </div>
  );
}
