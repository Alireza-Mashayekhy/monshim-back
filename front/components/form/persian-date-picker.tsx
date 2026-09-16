// components/form/persian-date-picker.tsx
'use client';

import { CalendarIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import persian from 'react-date-object/calendars/persian';
import persian_fa from 'react-date-object/locales/persian_fa';
import { useFormContext, useWatch } from 'react-hook-form';
import DatePicker, { DateObject } from 'react-multi-date-picker';

import { cn } from '@/lib/utils';

interface PersianDatePickerProps {
  name: string;
  label?: string;
  placeholder?: string;
  required?: boolean;
  className?: string;
}

export function PersianDatePicker({
  name,
  label,
  placeholder = 'انتخاب تاریخ',
  required = false,
  className,
}: PersianDatePickerProps) {
  const { setValue, control } = useFormContext();
  const formValue = useWatch({ name, control });
  const [dateValue, setDateValue] = useState<any>(null);

  useEffect(() => {
    if (formValue && typeof formValue === 'string') {
      const date = new DateObject({
        calendar: persian,
        locale: persian_fa,
        date: formValue,
      });
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDateValue(date.format());
      return;
    }
    setDateValue(null);
  }, [formValue]);

  const handleDateChange = (date: any) => {
    if (!date) {
      setValue(name, '');
      return;
    }
    // تبدیل به فرمت YYYY/MM/DD
    const year = date.year;
    const month = String(date.month).padStart(2, '0');
    const day = String(date.day).padStart(2, '0');
    setValue(name, `${year}/${month}/${day}`);
  };

  return (
    <div className={cn('space-y-2 w-full persian-date-picker', className)}>
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <DatePicker
        calendar={persian}
        locale={persian_fa}
        calendarPosition="bottom-right"
        onChange={handleDateChange}
        placeholder={placeholder}
        className="w-full"
        inputClass={cn(
          'w-full h-8 px-3 border border-gray-300 rounded-none text-right outline-none bg-transparent transition',
          'hover:border-gray-400',
        )}
        style={{ width: '100%' }}
        render={<CustomInput />}
        value={dateValue}
      />
    </div>
  );
}

// کامپوننت ورودی سفارشی (اختیاری)
function CustomInput({ value, placeholder, openCalendar }: any) {
  return (
    <button
      type="button"
      className="w-full h-8 border border-input px-2.5 py-1 text-sm rounded-lg text-right outline-none bg-transparent transition hover:border-gray-400 flex items-center gap-2"
      onClick={openCalendar}
    >
      <CalendarIcon className="w-4 h-4 mb-0.5 text-gray-400" />
      <span className={cn(value ? 'text-gray-900' : 'text-gray-400')}>
        {value || placeholder || 'انتخاب تاریخ'}
      </span>
    </button>
  );
}

PersianDatePicker.displayName = 'PersianDatePicker';
