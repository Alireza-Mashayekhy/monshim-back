import 'nilfam-editor/nilfam-editor.css';

import { NilfamEditor } from 'nilfam-editor';
import { Controller, useFormContext } from 'react-hook-form';

import { cn } from '@/lib/utils';

export function RHFTextEditor({ name, label, placeholder, className }: any) {
  const {
    control,
    formState: { errors },
  } = useFormContext();
  const error = errors[name];

  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
      )}
      <Controller
        name={name}
        control={control}
        render={({ field: { onChange, value } }) => (
          <NilfamEditor
            value={value}
            onChange={onChange}
            lang="fa"
            dark={false}
            placeholder={placeholder}
          />
        )}
      />
      {error && (
        <p className="text-sm text-red-600">{error.message as string}</p>
      )}
    </div>
  );
}
