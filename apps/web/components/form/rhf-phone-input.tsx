'use client';

import RHFInput from '@/components/form/rhf-input';
import { normalizePhone } from '@/lib/phone';
import { cn } from '@/lib/utils';

export type RHFPhoneInputProps = Omit<
  React.ComponentProps<'input'>,
  'type' | 'onChange' | 'value' | 'maxLength'
> & {
  name: string;
  label?: string;
  isRequired?: boolean;
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
};

/**
 * ورودی شماره موبایل:
 * هنگام تایپ یا پیست، ارقام فارسی/عربی را به انگلیسی تبدیل می‌کند،
 * جداکننده‌ها را حذف می‌کند و طول را به ۱۱ رقم محدود می‌کند.
 */
export default function RHFPhoneInput({
  startIcon,
  endIcon,
  className,
  ...other
}: RHFPhoneInputProps) {
  return (
    <RHFInput
      {...other}
      startIcon={startIcon}
      endIcon={endIcon}
      type="tel"
      inputMode="tel"
      autoComplete="tel-national"
      dir="ltr"
      className={cn('text-left', className)}
      sanitize={normalizePhone}
    />
  );
}
