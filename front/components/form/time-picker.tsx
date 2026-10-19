'use client';

import { Clock } from 'lucide-react';
import { useId } from 'react';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toFa } from '@/lib/jalali';
import { cn } from '@/lib/utils';

interface TimePickerProps {
  value: string; // "HH:mm"
  onChange: (value: string) => void;
  label?: string;
  className?: string;
  disabled?: boolean;
  includeEndOfDay?: boolean;
}

const HALF_HOUR_TIMES = Array.from({ length: 48 }, (_, index) => {
  const hour = String(Math.floor(index / 2)).padStart(2, '0');
  const minute = index % 2 === 0 ? '00' : '30';

  return `${hour}:${minute}`;
});
const HALF_HOUR_TIME_SET = new Set(HALF_HOUR_TIMES);

function toEnglishDigits(value: string) {
  return value.replace(/[۰-۹٠-٩]/g, digit => {
    const code = digit.charCodeAt(0);
    const zeroCode = code >= 0x06f0 ? 0x06f0 : 0x0660;
    return String(code - zeroCode);
  });
}

export function normalizeTime(value: string) {
  const normalized = toEnglishDigits(value).trim();
  const match = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(normalized);

  return match ? `${match[1].padStart(2, '0')}:${match[2]}` : normalized;
}

export function parseTimeValue(value: string, includeEndOfDay = false) {
  const normalized = toEnglishDigits(value).trim();
  const match = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(normalized);
  if (!match) return null;

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (minute > 59) return null;
  if (hour === 24 && minute === 0 && includeEndOfDay) return '24:00';
  if (hour > 23) return null;

  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

export function TimePicker({
  value,
  onChange,
  label,
  className,
  disabled,
  includeEndOfDay = false,
}: TimePickerProps) {
  const id = useId();
  const normalizedValue = normalizeTime(value);
  const isPresetValue =
    HALF_HOUR_TIME_SET.has(normalizedValue) ||
    (includeEndOfDay && normalizedValue === '24:00');
  const hasLegacyValue = Boolean(normalizedValue) && !isPresetValue;

  return (
    <div className={cn('min-w-0 flex-1 space-y-1', className)}>
      {label && (
        <label htmlFor={id} className="block text-xs font-medium text-gray-700">
          {label}
        </label>
      )}
      <Select
        value={normalizedValue || undefined}
        onValueChange={onChange}
        disabled={disabled}
      >
        <SelectTrigger
          id={id}
          aria-label={label ?? 'انتخاب ساعت'}
          className="h-10 w-full min-w-0 bg-white px-2"
        >
          <SelectValue placeholder="انتخاب ساعت">
            {hasLegacyValue ? (
              <span dir="ltr" className="tabular-nums">
                {toFa(normalizedValue)}
              </span>
            ) : undefined}
          </SelectValue>
          <Clock className="size-4 shrink-0 text-gray-400" />
        </SelectTrigger>
        <SelectContent className="z-[60]">
          {HALF_HOUR_TIMES.map(time => (
            <SelectItem key={time} value={time}>
              <span dir="ltr" className="tabular-nums">
                {toFa(time)}
              </span>
            </SelectItem>
          ))}
          {includeEndOfDay && (
            <SelectItem value="24:00">
              <span dir="ltr" className="tabular-nums">
                {toFa('24:00')}
              </span>
            </SelectItem>
          )}
        </SelectContent>
      </Select>
    </div>
  );
}
