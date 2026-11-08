// components/form/formatted-number-input.tsx
'use client';

import { sanitizeIntegerInput, stripNumericSeparators } from '@/lib/digits';
import { cn } from '@/lib/utils';

interface FormattedNumberInputProps
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    'type' | 'onChange' | 'value'
  > {
  value: string | number;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

// فرمت‌کننده عدد با کاما و پشتیبانی از ارقام فارسی/عربی
function formatNumber(val: string | number | undefined | null): string {
  if (val === undefined || val === null || val === '') return '';
  const strValue =
    typeof val === 'number' ? String(val) : stripNumericSeparators(val);
  const num = parseFloat(strValue);
  if (isNaN(num)) return '';
  return Math.trunc(num).toLocaleString('en-US');
}

/**
 * کامپوننت ورودی عددی با جداکننده سه‌رقمی (کاما) و پذیرش اعداد فارسی/عربی
 * برای استفاده در فرم‌هایی که از react-hook-form استفاده نمی‌کنند
 */
export default function FormattedNumberInput({
  value,
  onChange,
  placeholder,
  className,
  ...rest
}: FormattedNumberInputProps) {
  const displayValue = formatNumber(value);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = sanitizeIntegerInput(e.target.value);

    if (raw === '') {
      onChange('');
      return;
    }

    const numValue = parseFloat(raw);
    if (isNaN(numValue)) {
      onChange('');
      return;
    }

    onChange(String(Math.trunc(numValue)));
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
