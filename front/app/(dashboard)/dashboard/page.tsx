'use client';

import {
  ArrowUpRight,
  CalendarDays,
  Clock,
  Gem,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Scissors,
  Star,
  Store,
  Users,
  Wallet,
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { AppointmentBookingDialog } from '@/components/dashboard/appointments/appointment-booking-dialog';
import StatCard from '@/components/dashboard/cards/stat-card';
import DashboardShell from '@/components/dashboard/layout/dashboard-shell';
import AppCard from '@/components/shared/app-card';
import FadeIn from '@/components/shared/fade-in';
import { Button } from '@/components/ui/button';
import { formatPrice } from '@/lib/utils';
import { useCurrentUser } from '@/services/features/auth/hooks';
import {
  useBarber,
  useMyBarberProfile,
} from '@/services/features/barber/hooks';
import type { Booking, BookingStatus } from '@/services/features/booking/types';
import { useDashboardStats } from '@/services/features/dashboard/hooks';

const STATUS_STYLES: Record<
  BookingStatus,
  { label: string; className: string }
> = {
  pending: {
    label: 'در انتظار',
    className: 'bg-yellow-50 text-yellow-600 border-yellow-200',
  },
  confirmed: {
    label: 'تأیید شده',
    className: 'bg-green-50 text-green-600 border-green-200',
  },
  completed: {
    label: 'انجام شده',
    className: 'bg-blue-50 text-blue-600 border-blue-200',
  },
  canceled: {
    label: 'لغو شده',
    className: 'bg-gray-100 text-gray-500 border-gray-200',
  },
  rejected: {
    label: 'رد شده',
    className: 'bg-red-50 text-red-500 border-red-200',
  },
};

const QUICK_ACTIONS = [
  { title: 'نوبت‌ها', href: '/dashboard/appointments', icon: CalendarDays },
  { title: 'خدمات', href: '/dashboard/services', icon: Scissors },
  { title: 'ساعت کاری', href: '/dashboard/work-hours', icon: Clock },
  { title: 'امور مالی', href: '/dashboard/financial', icon: Wallet },
  { title: 'اشتراک', href: '/dashboard/subscription', icon: Gem },
  { title: 'باشگاه مشتریان', href: '/dashboard/club', icon: Users },
];

export default function DashboardPage() {
  const { user } = useCurrentUser();
  const { data: profileData } = useMyBarberProfile();
  const { data: barberData } = useBarber(user?.id ?? 0);
  const { stats, balance, isLoading } = useDashboardStats();
  const [bookingOpen, setBookingOpen] = useState(false);

  const profile = profileData?.data;
  const rating =
    barberData?.data?.rating != null ? Number(barberData.data.rating) : null;

  const balanceValue = Number(balance?.data?.balance ?? 0);
  const recentBookings: Booking[] = stats.recentBookings ?? [];

  const locationValue = [profile?.provinceName, profile?.cityName]
    .filter(Boolean)
    .join('، ');

  return (
    <DashboardShell>
      <FadeIn delay={0.08}>
        <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:gap-4 xl:grid-cols-4">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <AppCard key={i} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="h-3 w-16 bg-gray-100 rounded" />
                  <div className="w-9 h-9 rounded-xl bg-gray-100" />
                </div>
                <div className="h-6 w-20 bg-gray-200 rounded mt-4" />
                <div className="h-3 w-12 bg-gray-100 rounded mt-3" />
              </AppCard>
            ))
          ) : (
            <>
              <StatCard
                title="نوبت‌های امروز"
                value={toPersianNumber(stats.todayAppointments)}
                icon={CalendarDays}
                sub="برنامه امروز"
                action={{ label: 'مشاهده', href: '/dashboard/appointments' }}
              />

              <StatCard
                title="موجودی کیف پول"
                value={`${toPersianNumber(formatPrice(balanceValue))} تومان`}
                icon={Wallet}
                sub="برداشت و تراکنش‌ها"
                action={{ label: 'مدیریت', href: '/dashboard/financial' }}
              />

              <StatCard
                title="امتیاز"
                value={
                  rating != null
                    ? `${toPersianNumber(rating.toFixed(1))} از ۵`
                    : '—'
                }
                icon={Star}
                sub="میانگین امتیاز سالن"
              />

              <StatCard
                title="مشتریان"
                value={toPersianNumber(stats.customers)}
                icon={Users}
                sub="مشتریان ثبت‌شده"
                action={{ label: 'باشگاه', href: '/dashboard/club' }}
              />
            </>
          )}
        </div>
      </FadeIn>
      <FadeIn delay={0.16}>
        <AppCard className="p-4 sm:p-5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-primary-2/60 text-primary flex items-center justify-center shrink-0">
                <CalendarDays size={17} />
              </div>
              <h2 className="text-sm font-black text-gray-900">
                نوبت‌های اخیر
              </h2>
            </div>

            <Link
              href="/dashboard/appointments"
              className="text-xs font-bold text-primary inline-flex items-center gap-0.5 hover:underline"
            >
              مشاهده همه
              <ArrowUpRight size={13} />
            </Link>
          </div>

          {isLoading ? (
            <div className="divide-y divide-gray-100">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 py-3.5">
                  <div className="w-10 h-10 rounded-full bg-gray-100" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-24 bg-gray-100 rounded" />
                    <div className="h-3 w-16 bg-gray-100 rounded" />
                  </div>
                  <div className="w-16 h-6 bg-gray-100 rounded-lg" />
                </div>
              ))}
            </div>
          ) : recentBookings.length > 0 ? (
            <ul className="divide-y divide-gray-100">
              {recentBookings.map(booking => {
                const status =
                  STATUS_STYLES[booking.status] ?? STATUS_STYLES.pending;

                return (
                  <li
                    key={booking.id}
                    className="flex items-center gap-3 py-3.5"
                  >
                    <div className="w-10 h-10 rounded-full bg-primary-2 text-primary flex items-center justify-center font-black shrink-0">
                      {booking.customer?.fullName?.charAt(0) || '؟'}
                    </div>

                    <div className="flex-1 min-w-0 text-right">
                      <p className="text-xs font-black text-gray-900 truncate">
                        {booking.customer?.fullName || 'مشتری'}
                      </p>
                      <p className="text-[11px] text-gray-400 font-medium mt-1 truncate">
                        {booking.service?.name || 'خدمت رزرو شده'}
                      </p>
                    </div>

                    <div className="text-left shrink-0">
                      <p className="text-xs font-black text-gray-900 dir-ltr">
                        {toPersianNumber(booking.time)}
                      </p>
                      <span
                        className={`inline-block mt-1.5 text-[10px] font-bold px-2 py-0.5 rounded-md border ${status.className}`}
                      >
                        {status.label}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="py-6 text-center space-y-1.5">
              <div className="w-11 h-11 rounded-2xl bg-primary-2/60 text-primary flex items-center justify-center mx-auto">
                <CalendarDays size={20} />
              </div>
              <p className="text-sm font-bold text-gray-800">
                هنوز نوبتی ثبت نشده است
              </p>
              <p className="text-xs text-gray-400">
                اولین نوبت سالن خود را با دکمه پایین ایجاد کنید.
              </p>
            </div>
          )}
        </AppCard>
      </FadeIn>

      {/* ================= اطلاعات سالن + دسترسی سریع ================= */}
      <div className="grid lg:grid-cols-2 gap-2 sm:gap-3 lg:gap-4">
        {/* اطلاعات سالن */}
        <FadeIn delay={0.24}>
          <AppCard className="h-full p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-primary-2/60 text-primary flex items-center justify-center shrink-0">
                  <Store size={17} />
                </div>
                <h2 className="text-sm font-black text-gray-900">
                  اطلاعات سالن
                </h2>
              </div>

              <Link
                href="/dashboard/profile"
                className="text-xs font-bold text-primary inline-flex items-center gap-1 hover:underline"
              >
                <Pencil size={13} />
                ویرایش
              </Link>
            </div>

            <div className="space-y-3.5">
              <InfoRow
                icon={<MapPin size={15} />}
                label="آدرس"
                value={profile?.address || 'ثبت نشده'}
              />
              <InfoRow
                icon={<Phone size={15} />}
                label="تلفن"
                value={profile?.phone || '—'}
                ltr={!!profile?.phone}
              />
              <InfoRow
                icon={<MapPin size={15} />}
                label="موقعیت"
                value={locationValue || 'ثبت نشده'}
              />
              <InfoRow
                icon={<Clock size={15} />}
                label="ساعت کاری"
                value={
                  profile?.workStartTime || profile?.workEndTime
                    ? toPersianNumber(
                        `${profile?.workStartTime || '--:--'} تا ${
                          profile?.workEndTime || '--:--'
                        }`,
                      )
                    : 'نامشخص'
                }
                ltr={!!(profile?.workStartTime || profile?.workEndTime)}
              />
            </div>
          </AppCard>
        </FadeIn>

        {/* دسترسی سریع */}
        <FadeIn delay={0.3}>
          <AppCard className="h-full p-4 sm:p-5">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-xl bg-primary-2/60 text-primary flex items-center justify-center shrink-0">
                <Plus size={17} />
              </div>
              <h2 className="text-sm font-black text-gray-900">دسترسی سریع</h2>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {QUICK_ACTIONS.map(item => {
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex flex-col items-center gap-2 rounded-2xl border border-gray-100 bg-gray-50/60 py-4 px-2 transition-all hover:border-primary/30 hover:bg-primary-2/40"
                  >
                    <div className="w-10 h-10 rounded-xl bg-primary-2 text-primary flex items-center justify-center">
                      <Icon size={19} />
                    </div>
                    <span className="text-[11px] font-bold text-gray-700 text-center leading-4">
                      {item.title}
                    </span>
                  </Link>
                );
              })}
            </div>
          </AppCard>
        </FadeIn>
      </div>

      {/* ================= ایجاد نوبت جدید ================= */}
      <FadeIn delay={0.36}>
        <Button
          size="lg"
          className="w-full h-12 rounded-2xl gap-2"
          onClick={() => setBookingOpen(true)}
        >
          <Plus size={18} />
          ایجاد نوبت جدید
        </Button>
      </FadeIn>

      <AppointmentBookingDialog
        open={bookingOpen}
        onOpenChange={setBookingOpen}
      />
    </DashboardShell>
  );
}

function InfoRow({
  icon,
  label,
  value,
  ltr,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  ltr?: boolean;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-8 h-8 rounded-lg bg-primary-2/60 text-primary flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="min-w-0 flex-1 text-right">
        <p className="text-[11px] text-gray-400 font-medium">{label}</p>
        <p
          className={`text-xs font-bold text-gray-800 mt-0.5 truncate ${
            ltr ? 'dir-ltr text-left' : ''
          }`}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

function toPersianNumber(value: number | string) {
  return String(value).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[+d]);
}
