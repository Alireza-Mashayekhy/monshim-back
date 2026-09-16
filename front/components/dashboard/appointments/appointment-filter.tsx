// components/dashboard/appointments/AppointmentFilter.tsx
'use client';

import { useState } from 'react';

import { cn } from '@/lib/utils';

const filters = [
  { key: 'today', label: 'امروز' },
  { key: 'tomorrow', label: 'فردا' },
  { key: 'week', label: 'این هفته' },
  { key: 'all', label: 'همه' },
];

interface AppointmentFilterProps {
  onFilterChange: (filter: string) => void;
  initialFilter?: string;
}

export default function AppointmentFilter({
  onFilterChange,
  initialFilter = 'today',
}: AppointmentFilterProps) {
  const [selected, setSelected] = useState(initialFilter);

  const handleClick = (key: string) => {
    setSelected(key);
    onFilterChange(key);
  };

  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {filters.map(item => (
        <button
          key={item.key}
          onClick={() => handleClick(item.key)}
          className={cn(
            'rounded-full px-5 py-2 whitespace-nowrap transition',
            selected === item.key
              ? 'bg-primary text-white'
              : 'bg-primary-50 text-primary hover:bg-primary-100',
          )}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
