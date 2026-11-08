// components/dashboard/appointments/AppointmentFilter.tsx
'use client';

import { cn, toPersianDigits } from '@/lib/utils';

export type AppointmentFilterKey =
  | 'pending'
  | 'today'
  | 'tomorrow'
  | 'week'
  | 'month'
  | 'all';

const filters: { key: AppointmentFilterKey; label: string }[] = [
  // «در انتظار تایید» اول می‌آید: کاری که باید همین حالا انجام شود.
  { key: 'pending', label: 'در انتظار تایید' },
  { key: 'today', label: 'امروز' },
  { key: 'tomorrow', label: 'فردا' },
  { key: 'week', label: 'این هفته' },
  { key: 'month', label: 'این ماه' },
  { key: 'all', label: 'همه' },
];

interface AppointmentFilterProps {
  value: AppointmentFilterKey;
  onChange: (filter: AppointmentFilterKey) => void;
  /** تعداد درخواست‌های بازِ همهٔ تاریخ‌ها؛ روی تب «در انتظار تایید» می‌نشیند. */
  pendingCount?: number;
}

export default function AppointmentFilter({
  value,
  onChange,
  pendingCount = 0,
}: AppointmentFilterProps) {
  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
      {filters.map(item => (
        <button
          key={item.key}
          type="button"
          onClick={() => onChange(item.key)}
          className={cn(
            'h-9 shrink-0 whitespace-nowrap rounded-xl px-4 text-xs font-black transition',
            value === item.key
              ? 'bg-primary text-white'
              : 'border border-gray-200 bg-white text-gray-500 hover:border-primary/40 hover:text-primary',
          )}
        >
          {item.label}

          {item.key === 'pending' && pendingCount > 0 && (
            <span
              className={cn(
                'ms-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-black',
                value === 'pending'
                  ? 'bg-white/20 text-white'
                  : 'bg-amber-100 text-amber-700',
              )}
            >
              {toPersianDigits(pendingCount)}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
