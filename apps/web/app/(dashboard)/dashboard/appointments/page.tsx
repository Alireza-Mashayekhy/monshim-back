// app/(dashboard)/appointments/page.tsx
'use client';

import { CalendarPlus } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';

import AppointmentFilter, {
  AppointmentFilterKey,
} from '@/components/dashboard/appointments/appointment-filter';
import AppointmentList from '@/components/dashboard/appointments/appointment-list';
import AppointmentSummary from '@/components/dashboard/appointments/appointment-summary';
import { ManualBookingDrawer } from '@/components/dashboard/appointments/manual-booking-drawer';
import DashboardShell from '@/components/dashboard/layout/dashboard-shell';
import FadeIn from '@/components/shared/fade-in';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useDebounce } from '@/hooks/use-debounce';
import { useBarberBookings } from '@/services/features/booking/hooks';

const FILTER_KEYS: AppointmentFilterKey[] = [
  'pending',
  'today',
  'tomorrow',
  'week',
  'month',
  'all',
];

function AppointmentsContent() {
  /**
   * میان‌بر کارت «در انتظار تایید»: /dashboard/appointments?filter=pending
   * مقدار اولیه از query خوانده می‌شود تا بعد از کلیک، مستقیم روی همان تب باز شود.
   */
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const requested = searchParams.get('filter') as AppointmentFilterKey | null;

  /**
   * تب فعال از URL خوانده می‌شود، نه از state محلی.
   *
   * چرا: کارت خلاصهٔ «در انتظار تایید» یک Link به همین صفحه با
   * `?filter=pending` است. وقتی کاربر از قبل داخل همین صفحه باشد، state
   * اولیه دوباره ساخته نمی‌شد و کلیک کارت هیچ اثری نداشت. حالا URL مرجع
   * واحد است و هر تغییر تب هم در URL منعکس می‌شود.
   */
  const filter: AppointmentFilterKey =
    requested && FILTER_KEYS.includes(requested) ? requested : 'today';

  const setFilter = (next: AppointmentFilterKey) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('filter', next);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const [search, setSearch] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);

  /**
   * تعداد درخواست‌های باز برای نشان‌دادن روی تب.
   * همان query خلاصهٔ بالای صفحه است؛ React Query آن را دوباره از شبکه
   * نمی‌گیرد و فقط نتیجهٔ کش‌شده را به اشتراک می‌گذارد.
   */
  const { data: pendingData } = useBarberBookings({
    status: 'pending',
    limit: 100,
  });
  const pendingCount = pendingData?.data?.length ?? 0;

  const debouncedSearch = useDebounce(search, 400);

  return (
    <DashboardShell>
      <FadeIn delay={0.05}>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-black text-gray-900">نوبت‌ها</h2>

          <Button
            onClick={() => setDrawerOpen(true)}
            className="h-10 gap-2 rounded-xl text-xs font-black"
          >
            <CalendarPlus size={16} />
            ثبت نوبت دستی
          </Button>
        </div>
      </FadeIn>

      <FadeIn delay={0.1}>
        <AppointmentSummary />
      </FadeIn>

      <FadeIn delay={0.15}>
        <div className="space-y-2.5">
          <AppointmentFilter
            value={filter}
            onChange={setFilter}
            pendingCount={pendingCount}
          />

          <div className="relative">
            <svg
              className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>

            <Input
              placeholder="جستجوی نام یا شماره مشتری..."
              className="h-10 rounded-xl bg-white pr-10 text-xs"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>{' '}
      </FadeIn>

      <FadeIn delay={0.2}>
        <AppointmentList filter={filter} search={debouncedSearch} />
      </FadeIn>

      <ManualBookingDrawer open={drawerOpen} onOpenChange={setDrawerOpen} />
    </DashboardShell>
  );
}

export default function AppointmentsPage() {
  return (
    <Suspense fallback={null}>
      <AppointmentsContent />
    </Suspense>
  );
}
