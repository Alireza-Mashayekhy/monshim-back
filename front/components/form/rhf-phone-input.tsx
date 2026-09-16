'use client';

import { Controller, useFormContext } from 'react-hook-form';

import RHFInput from '@/components/form/rhf-input';
import { normalizePhone } from '@/lib/phone';

export type RHFPhoneInputProps = Omit<
  React.ComponentProps<'input'>,
  'type' | 'onChange' | 'value' | 'maxLength'
> & {
  name: string;
  label?: string;
  isRequired?: boolean;
};

/**
 * ورودی شماره موبایل:
 * هنگام تایپ، ارقام فارسی/عربی را به انگلیسی تبدیل می‌کند،
 * جداکننده‌ها را حذف می‌کند و طول را به ۱۱ رقم محدود می‌کند.
 */
export default function RHFPhoneInput({ ...other }: RHFPhoneInputProps) {
  const { control } = useFormContext();

  return (
    <Controller
      name={other.name}
      control={control}
      render={({ field }) => (
        <RHFInput
          {...other}
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          maxLength={11}
          dir="ltr"
          className="text-left"
          onChange={event => field.onChange(normalizePhone(event.target.value))}
        />
      )}
    />
  );
}
