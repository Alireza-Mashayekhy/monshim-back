'use client';

import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface TimeInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function TimeInput({
  label,
  error,
  className,
  ...props
}: TimeInputProps) {
  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-xs font-medium text-gray-700">
          {label}
        </label>
      )}
      <Input type="time" className={cn('w-full', className)} {...props} />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
