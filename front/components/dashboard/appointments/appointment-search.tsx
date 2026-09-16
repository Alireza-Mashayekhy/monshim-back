// components/dashboard/appointments/AppointmentSearch.tsx
'use client';

import { Search } from 'lucide-react';

import { Input } from '@/components/ui/input';

interface AppointmentSearchProps {
  onSearch: (query: string) => void;
  value?: string;
}

export default function AppointmentSearch({
  onSearch,
  value = '',
}: AppointmentSearchProps) {
  return (
    <div className="relative">
      <Search
        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
        size={18}
      />
      <Input
        placeholder="جستجوی مشتری..."
        className="rounded-2xl pr-10 h-12"
        value={value}
        onChange={e => onSearch(e.target.value)}
      />
    </div>
  );
}
