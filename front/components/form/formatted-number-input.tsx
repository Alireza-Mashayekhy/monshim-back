// components/form/formatted-number-input.tsx
'use client';

import { useEffect, useState } from 'react';

import { cn } from '@/lib/utils';

interface FormattedNumberInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange' | 'value'> {
  value: string | number;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

/**
 * کامپوننت ورودی عددی با جداکننده سه‌رقمی (کاما)
 * برای استفاده در فرم‌هایی که از react-hook-form استفاده نمی‌کنند
 */
export default function FormattedNumberInput({
  value,
  onChange,
  placeholder,
  className,
  ...rest
}: FormattedNumberInputProps) {
  const [displayValue, setDisplayValue] = useState('');

  // فرمت‌کننده عدد با کاما
  const formatNumber = (val: string | number | undefined | null): string => {
    if (val === undefined || val === null || val === '') return '';
    const strValue = typeof val === 'string' ? val.replace(/,/g, '') : String(val);
    const num = parseFloat(strValue);
    if (isNaN(num)) return '';
    return num.toLocaleString('en-US');
  };

  // همگام‌سازی با مقدار بیرونی
  useEffect(() => {
    setDisplayValue(formatNumber(value));
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawInput = e.target.value;
    let raw = rawInput.replace(/,/g, '').replace(/[^0-9]/g, '');

    if (raw === '') {
      setDisplayValue('');
      onChange('');
      return;
    }

    const numValue = parseFloat(raw);
    if (isNaN(numValue)) {
      setDisplayValue('');
      onChange('');
      return;
    }

    onChange(raw);
    setDisplayValue(formatNumber(raw));
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      className={cn(
        'w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900',
        'focus:bg-white focus:border-primary-500 outline-none transition-colors',
        'dir-ltr text-right',
        className,
      )}
      value={displayValue}
      onChange={handleChange}
      placeholder={placeholder}
      autoComplete="off"
      {...rest}
    />
  );
}
