'use client';

import { OTPInput, OTPInputContext } from 'input-otp';
import { MinusIcon } from 'lucide-react';
import * as React from 'react';

import { toEnglishDigits } from '@/lib/digits';
import { cn } from '@/lib/utils';

const NUMERIC_OTP_PATTERNS = new Set([
  '[0-9]*',
  '[0-9]+',
  '^[0-9]*$',
  '^[0-9]+$',
  '\\d*',
  '\\d+',
  '^\\d*$',
  '^\\d+$',
]);

function InputOTP({
  className,
  containerClassName,
  value,
  onChange,
  onComplete,
  pasteTransformer,
  pattern,
  inputMode = 'numeric',
  ...props
}: React.ComponentProps<typeof OTPInput> & {
  containerClassName?: string;
}) {
  const isNumericOtp =
    inputMode === 'numeric' &&
    (!pattern || NUMERIC_OTP_PATTERNS.has(pattern));

  const effectivePattern = isNumericOtp ? '^[0-9۰-۹٠-٩]+$' : pattern;

  const handleChange = React.useCallback(
    (nextValue: string) => {
      const normalized = toEnglishDigits(nextValue);
      onChange?.(isNumericOtp ? normalized.replace(/\D/g, '') : normalized);
    },
    [isNumericOtp, onChange],
  );

  const handleComplete = React.useCallback(
    (completedValue: string) => {
      if (!onComplete) return;
      const normalized = toEnglishDigits(completedValue);
      onComplete(isNumericOtp ? normalized.replace(/\D/g, '') : normalized);
    },
    [isNumericOtp, onComplete],
  );

  const handlePaste = React.useCallback(
    (pasted: string) => {
      const normalized = toEnglishDigits(pasted);
      const cleaned = isNumericOtp ? normalized.replace(/\D/g, '') : normalized;
      return pasteTransformer ? pasteTransformer(cleaned) : cleaned;
    },
    [isNumericOtp, pasteTransformer],
  );

  return (
    <OTPInput
      data-slot="input-otp"
      containerClassName={cn(
        'cn-input-otp flex items-center has-disabled:opacity-50',
        containerClassName,
      )}
      spellCheck={false}
      className={cn('disabled:cursor-not-allowed', className)}
      inputMode={inputMode}
      pattern={effectivePattern}
      value={typeof value === 'string' ? toEnglishDigits(value) : value}
      onChange={handleChange}
      onComplete={onComplete ? handleComplete : undefined}
      pasteTransformer={handlePaste}
      {...props}
    />
  );
}

function InputOTPGroup({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="input-otp-group"
      className={cn(
        'flex items-center rounded-lg has-aria-invalid:border-destructive has-aria-invalid:ring-3 has-aria-invalid:ring-destructive/20 dark:has-aria-invalid:ring-destructive/40',
        className,
      )}
      {...props}
    />
  );
}

function InputOTPSlot({
  index,
  className,
  ...props
}: React.ComponentProps<'div'> & {
  index: number;
}) {
  const inputOTPContext = React.useContext(OTPInputContext);
  const { char, hasFakeCaret, isActive } = inputOTPContext?.slots[index] ?? {};

  return (
    <div
      data-slot="input-otp-slot"
      data-active={isActive}
      className={cn(
        'relative flex size-8 items-center justify-center border-y border-e border-input text-sm transition-all outline-none first:rounded-s-lg first:border-s last:rounded-e-lg aria-invalid:border-destructive data-[active=true]:z-10 data-[active=true]:border-ring data-[active=true]:ring-3 data-[active=true]:ring-ring/50 data-[active=true]:aria-invalid:border-destructive data-[active=true]:aria-invalid:ring-destructive/20 dark:bg-input/30 dark:data-[active=true]:aria-invalid:ring-destructive/40',
        className,
      )}
      {...props}
    >
      {char}
      {hasFakeCaret && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-4 w-px animate-caret-blink bg-foreground duration-1000" />
        </div>
      )}
    </div>
  );
}

function InputOTPSeparator({ ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="input-otp-separator"
      className="flex items-center [&_svg:not([class*='size-'])]:size-4"
      role="separator"
      {...props}
    >
      <MinusIcon />
    </div>
  );
}

export { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot };
