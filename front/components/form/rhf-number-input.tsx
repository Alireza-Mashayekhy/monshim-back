// components/form/rhf-number-input.tsx
'use client';

import { useState } from 'react';
import { Controller, useFormContext } from 'react-hook-form';

import { Input } from '@/components/ui/input';
import {
  sanitizeDecimalInput,
  sanitizeIntegerInput,
  stripNumericSeparators,
} from '@/lib/digits';

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

function formatDisplayNumber(
  value: string | number | undefined | null,
  allowDecimal: boolean,
  decimalPlaces: number,
): string {
  if (value === undefined || value === null || value === '') return '';

  if (allowDecimal && typeof value === 'string') {
    const clean = sanitizeDecimalInput(
      value,
      decimalPlaces > 0 ? decimalPlaces : undefined,
    );
    if (!clean) return '';
    const hasDot = clean.includes('.');
    const [intPart, decPart = ''] = clean.split('.');
    const intNum = Number(intPart || '0');
    if (!Number.isFinite(intNum)) return '';
    const formattedInt = intNum.toLocaleString('en-US', {
      maximumFractionDigits: 0,
    });
    return hasDot ? `${formattedInt}.${decPart}` : formattedInt;
  }

  const normalized = stripNumericSeparators(value);
  const num = parseFloat(normalized);
  if (isNaN(num)) return '';

  if (!allowDecimal) {
    return Math.trunc(num).toLocaleString('en-US', {
      maximumFractionDigits: 0,
    });
  }

  return num.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimalPlaces > 0 ? decimalPlaces : 10,
  });
}

type NumericInputControlProps = Omit<
  React.ComponentProps<'input'>,
  'type' | 'onChange' | 'value'
> & {
  fieldValue: unknown;
  onFieldChange: (value: number | string | undefined) => void;
  onFieldBlur: () => void;
  outputType: 'number' | 'string';
  min?: number;
  max?: number;
  allowDecimal: boolean;
  decimalPlaces: number;
};

function NumericInputControl({
  fieldValue,
  onFieldChange,
  onFieldBlur,
  outputType,
  min,
  max,
  allowDecimal,
  decimalPlaces,
  onBlur,
  ...inputProps
}: NumericInputControlProps) {
  // در حالت عددی اعشاری (مثلاً تایپ "۱۲." یا "۱۲.۰") پیش‌نویس متنی را نگه می‌داریم تا ممیز حذف نشود
  const [decimalDraft, setDecimalDraft] = useState<string | null>(null);

  const normalizedFieldValue =
    typeof fieldValue === 'number' || typeof fieldValue === 'string'
      ? fieldValue
      : undefined;

  const displayValue = (() => {
    if (
      normalizedFieldValue === undefined ||
      normalizedFieldValue === ''
    ) {
      return '';
    }
    if (
      allowDecimal &&
      outputType === 'number' &&
      decimalDraft !== null &&
      parseFloat(decimalDraft) === normalizedFieldValue
    ) {
      return formatDisplayNumber(decimalDraft, true, decimalPlaces);
    }
    return formatDisplayNumber(normalizedFieldValue, allowDecimal, decimalPlaces);
  })();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawInput = e.target.value;

    let rawNumber = allowDecimal
      ? sanitizeDecimalInput(
          rawInput,
          decimalPlaces > 0 ? decimalPlaces : undefined,
        )
      : sanitizeIntegerInput(rawInput);

    if (rawNumber === '' || rawNumber === '-') {
      setDecimalDraft(null);
      onFieldChange(outputType === 'string' ? '' : undefined);
      return;
    }

    const numValue = parseFloat(rawNumber);
    if (!isNaN(numValue)) {
      if (min !== undefined && numValue < min) {
        rawNumber = String(min);
      } else if (max !== undefined && numValue > max) {
        rawNumber = String(max);
      }
    }

    const finalNum = parseFloat(rawNumber);
    if (isNaN(finalNum)) {
      setDecimalDraft(null);
      onFieldChange(outputType === 'string' ? '' : undefined);
      return;
    }

    if (allowDecimal && outputType === 'number') {
      setDecimalDraft(rawNumber);
    } else {
      setDecimalDraft(null);
    }

    const outputValue =
      outputType === 'number'
        ? finalNum
        : allowDecimal
          ? rawNumber
          : String(Math.trunc(finalNum));

    onFieldChange(outputValue);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setDecimalDraft(null);
    onFieldBlur();
    onBlur?.(e);
  };

  return (
    <Input
      {...inputProps}
      type="text"
      value={displayValue}
      onChange={handleChange}
      onBlur={handleBlur}
      inputMode={allowDecimal ? 'decimal' : 'numeric'}
      autoComplete="off"
    />
  );
}

export default function RHFNumberInput({
  name,
  label,
  isRequired,
  outputType = 'number',
  min,
  max,
  allowDecimal = false,
  decimalPlaces = 0,
  placeholder,
  onBlur,
  ...inputProps
}: RHFNumberInputProps) {
  const { control } = useFormContext();

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          {label && (
            <FieldLabel htmlFor={field.name}>
              {label}
              {isRequired && <span className="text-red-500">*</span>}
            </FieldLabel>
          )}
          <NumericInputControl
            {...inputProps}
            ref={field.ref}
            name={field.name}
            id={field.name}
            fieldValue={field.value}
            onFieldChange={field.onChange}
            onFieldBlur={field.onBlur}
            outputType={outputType}
            min={min}
            max={max}
            allowDecimal={allowDecimal}
            decimalPlaces={decimalPlaces}
            aria-invalid={fieldState.invalid}
            placeholder={placeholder}
            onBlur={onBlur}
          />
          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
        </Field>
      )}
    />
  );
}
