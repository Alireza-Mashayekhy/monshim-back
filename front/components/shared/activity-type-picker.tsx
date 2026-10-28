'use client';

import { LucideIcon, Mars, Venus, VenusAndMars } from 'lucide-react';

import { ACTIVITY_TYPES, ActivityTypeValue } from '@/constants/activity-types';
import { cn } from '@/lib/utils';

const ACTIVITY_ICONS: Record<ActivityTypeValue, LucideIcon> = {
  women: Venus,
  men: Mars,
  both: VenusAndMars,
};

interface ActivityTypePickerProps {
  /** مقدار فعلی؛ مقادیر قدیمی/ناشناخته مثل برچسب فارسی هیچ گزینه‌ای را فعال نمی‌کنند. */
  value?: string | null;
  onChange: (value: ActivityTypeValue) => void;
  ariaLabel?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * انتخاب «نوع فعالیت» سالن (بانوان / آقایان / هردو).
 *
 * یک ویجت مشترک است تا همان گزینه‌هایی که آرایشگر در ثبت‌نام انتخاب می‌کند،
 * در ویرایش پروفایل هم با ظاهر و رفتار یکسان در دسترس باشد.
 */
export function ActivityTypePicker({
  value,
  onChange,
  ariaLabel = 'نوع فعالیت',
  disabled,
  className,
}: ActivityTypePickerProps) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn('grid grid-cols-3 gap-2.5', className)}
    >
      {ACTIVITY_TYPES.map(type => {
        const Icon = ACTIVITY_ICONS[type.value];
        const selected = value === type.value;
        return (
          <button
            key={type.value}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            onClick={() => onChange(type.value)}
            className={cn(
              'flex flex-col items-center justify-center gap-1.5 py-3 rounded-2xl border-2 transition-all cursor-pointer text-xs font-bold',
              selected
                ? 'border-primary bg-primary/5 text-primary shadow-xs'
                : 'border-gray-200 hover:border-gray-300 text-gray-600 bg-gray-50/50',
              disabled && 'cursor-not-allowed opacity-60 hover:border-gray-200',
            )}
          >
            <Icon className="w-5 h-5" />
            <span>{type.label}</span>
          </button>
        );
      })}
    </div>
  );
}
