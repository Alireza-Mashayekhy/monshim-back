// components/dashboard/appointments/AppointmentSummary.tsx
'use client';

import { Wallet } from 'lucide-react';

import AppCard from '@/components/shared/app-card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatPrice } from '@/lib/utils';
import { useBarberBookings } from '@/services/features/booking/hooks';

export default function AppointmentSummary() {
  const today = new Date().toISOString().split('T')[0];
  const { data, isLoading } = useBarberBookings({ date: today });

  if (isLoading) {
    return (
      <AppCard className="bg-gradient-to-br from-primary to-primary-700 text-white">
        <div className="flex justify-between">
          <div>
            <Skeleton className="h-4 w-20 bg-white/30" />
            <Skeleton className="h-10 w-16 bg-white/30 mt-2" />
          </div>
          <div className="text-right">
            <Skeleton className="h-6 w-6 bg-white/30 rounded-full" />
            <Skeleton className="h-8 w-28 bg-white/30 mt-2" />
          </div>
        </div>
      </AppCard>
    );
  }

  const bookings = data?.data || [];
  const count = bookings.length;
  const income = bookings.reduce((sum, b) => sum + b.price, 0);

  return (
    <AppCard className="bg-gradient-to-br from-primary to-primary-700 text-white">
      <div className="flex justify-between">
        <div>
          <p className="text-white/70">امروز</p>
          <h2 className="mt-2 text-4xl font-bold">{count}</h2>
          <p className="mt-1">نوبت ثبت شده</p>
        </div>
        <div className="text-right">
          <Wallet size={28} />
          <h3 className="mt-3 text-2xl font-bold">{formatPrice(income)}</h3>
          <p className="text-white/70">درآمد امروز</p>
        </div>
      </div>
    </AppCard>
  );
}
