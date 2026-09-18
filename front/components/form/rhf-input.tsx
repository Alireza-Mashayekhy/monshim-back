import { Controller, useFormContext } from 'react-hook-form';

import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

import { Field, FieldError, FieldLabel } from '../ui/field';

export type RHFInputProps = React.ComponentProps<'input'> & {
  name: string;
  label?: string;
  isRequired?: boolean;
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
};

export default function RHFInput({
  type = 'text',
  label,
  isRequired,
  startIcon,
  endIcon,
  className,
  placeholder,
  ...other
}: RHFInputProps) {
  const { control } = useFormContext();

  return (
    <Controller
      name={other.name}
      control={control}
      render={({ field, fieldState }) => (
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
            />
            {endIcon && (
              <div className="absolute end-3 text-gray-400 flex items-center justify-center z-10">
                {endIcon}
              </div>
            )}
          </div>
          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
        </Field>
      )}
    />
  );
}
