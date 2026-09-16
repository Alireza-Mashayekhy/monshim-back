// components/form/rhf-select.tsx
import { Controller, useFormContext } from 'react-hook-form';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

import { Field, FieldError, FieldLabel } from '../ui/field';

export type RHFSelectProps = React.ComponentProps<'select'> & {
  name: string;
  label?: string;
  items?: { value: string; text?: string }[];
  placeholder?: string;
};

export default function RHFSelect({ ...other }: RHFSelectProps) {
  const { control } = useFormContext();

  return (
    <Controller
      name={other.name}
      control={control}
      render={({ field, fieldState }) => {
        const currentValue = field.value ?? '';
        return (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={field.name}>{other?.label}</FieldLabel>
            <Select
              key={currentValue} // ← کلید جدید: با تغییر مقدار، Select بازسازی می‌شود
              onValueChange={field.onChange}
              value={currentValue}
            >
              <SelectTrigger
                className={cn('w-full', other.className)}
                aria-invalid={fieldState.invalid}
                disabled={other.disabled}
              >
                <SelectValue placeholder={other?.placeholder} />
              </SelectTrigger>
              <SelectContent>
                {other.items?.map(item => (
                  <SelectItem key={item.value} value={item.value}>
                    {item?.text || item.value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        );
      }}
    />
  );
}
