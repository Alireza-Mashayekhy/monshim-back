import { Controller, useFormContext } from 'react-hook-form';

import { Textarea } from '@/components/ui/textarea';

import { Field, FieldError, FieldLabel } from '../ui/field';

export type RHFTextAreaProps = React.ComponentProps<'textarea'> & {
  name: string;
  label?: string;
};

export default function RHFTextArea({ ...other }: RHFTextAreaProps) {
  const { control } = useFormContext();

  return (
    <Controller
      name={other.name}
      control={control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel htmlFor={field.name}>{other?.label}</FieldLabel>
          <Textarea
            {...field}
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
