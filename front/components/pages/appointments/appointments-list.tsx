'use client';

import { CalendarX2 } from 'lucide-react';
import Link from 'next/link';

import {
  AppointmentCard,
  AppointmentCardSkeleton,
} from '@/components/pages/appointments/appointment-card';
import { Button } from '@/components/ui/button';
import type { MyBooking } from '@/services/features/booking/types';

interface AppointmentsListProps {
  bookings?: MyBooking[];
  isLoading?: boolean;
  isError?: boolean;
  emptyTitle: string;
  emptyDescription: string;
}

export function AppointmentsList({
  bookings,
  isLoading,
  isError,
  emptyTitle,
  emptyDescription,
}: AppointmentsListProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <AppointmentCardSkeleton key={index} />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-gray-500">
          خطا در دریافت نوبت‌ها. لطفاً دوباره تلاش کنید.
        </p>
      </div>
    );
  }

  if (!bookings || bookings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-14 px-6 bg-white rounded-2xl border border-dashed border-gray-200">
        <div className="size-14 rounded-full bg-primary-50 flex items-center justify-center mb-3">
          <CalendarX2 size={26} className="text-primary-600" />
        </div>
        <p className="font-bold text-gray-700 text-sm">{emptyTitle}</p>
        <p className="text-xs text-gray-400 mt-1 leading-6">
          {emptyDescription}
        </p>
        <Link href="/explore" className="mt-4">
          <Button className="rounded-full px-5">رزرو نوبت جدید</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {bookings.map(booking => (
        <AppointmentCard key={booking.id} booking={booking} />
      ))}
    </div>
  );
}
