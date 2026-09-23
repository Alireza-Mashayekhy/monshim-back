// components/dashboard/appointments/AppointmentFilter.tsx
'use client';

import { cn } from '@/lib/utils';

export type AppointmentFilterKey =
  'today' | 'tomorrow' | 'week' | 'month' | 'all';

const filters: { key: AppointmentFilterKey; label: string }[] = [
  { key: 'today', label: 'امروز' },
  { key: 'tomorrow', label: 'فردا' },
  { key: 'week', label: 'این هفته' },
  { key: 'month', label: 'این ماه' },
  { key: 'all', label: 'همه' },
];

interface AppointmentFilterProps {
  value: AppointmentFilterKey;
  onChange: (filter: AppointmentFilterKey) => void;
}

export default function AppointmentFilter({
  value,
  onChange,
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
        </button>
      ))}
    </div>
  );
}
