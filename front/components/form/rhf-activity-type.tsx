import { Controller, useFormContext } from 'react-hook-form';

import { ActivityTypePicker } from '@/components/shared/activity-type-picker';

import { Field, FieldDescription, FieldError, FieldLabel } from '../ui/field';

export type RHFActivityTypeProps = {
  name: string;
  label?: string;
  isRequired?: boolean;
  description?: string;
  className?: string;
  disabled?: boolean;
};

/**
 * فیلد «نوع فعالیت» سالن برای فرم‌های react-hook-form.
 * همان گزینه‌های ثبت‌نام آرایشگر (بانوان / آقایان / هردو) را در فرم‌های
 * دیگر — مثل ویرایش پروفایل — با استایل بقیهٔ فیلدها نمایش می‌دهد.
 */
export default function RHFActivityType({
  name,
  label,
  isRequired,
  description,
  className,
  disabled,
}: RHFActivityTypeProps) {
  const { control } = useFormContext();

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          {label && (
            <FieldLabel>
              {label}
              {isRequired && <span className="text-red-500">*</span>}
            </FieldLabel>
          )}
          <ActivityTypePicker
            value={field.value}
            onChange={field.onChange}
            ariaLabel={label}
            disabled={disabled}
            className={className}
          />
          {!fieldState.invalid && description && (
            <FieldDescription>{description}</FieldDescription>
          )}
          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
        </Field>
      )}
    />
  );
}
