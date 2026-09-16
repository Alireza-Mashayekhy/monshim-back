// components/form/rhf-number-input.tsx
'use client';

import { useEffect, useState } from 'react';
import { Controller, useFormContext } from 'react-hook-form';

import { Input } from '@/components/ui/input';

import { Field, FieldError, FieldLabel } from '../ui/field';

export type RHFNumberInputProps = Omit<
  React.ComponentProps<'input'>,
  'type' | 'onChange' | 'value'
> & {
  name: string;
  label?: string;
  isRequired?: boolean;
  outputType?: 'number' | 'string'; // نوع خروجی (پیش‌فرض: number)
  min?: number;
  max?: number;
  allowDecimal?: boolean; // آیا اعشار مجاز است؟
  decimalPlaces?: number; // تعداد ارقام اعشار (پیش‌فرض: 0)
};

export default function RHFNumberInput({
  outputType = 'number',
  min,
  max,
  allowDecimal = false,
  decimalPlaces = 0,
  ...other
}: RHFNumberInputProps) {
  const { control } = useFormContext();

  return (
    <Controller
      name={other.name}
      control={control}
      render={({ field, fieldState }) => {
        // eslint-disable-next-line react-hooks/rules-of-hooks
        const [displayValue, setDisplayValue] = useState('');

        // تابع فرمت‌کننده عدد با کاما
        const formatNumber = (
          value: string | number | undefined | null,
        ): string => {
          if (value === undefined || value === null || value === '') return '';
          const strValue =
            typeof value === 'string' ? value.replace(/,/g, '') : String(value);
          const num = parseFloat(strValue);
          if (isNaN(num)) return '';
          return num.toLocaleString('en-US', {
            minimumFractionDigits: allowDecimal ? decimalPlaces : 0,
            maximumFractionDigits: allowDecimal ? decimalPlaces : 0,
          });
        };

        // تابع تبدیل رشته به عدد خالص (حذف کاما و کاراکترهای غیرعددی)
        const getRawNumber = (input: string): string => {
          // حذف کاماها و هر چیزی غیر از اعداد و نقطه (برای اعشار)
          let raw = input.replace(/,/g, '');
          if (!allowDecimal) {
            raw = raw.replace(/[^0-9]/g, '');
          } else {
            // فقط یک نقطه مجاز است
            const parts = raw.split('.');
            if (parts.length > 2) {
              raw = parts[0] + '.' + parts.slice(1).join('');
            }
            // محدود کردن تعداد ارقام اعشار
            if (decimalPlaces > 0 && raw.includes('.')) {
              const [intPart, decPart] = raw.split('.');
              raw = intPart + '.' + decPart.slice(0, decimalPlaces);
            }
            // اجازه نمی‌دهیم اعشار با نقطه شروع شود
            if (raw.startsWith('.')) raw = '0' + raw;
          }
          return raw;
        };

        // همگام‌سازی با مقدار فرم (از بیرون)
        // eslint-disable-next-line react-hooks/rules-of-hooks
        useEffect(() => {
          if (
            field.value !== undefined &&
            field.value !== null &&
            field.value !== ''
          ) {
            setDisplayValue(formatNumber(field.value));
          } else {
            setDisplayValue('');
          }
        }, [field.value]);

        const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
          const rawInput = e.target.value;

          // استخراج عدد خالص از ورودی
          let rawNumber = getRawNumber(rawInput);

          // اگر رشته خالی شد یا فقط '-' بود (برای منفی)، مقدار را خالی کنیم
          if (rawNumber === '' || rawNumber === '-') {
            setDisplayValue('');
            field.onChange(undefined);
            return;
          }

          // بررسی محدودیت‌های min/max
          const numValue = parseFloat(rawNumber);
          if (!isNaN(numValue)) {
            if (min !== undefined && numValue < min) {
              rawNumber = String(min);
            } else if (max !== undefined && numValue > max) {
              rawNumber = String(max);
            }
          }

          // مقدار نهایی عددی
          const finalNum = parseFloat(rawNumber);
          if (isNaN(finalNum)) {
            setDisplayValue('');
            field.onChange(undefined);
            return;
          }

          // خروجی بر اساس outputType
          const outputValue = outputType === 'number' ? finalNum : rawNumber;

          field.onChange(outputValue);

          // به‌روزرسانی نمایش با فرمت کاما
          if (!isNaN(finalNum)) {
            setDisplayValue(formatNumber(finalNum));
          } else {
            setDisplayValue('');
          }
        };

        return (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={field.name}>
              {other?.label}
              {other?.isRequired && <span className="text-red-500">*</span>}
            </FieldLabel>
            <Input
              {...other}
              type="text"
              id={field.name}
              value={displayValue}
              onChange={handleChange}
              inputMode={allowDecimal ? 'decimal' : 'numeric'}
              aria-invalid={fieldState.invalid}
              placeholder={other?.placeholder}
              autoComplete="off"
            />
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        );
      }}
    />
  );
}
