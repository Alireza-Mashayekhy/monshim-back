'use client';

import { Clock } from 'lucide-react';
import persian from 'react-date-object/calendars/persian';
import persian_fa from 'react-date-object/locales/persian_fa';
import DatePicker, { DateObject } from 'react-multi-date-picker';
import TimePickerPlugin from 'react-multi-date-picker/plugins/time_picker';

import { cn } from '@/lib/utils';

interface TimePickerProps {
  value: string; // "HH:mm"
  onChange: (value: string) => void;
  label?: string;
  className?: string;
  disabled?: boolean;
  portalTarget?: HTMLElement | null; // برای جلوگیری از بریده شدن در اسکرول
}

const pad = (n: number) => String(n).padStart(2, '0');

// "HH:mm" -> DateObject
const toDateObject = (value: string) => {
  const [h, m] = (value || '00:00').split(':').map(Number);
  return new DateObject({ calendar: persian, locale: persian_fa }).set({
    hour: h || 0,
    minute: m || 0,
    second: 0,
  });
};

export function TimePicker({
  value,
  onChange,
  label,
  className,
  disabled,
  portalTarget,
}: TimePickerProps) {
  return (
    <div className={cn('space-y-1 flex-1 min-w-[110px]', className)}>
      {label && (
        <label className="block text-xs font-medium text-gray-700">
          {label}
        </label>
      )}
      <DatePicker
        disableDayPicker
        calendar={persian}
        locale={persian_fa}
        format="HH:mm"
        value={toDateObject(value)}
        onChange={(date: DateObject | null) => {
          if (date) onChange(`${pad(date.hour)}:${pad(date.minute)}`);
        }}
        plugins={[<TimePickerPlugin key="time" hideSeconds />]}
        disabled={disabled}
        portal={!!portalTarget}
        portalTarget={portalTarget ?? undefined}
        calendarPosition="bottom-center"
        render={<TimeButton disabled={disabled} />}
      />
    </div>
  );
}

// دکمه بجای input تا کیبورد موبایل باز نشه
function TimeButton({ value, openCalendar, disabled }: any) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={openCalendar}
      className="w-full h-10 px-3 border border-input rounded-lg bg-white text-sm flex items-center justify-between gap-2 hover:border-gray-400 transition disabled:opacity-50"
    >
      <span className="font-medium tabular-nums text-gray-800">{value}</span>
      <Clock className="w-4 h-4 text-gray-400" />
    </button>
  );
}
