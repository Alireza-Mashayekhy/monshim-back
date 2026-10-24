'use client';

import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import {
  normalizeTime,
  parseTimeValue,
  TimePicker,
} from '@/components/form/time-picker';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Skeleton } from '@/components/ui/skeleton';
import { toFa } from '@/lib/jalali';
import {
  useMyBarberProfile,
  useUpdateWorkHours,
  useWorkHours,
} from '@/services/features/barber/hooks';
import {
  SlotIntervalMinutes,
  WorkHours,
} from '@/services/features/barber/types';

const DAYS = [
  'شنبه',
  'یکشنبه',
  'دوشنبه',
  'سه‌شنبه',
  'چهارشنبه',
  'پنج‌شنبه',
  'جمعه',
];

type HoursByDay = Record<number, { startTime: string; endTime: string }[]>;

function normalizeInterval(value?: number | null): SlotIntervalMinutes {
  if (value === 15 || value === 30 || value === 45 || value === 60) {
    return value;
  }
  return 30;
}

function buildHoursByDay(items?: WorkHours[]): HoursByDay {
  const grouped: HoursByDay = {};
  DAYS.forEach((_, idx) => {
    grouped[idx] = [];
  });
  (items ?? []).forEach(h => {
    if (!grouped[h.dayOfWeek]) grouped[h.dayOfWeek] = [];
    grouped[h.dayOfWeek].push({
      startTime: normalizeTime(h.startTime),
      endTime: normalizeTime(h.endTime),
    });
  });
  return grouped;
}

interface WorkHoursDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function WorkHoursDrawerForm({
  initialHours,
  initialInterval,
  onSuccess,
}: {
  initialHours?: WorkHours[];
  initialInterval: SlotIntervalMinutes;
  onSuccess: () => void;
}) {
  const updateMutation = useUpdateWorkHours();

  const [hoursByDay, setHoursByDay] = useState<HoursByDay>(() =>
    buildHoursByDay(initialHours),
  );

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
    const parsedHours = Object.entries(hoursByDay).flatMap(([day, slots]) =>
      slots.map(slot => {
        const startTime = parseTimeValue(slot.startTime);
        const endTime = parseTimeValue(slot.endTime, true);

        if (!startTime || !endTime || startTime >= endTime) return null;

        return {
          dayOfWeek: Number(day),
          startTime,
          endTime,
        };
      }),
    );

    if (parsedHours.some(slot => slot === null)) {
      toast.error(
        'ساعت معتبر وارد کنید و مطمئن شوید ساعت پایان بعد از ساعت شروع است.',
      );
      return;
    }

    // فاصله زمانی نوبت‌ها فقط از کارت اصلی صفحه تنظیم می‌شود و این دراور
    // صرفاً بازه‌های حضور روزانه را ذخیره می‌کند.
    const payload: { hours: WorkHours[] } = {
      hours: parsedHours.filter((slot): slot is WorkHours => slot !== null),
    };
    updateMutation.mutate(payload, {
      onSuccess,
    });
  };

  const pickerStep: 15 | 30 =
    initialInterval === 15 || initialInterval === 45 ? 15 : 30;

  return (
    <div className="space-y-4 px-4 pb-4">
      {DAYS.map((day, idx) => (
        <div key={idx} className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-gray-800">{day}</h3>
            <span className="text-xs text-gray-400">
              {toFa((hoursByDay[idx] || []).length)} بازه
            </span>
          </div>
          {(hoursByDay[idx] || []).map((slot, slotIndex) => (
            <div
              key={slotIndex}
              className="flex min-w-0 items-end gap-1.5 rounded-lg border border-gray-100 bg-gray-50 p-2"
            >
              <TimePicker
                label="شروع"
                stepMinutes={pickerStep}
                value={slot.startTime}
                onChange={val => updateSlot(idx, slotIndex, 'startTime', val)}
              />
              <span className="mb-2.5 shrink-0 text-sm text-gray-400">تا</span>
              <TimePicker
                label="پایان"
                includeEndOfDay
                stepMinutes={pickerStep}
                value={slot.endTime}
                onChange={val => updateSlot(idx, slotIndex, 'endTime', val)}
              />
              <button
                type="button"
                onClick={() => removeSlot(idx, slotIndex)}
                className="shrink-0 rounded-lg p-2 text-red-500 transition-colors hover:bg-red-50"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() => addSlot(idx)}
            className="w-full"
          >
            <Plus size={14} className="ml-1" /> افزودن بازه
          </Button>
        </div>
      ))}

      <Button
        onClick={handleSave}
        disabled={updateMutation.isPending}
        className="w-full"
      >
        {updateMutation.isPending ? 'در حال ذخیره...' : 'ذخیره تغییرات'}
      </Button>
    </div>
  );
}

export function WorkHoursDrawer({ open, onOpenChange }: WorkHoursDrawerProps) {
  const { data: workHours, isLoading: workHoursLoading } = useWorkHours();
  const { data: profileData, isLoading: profileLoading } = useMyBarberProfile();

  const isLoading = workHoursLoading || profileLoading;
  const initialInterval = normalizeInterval(
    profileData?.data?.slotIntervalMinutes,
  );
  const formKey = (workHours?.data ?? [])
    .map(h => `${h.dayOfWeek}:${h.startTime}-${h.endTime}`)
    .join('|');

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle className="text-center">
            تنظیم ساعات و بازه‌های رزرو
          </DrawerTitle>
          <DrawerDescription className="text-center text-sm">
            بازه‌های حضور روزانه سالن را مشخص کنید (از ۰۰:۰۰ تا ۲۴:۰۰).
          </DrawerDescription>
        </DrawerHeader>

        {open && isLoading ? (
          <div className="space-y-3 px-4 pb-4">
            {DAYS.map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : (
          open && (
            <WorkHoursDrawerForm
              key={formKey}
              initialHours={workHours?.data}
              initialInterval={initialInterval}
              onSuccess={() => onOpenChange(false)}
            />
          )
        )}
      </DrawerContent>
    </Drawer>
  );
}
