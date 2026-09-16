// components/shared/time-picker-24.tsx
'use client';

import React, { useEffect, useRef, useState } from 'react';

import { cn } from '@/lib/utils';

import { TimePickerInput } from './time-picker-input';

interface TimePicker24Props {
  value: string; // فرمت "HH:mm"
  onChange: (value: string) => void;
  label?: string;
  className?: string;
  disabled?: boolean;
}

export function TimePicker24({
  value,
  onChange,
  label,
  className,
  disabled,
}: TimePicker24Props) {
  // ایجاد یک Date با زمان اولیه از value
  const [date, setDate] = useState<Date>(() => {
    const [h, m] = value.split(':').map(Number);
    const d = new Date();
    d.setHours(h || 0, m || 0, 0, 0);
    return d;
  });

  // همگام‌سازی date با value در صورت تغییر از بیرون
  useEffect(() => {
    const [h, m] = value.split(':').map(Number);
    const newDate = new Date(date);
    newDate.setHours(h || 0, m || 0, 0, 0);
    setDate(newDate);
  }, [value]);

  const handleDateChange = (newDate: Date | undefined) => {
    if (newDate) {
      setDate(newDate);
      const hours = String(newDate.getHours()).padStart(2, '0');
      const minutes = String(newDate.getMinutes()).padStart(2, '0');
      onChange(`${hours}:${minutes}`);
    }
  };

  const hourRef = useRef<HTMLInputElement>(null);
  const minuteRef = useRef<HTMLInputElement>(null);

  return (
    <div className={cn('space-y-1', className)}>
      {label && (
        <label className="block text-xs font-medium text-gray-700">
          {label}
        </label>
      )}
      <div className="flex items-center gap-1">
        <TimePickerInput
          picker="minutes"
          date={date}
          setDate={handleDateChange}
          ref={minuteRef}
          onLeftFocus={() => hourRef.current?.focus()}
          disabled={disabled}
          className="w-14 text-center font-mono text-base tabular-nums"
        />
        <span className="text-gray-400 text-sm font-medium">:</span>

        <TimePickerInput
          picker="hours"
          date={date}
          setDate={handleDateChange}
          ref={hourRef}
          onRightFocus={() => minuteRef.current?.focus()}
          disabled={disabled}
          className="w-14 text-center font-mono text-base tabular-nums"
        />
      </div>
    </div>
  );
}
