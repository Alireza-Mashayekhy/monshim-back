// app/(dashboard)/work-hours/page.tsx
'use client';

import { Plus } from 'lucide-react';
import { useState } from 'react';

import DashboardShell from '@/components/dashboard/layout/dashboard-shell';
import { WorkHoursDrawer } from '@/components/dashboard/work-hours/work-hours-drawer';
import AppCard from '@/components/shared/app-card';
import FadeIn from '@/components/shared/fade-in';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useWorkHours } from '@/services/features/barber/hooks';

const DAYS = [
  'شنبه',
  'یکشنبه',
  'دوشنبه',
  'سه‌شنبه',
  'چهارشنبه',
  'پنجشنبه',
  'جمعه',
];

export default function WorkHoursPage() {
  const { data: workHours, isLoading } = useWorkHours();

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  if (isLoading) {
    return (
      <DashboardShell>
        <Skeleton className="h-10 w-48" />
        <div className="space-y-4 mt-4">
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
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-gray-800">
              تنظیم ساعات کاری
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              برای هر روز، بازه‌های کاری خود را مشخص کنید.
            </p>
          </div>
          <Button onClick={() => setIsDrawerOpen(true)} className="gap-2">
            <Plus size={16} /> ویرایش ساعات
          </Button>
        </div>
      </FadeIn>

      <FadeIn delay={0.1}>
        <div className="space-y-4 mt-4">
          {DAYS.map((day, idx) => (
            <AppCard key={idx}>
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-gray-800">{day}</h3>
                <span className="text-xs text-gray-400">
                  {workHours?.data?.filter(h => h.dayOfWeek === idx).length ||
                    0}{' '}
                  بازه
                </span>
              </div>
              <div className="mt-3 space-y-2">
                {workHours?.data
                  ?.filter(h => h.dayOfWeek === idx)
                  .map((slot, slotIndex) => (
                    <div
                      key={slotIndex}
                      className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-100"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-gray-600">
                          {slot.startTime}
                        </span>
                        <span className="text-gray-400">تا</span>
                        <span className="text-sm font-medium text-gray-600">
                          {slot.endTime}
                        </span>
                      </div>
                    </div>
                  ))}
                {workHours?.data?.filter(h => h.dayOfWeek === idx).length ===
                  0 && (
                  <p className="text-gray-400 text-center py-3 text-sm">
                    بازه‌ای تعریف نشده
                  </p>
                )}
              </div>
            </AppCard>
          ))}
        </div>
      </FadeIn>

      <WorkHoursDrawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen} />
    </DashboardShell>
  );
}
