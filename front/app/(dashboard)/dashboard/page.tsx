'use client';

import { Calendar, DollarSign, Star, Users } from 'lucide-react';

import StatCard from '@/components/dashboard/cards/stat-card';
import DashboardShell from '@/components/dashboard/layout/dashboard-shell';
import WelcomeCard from '@/components/dashboard/sections/welcome-section';
import FadeIn from '@/components/shared/fade-in';
import { formatPrice } from '@/lib/utils';
import { useDashboardStats } from '@/services/features/dashboard/hooks';

export default function DashboardPage() {
  const { stats, balance, isLoading } = useDashboardStats();

  return (
    <DashboardShell>
      <FadeIn>
        <WelcomeCard todayAppointments={stats.todayAppointments} />
      </FadeIn>

      <FadeIn delay={0.1}>
        <div className="grid grid-cols-2 gap-2 lg:gap-4 xl:grid-cols-4">
          <StatCard
            title="موجودی کیف پول"
            value={isLoading ? '...' : `${formatPrice(balance?.data?.balance ?? 0)} تومان`}
            icon={DollarSign}
            className="col-span-2 xl:col-span-1"
          />

          <StatCard
            title="نوبت امروز"
            value={isLoading ? '...' : toPersianNumber(stats.todayAppointments)}
            icon={Calendar}
          />

          <StatCard
            title="امتیاز"
            value={stats.rating ? toPersianNumber(stats.rating) : '—'}
            icon={Star}
          />

          <StatCard
            title="مشتریان"
            value={isLoading ? '...' : toPersianNumber(stats.customers)}
            icon={Users}
          />
        </div>
      </FadeIn>
    </DashboardShell>
  );
}

function toPersianNumber(value: number | string) {
  return String(value).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[+d]);
}
