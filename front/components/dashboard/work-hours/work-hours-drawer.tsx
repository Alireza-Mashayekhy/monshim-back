'use client';

import { Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
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

interface WorkHoursDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WorkHoursDrawer({ open, onOpenChange }: WorkHoursDrawerProps) {
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
          startTime: normalizeTime(h.startTime),
          endTime: normalizeTime(h.endTime),
        });
      });
      setHoursByDay(grouped);
    } else {
      const empty: any = {};
      DAYS.forEach((_, i) => {
        empty[i] = [];
      });
      setHoursByDay(empty);
    }
  }, [workHours, open]);

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

    const payload: { hours: WorkHours[] } = {
      hours: parsedHours.filter((slot): slot is WorkHours => slot !== null),
    };
    updateMutation.mutate(payload, {
      onSuccess: () => onOpenChange(false),
    });
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  const isLoadingData = isLoading || updateMutation.isPending;

  return (
    <Drawer open={open} onOpenChange={handleClose}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle className="text-center">تنظیم ساعات کاری</DrawerTitle>
          <DrawerDescription className="text-center text-sm">
            برای هر روز، بازه‌های کاری را فقط از فهرست ساعت‌های نیم‌ساعته انتخاب
            کنید (از ۰۰:۰۰ تا ۲۴:۰۰).
          </DrawerDescription>
        </DrawerHeader>

        <div className="px-4 pb-4 space-y-4">
          {isLoading ? (
            <div className="space-y-3">
              {DAYS.map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : (
            DAYS.map((day, idx) => (
              <div key={idx} className="space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-gray-800">{day}</h3>
                  <span className="text-xs text-gray-400">
                    {(hoursByDay[idx] || []).length} بازه
                  </span>
                </div>
                {(hoursByDay[idx] || []).map((slot, slotIndex) => (
                  <div
                    key={slotIndex}
                    className="flex min-w-0 items-end gap-1.5 rounded-lg border border-gray-100 bg-gray-50 p-2"
                  >
                    <TimePicker
                      label="شروع"
                      value={slot.startTime}
                      onChange={val =>
                        updateSlot(idx, slotIndex, 'startTime', val)
                      }
                    />
                    <span className="mb-2.5 shrink-0 text-sm text-gray-400">
                      تا
                    </span>
                    <TimePicker
                      label="پایان"
                      includeEndOfDay
                      value={slot.endTime}
                      onChange={val =>
                        updateSlot(idx, slotIndex, 'endTime', val)
                      }
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
            ))
          )}

          <Button
            onClick={handleSave}
            disabled={isLoadingData}
            className="w-full"
          >
            {isLoadingData ? 'در حال ذخیره...' : 'ذخیره تغییرات'}
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
