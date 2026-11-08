// app/(dashboard)/dashboard/work-hours/page.tsx
'use client';

import { Check, Clock, Loader2, Plus, Timer } from 'lucide-react';
import { useState } from 'react';

import DashboardShell from '@/components/dashboard/layout/dashboard-shell';
import { WorkHoursDrawer } from '@/components/dashboard/work-hours/work-hours-drawer';
import AppCard from '@/components/shared/app-card';
import FadeIn from '@/components/shared/fade-in';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toFa } from '@/lib/jalali';
import { cn } from '@/lib/utils';
import {
  useMyBarberProfile,
  useUpdateSlotInterval,
  useWorkHours,
} from '@/services/features/barber/hooks';
import type { SlotIntervalMinutes } from '@/services/features/barber/types';

const DAYS = [
  'شنبه',
  'یکشنبه',
  'دوشنبه',
  'سه‌شنبه',
  'چهارشنبه',
  'پنجشنبه',
  'جمعه',
];

export const SLOT_INTERVAL_OPTIONS: {
  value: SlotIntervalMinutes;
  label: string;
  sample: string;
}[] = [
  {
    value: 15,
    label: '۱۵ دقیقه',
    sample: '۰۹:۰۰، ۰۹:۱۵، ۰۹:۳۰',
  },
  {
    value: 30,
    label: '۳۰ دقیقه',
    sample: '۰۹:۰۰، ۰۹:۳۰، ۱۰:۰۰',
  },
  {
    value: 45,
    label: '۴۵ دقیقه',
    sample: '۰۹:۰۰، ۰۹:۴۵، ۱۰:۳۰',
  },
  {
    value: 60,
    label: '۱ ساعت',
    sample: '۰۹:۰۰، ۱۰:۰۰، ۱۱:۰۰',
  },
];

function normalizeInterval(value?: number | null): SlotIntervalMinutes {
  if (value === 15 || value === 30 || value === 45 || value === 60) {
    return value;
  }
  return 30;
}

export default function WorkHoursPage() {
  const { data: workHours, isLoading: workHoursLoading } = useWorkHours();
  const { data: profileData, isLoading: profileLoading } = useMyBarberProfile();
  const updateIntervalMutation = useUpdateSlotInterval();

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const isLoading = workHoursLoading || profileLoading;
  const currentInterval = normalizeInterval(
    profileData?.data?.slotIntervalMinutes,
  );
  const currentOption =
    SLOT_INTERVAL_OPTIONS.find(opt => opt.value === currentInterval) ??
    SLOT_INTERVAL_OPTIONS[1];

  const handleSelectInterval = (nextInterval: SlotIntervalMinutes) => {
    if (nextInterval === currentInterval || updateIntervalMutation.isPending) {
      return;
    }
    updateIntervalMutation.mutate(nextInterval);
  };

  if (isLoading) {
    return (
      <DashboardShell>
        <Skeleton className="h-10 w-56" />
        <Skeleton className="mt-4 h-44 w-full rounded-2xl" />
        <div className="mt-4 space-y-4">
          {DAYS.map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <FadeIn>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-gray-800">
              ساعات و بازه‌های رزرو
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              ساعات پذیرش روزانه و فاصله زمانی بین ساعت‌های قابل رزرو را تنظیم
              کنید.
            </p>
          </div>
          <Button onClick={() => setIsDrawerOpen(true)} className="gap-2">
            <Plus size={16} /> ویرایش ساعات رزرو
          </Button>
        </div>
      </FadeIn>

      {/* تنظیم فاصله زمانی اسلات‌های قابل رزرو */}
      <FadeIn delay={0.05}>
        <AppCard className="mt-4 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="flex items-start gap-2.5">
              <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary-2 text-primary">
                <Timer size={18} />
              </div>
              <div>
                <h3 className="text-sm font-black text-gray-900 sm:text-base">
                  فاصله زمانی نوبت‌های قابل رزرو
                </h3>
                <p className="mt-1 text-xs leading-6 text-gray-500">
                  مشخص کنید هنگام رزرو نوبت توسط مشتری، ساعت‌های خالی با چه
                  فاصله‌ای نمایش داده شوند.
                </p>
              </div>
            </div>

            <span className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary-2 px-3 py-1 text-xs font-bold text-primary">
              <Clock size={13} />
              فعال: {currentOption.label}
            </span>
          </div>

          <div
            role="radiogroup"
            aria-label="انتخاب فاصله زمانی نوبت‌ها"
            className="grid grid-cols-2 gap-2.5 sm:grid-cols-4"
          >
            {SLOT_INTERVAL_OPTIONS.map(option => {
              const selected = currentInterval === option.value;
              const isSavingThis =
                updateIntervalMutation.isPending &&
                updateIntervalMutation.variables === option.value;

              return (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  disabled={updateIntervalMutation.isPending}
                  onClick={() => handleSelectInterval(option.value)}
                  className={cn(
                    'relative flex flex-col items-start gap-1.5 rounded-2xl border-2 p-3.5 text-right transition-all disabled:opacity-65',
                    selected
                      ? 'border-primary bg-primary-3 shadow-xs'
                      : 'border-gray-100 bg-gray-50/70 hover:border-primary/35 hover:bg-white',
                  )}
                >
                  <div className="flex w-full items-center justify-between gap-2">
                    <span
                      className={cn(
                        'text-sm font-black sm:text-base',
                        selected ? 'text-primary' : 'text-gray-800',
                      )}
                    >
                      {option.label}
                    </span>

                    <span
                      className={cn(
                        'flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors',
                        selected
                          ? 'border-primary bg-primary text-white'
                          : 'border-gray-300 bg-white text-transparent',
                      )}
                    >
                      {isSavingThis ? (
                        <Loader2
                          size={12}
                          className="animate-spin text-primary"
                        />
                      ) : (
                        <Check size={12} strokeWidth={3} />
                      )}
                    </span>
                  </div>

                  <span className="text-[11px] text-gray-500">
                    نمونه: {option.sample}
                  </span>
                </button>
              );
            })}
          </div>
        </AppCard>
      </FadeIn>

      <FadeIn delay={0.1}>
        <div className="mt-4 space-y-4">
          {DAYS.map((day, idx) => {
            const daySlots =
              workHours?.data?.filter(h => h.dayOfWeek === idx) ?? [];
            return (
              <AppCard key={idx}>
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-gray-800">{day}</h3>
                  <span className="text-xs text-gray-400">
                    {toFa(daySlots.length)} بازه
                  </span>
                </div>
                <div className="mt-3 space-y-2">
                  {daySlots.map((slot, slotIndex) => (
                    <div
                      key={slotIndex}
                      className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 p-3"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          dir="ltr"
                          className="text-sm font-medium text-gray-600 tabular-nums"
                        >
                          {toFa(slot.startTime.slice(0, 5))}
                        </span>
                        <span className="text-gray-400">تا</span>
                        <span
                          dir="ltr"
                          className="text-sm font-medium text-gray-600 tabular-nums"
                        >
                          {toFa(slot.endTime.slice(0, 5))}
                        </span>
                      </div>
                    </div>
                  ))}
                  {daySlots.length === 0 && (
                    <p className="py-3 text-center text-sm text-gray-400">
                      بازه‌ای تعریف نشده
                    </p>
                  )}
                </div>
              </AppCard>
            );
          })}
        </div>
      </FadeIn>

      <WorkHoursDrawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen} />
    </DashboardShell>
  );
}
