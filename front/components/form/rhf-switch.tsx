'use client';
import { Controller, useFormContext } from 'react-hook-form';

import { Switch } from '@/components/ui/switch';

import { Field, FieldError, FieldLabel } from '../ui/field';

export type RHFSwitchProps = {
  name: string;
  label?: string;
  className?: string;
};

export default function RHFSwitch({ name, label, className }: RHFSwitchProps) {
  const { control } = useFormContext();

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid} className={className}>
          <div className="flex items-center gap-4">
            <Switch
              id={name}
              checked={field.value}
              onCheckedChange={field.onChange}
              aria-invalid={fieldState.invalid}
            />
            {label && (
              <FieldLabel htmlFor={name} className="cursor-pointer">
                {label}
              </FieldLabel>
            )}
          </div>
          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
        </Field>
      )}
    />
  );
}
