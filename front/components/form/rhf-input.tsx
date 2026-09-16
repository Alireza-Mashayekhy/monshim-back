import { Controller, useFormContext } from 'react-hook-form';

import { Input } from '@/components/ui/input';

import { Field, FieldError, FieldLabel } from '../ui/field';

export type RHFInputProps = React.ComponentProps<'input'> & {
  name: string;
  label?: string;
  isRequired?: boolean;
};

export default function RHFInput({ type = 'text', ...other }: RHFInputProps) {
  const { control } = useFormContext();

  return (
    <Controller
      name={other.name}
      control={control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel htmlFor={field.name}>
            {other?.label}
            {other?.isRequired && <span className="text-red-500">*</span>}
          </FieldLabel>
          <Input
            {...field}
            type={type}
            id={field.name}
            aria-invalid={fieldState.invalid}
            placeholder={other?.placeholder}
            {...other}
          />
          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
        </Field>
      )}
    />
  );
}
