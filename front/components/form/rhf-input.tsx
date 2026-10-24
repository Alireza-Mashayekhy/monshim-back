import { Controller, useFormContext } from 'react-hook-form';

import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

import { Field, FieldDescription, FieldError, FieldLabel } from '../ui/field';

export type RHFInputProps = React.ComponentProps<'input'> & {
  name: string;
  label?: string;
  isRequired?: boolean;
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
  description?: string;
  helperText?: string;
  /**
   * پاک‌سازی مقدار ورودی *قبل* از رسیدن به فرم (مثلاً حذف کاراکترهای غیررقمی
   * از کد ملی). اگر مقدار پاک‌سازی‌شده با آنچه تایپ شده فرق کند، مقدار نمایش‌داده‌شده
   * در ورودی هم اصلاح می‌شود؛ بنابراین چیزی که کاربر می‌بیند دقیقاً همان چیزی است
   * که اعتبارسنجی می‌شود.
   */
  sanitize?: (value: string) => string;
};

export default function RHFInput({
  type = 'text',
  label,
  isRequired,
  startIcon,
  endIcon,
  className,
  placeholder,
  description,
  helperText,
  sanitize,
  onChange,
  ...other
}: RHFInputProps) {
  const { control } = useFormContext();

  return (
    <Controller
      name={other.name}
      control={control}
      render={({ field, fieldState }) => {
        const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
          if (sanitize) {
            const next = sanitize(event.target.value);
            if (next !== event.target.value) {
              // هم‌تراز کردن مقدار DOM با مقداری که به فرم می‌رود؛ وگرنه در
              // حالت کنترل‌شده ممکن است چیزی که کاربر می‌بیند با state یکی نباشد.
              event.target.value = next;
            }
          }
          (onChange ?? field.onChange)(event);
        };

        return (
          <Field data-invalid={fieldState.invalid}>
            {label && (
              <FieldLabel htmlFor={field.name}>
                {label}
                {isRequired && <span className="text-red-500">*</span>}
              </FieldLabel>
            )}
            <div className="relative w-full flex items-center">
              {startIcon && (
                <div className="pointer-events-none absolute start-3 text-gray-400 flex items-center justify-center z-10">
                  {startIcon}
                </div>
              )}
              <Input
                {...field}
                type={type}
                id={field.name}
                aria-invalid={fieldState.invalid}
                placeholder={placeholder}
                className={cn(
                  startIcon && 'ps-10',
                  endIcon && 'pe-10',
                  className,
                )}
                {...other}
                onChange={handleChange}
              />
              {endIcon && (
                <div className="absolute end-3 text-gray-400 flex items-center justify-center z-10">
                  {endIcon}
                </div>
              )}
            </div>
            {!fieldState.invalid && (description || helperText) && (
              <FieldDescription>{description ?? helperText}</FieldDescription>
            )}
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        );
      }}
    />
  );
}
