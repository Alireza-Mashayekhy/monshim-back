// app/(dashboard)/work-hours/page.tsx
'use client';

import { Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';

import DashboardShell from '@/components/dashboard/layout/dashboard-shell';
import { TimePicker24 } from '@/components/form/time-picker-24';
import AppCard from '@/components/shared/app-card';
import FadeIn from '@/components/shared/fade-in';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useUpdateWorkHours,
  useWorkHours,
} from '@/services/features/barber/hooks';
import { WorkHours } from '@/services/features/barber/types';

const DAYS = [
  'شنبه',
  'یکشنبه',
  'دوشنبه',
  'سه‌شنبه',
  'چهارشنبه',
  'پنج‌شنبه',
  'جمعه',
];

export default function WorkHoursPage() {
  const { data: workHours, isLoading } = useWorkHours();
  const updateMutation = useUpdateWorkHours();

  const [hoursByDay, setHoursByDay] = useState<{
    [key: number]: { startTime: string; endTime: string }[];
  }>({});

  useEffect(() => {
    if (workHours?.data) {
      const grouped: any = {};
      workHours.data.forEach(h => {
        if (!grouped[h.dayOfWeek]) grouped[h.dayOfWeek] = [];
        grouped[h.dayOfWeek].push({
          startTime: h.startTime,
          endTime: h.endTime,
        });
      });
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHoursByDay(grouped);
    } else {
      const empty: any = {};
      DAYS.forEach((_, i) => {
        empty[i] = [];
      });
      setHoursByDay(empty);
    }
  }, [workHours]);

  const addSlot = (day: number) => {
    setHoursByDay(prev => ({
      ...prev,
      [day]: [...(prev[day] || []), { startTime: '09:00', endTime: '13:00' }],
    }));
  };

  const removeSlot = (day: number, index: number) => {
    setHoursByDay(prev => ({
      ...prev,
      [day]: prev[day].filter((_, i) => i !== index),
    }));
  };

  const updateSlot = (
    day: number,
    index: number,
    field: 'startTime' | 'endTime',
    value: string,
  ) => {
    setHoursByDay(prev => ({
      ...prev,
      [day]: prev[day].map((slot, i) =>
        i === index ? { ...slot, [field]: value } : slot,
      ),
    }));
  };

  const handleSave = () => {
    const payload: { hours: WorkHours[] } = {
      hours: Object.entries(hoursByDay).flatMap(([day, slots]) =>
        slots.map(s => ({
          dayOfWeek: parseInt(day),
          startTime: s.startTime,
          endTime: s.endTime,
        })),
      ),
    };
    updateMutation.mutate(payload);
  };

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
          <h2 className="text-xl font-bold text-gray-800">تنظیم ساعات کاری</h2>
          <Button onClick={handleSave} disabled={updateMutation.isPending}>
            {updateMutation.isPending ? 'در حال ذخیره...' : 'ذخیره تغییرات'}
          </Button>
        </div>
        <p className="text-sm text-gray-500 mt-1">
          برای هر روز، بازه‌های کاری خود را مشخص کنید.
        </p>
      </FadeIn>

      <FadeIn delay={0.1}>
        <div className="space-y-4 mt-4">
          {DAYS.map((day, idx) => (
            <AppCard key={idx}>
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-bold text-gray-800">{day}</h3>
                <span className="text-xs text-gray-400">
                  {(hoursByDay[idx] || []).length} بازه
                </span>
              </div>
              {(hoursByDay[idx] || []).map((slot, slotIndex) => (
                <div
                  key={slotIndex}
                  className="flex flex-wrap items-end gap-3 mb-2 p-2 rounded-lg bg-gray-50 border border-gray-100"
                >
                  <TimePicker24
                    label="شروع"
                    value={slot.startTime}
                    onChange={val =>
                      updateSlot(idx, slotIndex, 'startTime', val)
                    }
                  />
                  <span className="text-gray-400 text-sm mb-1">تا</span>
                  <TimePicker24
                    label="پایان"
                    value={slot.endTime}
                    onChange={val => updateSlot(idx, slotIndex, 'endTime', val)}
                  />
                  <button
                    type="button"
                    onClick={() => removeSlot(idx, slotIndex)}
                    className="mt-3 text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => addSlot(idx)}
                className="mt-2"
              >
                <Plus size={14} className="ml-1" /> افزودن بازه
              </Button>
            </AppCard>
          ))}
        </div>
      </FadeIn>
    </DashboardShell>
  );
}
