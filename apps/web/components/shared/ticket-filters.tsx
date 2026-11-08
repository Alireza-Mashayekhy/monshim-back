'use client';

import { Search, X } from 'lucide-react';

import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  TICKET_PRIORITY_LABEL,
  TICKET_STATUS_FILTERS,
} from '@/constants/ticket';
import { cn } from '@/lib/utils';
import type {
  TicketPriority,
  TicketStatus,
} from '@/services/features/ticket/types';

export type TicketStatusFilter = TicketStatus | 'ALL';
export type TicketPriorityFilter = TicketPriority | 'ALL';

interface TicketFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  status: TicketStatusFilter;
  onStatusChange: (value: TicketStatusFilter) => void;
  priority: TicketPriorityFilter;
  onPriorityChange: (value: TicketPriorityFilter) => void;
  className?: string;
}

const PRIORITY_FILTERS: { value: TicketPriorityFilter; label: string }[] = [
  { value: 'ALL', label: 'همه اولویت‌ها' },
  ...(Object.keys(TICKET_PRIORITY_LABEL) as TicketPriority[]).map(value => ({
    value,
    label: TICKET_PRIORITY_LABEL[value],
  })),
];

export function TicketFilters({
  search,
  onSearchChange,
  status,
  onStatusChange,
  priority,
  onPriorityChange,
  className,
}: TicketFiltersProps) {
  return (
    <div className={cn('space-y-2.5', className)}>
      {/* جستجو */}
      <div className="relative">
        <Search
          size={16}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
        />
        <Input
          value={search}
          onChange={e => onSearchChange(e.target.value)}
          placeholder="جستجو در موضوع تیکت‌ها..."
          className="h-10 pr-9 pl-9 rounded-xl bg-white border-gray-200"
        />
        {search && (
          <button
            type="button"
            onClick={() => onSearchChange('')}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            aria-label="پاک کردن جستجو"
          >
            <X size={15} />
          </button>
        )}
      </div>

      {/* وضعیت + اولویت */}
      <div className="flex items-center gap-2">
        <div className="flex gap-2 overflow-x-auto no-scrollbar flex-1">
          {TICKET_STATUS_FILTERS.map(item => (
            <button
              key={item.value}
              type="button"
              onClick={() => onStatusChange(item.value)}
              className={cn(
                'shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                status === item.value
                  ? 'bg-primary-600 border-primary-600 text-white'
                  : 'bg-white border-gray-200 text-gray-500 hover:border-primary-200 hover:text-primary-700',
              )}
            >
              {item.label}
            </button>
          ))}
        </div>

        <Select
          value={priority}
          onValueChange={v => onPriorityChange(v as TicketPriorityFilter)}
        >
          <SelectTrigger
            size="sm"
            className="shrink-0 w-32 rounded-full bg-white border-gray-200 text-xs"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="end">
            {PRIORITY_FILTERS.map(item => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
