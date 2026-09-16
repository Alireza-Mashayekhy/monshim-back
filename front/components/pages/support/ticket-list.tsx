'use client';

import { Headphones, Plus } from 'lucide-react';

import {
  TicketCard,
  TicketCardSkeleton,
} from '@/components/pages/support/ticket-card';
import CustomPagination from '@/components/shared/custom-pagination';
import { Button } from '@/components/ui/button';
import type { PaginationMeta } from '@/services/api/types';
import type { Ticket } from '@/services/features/ticket/types';

interface TicketListProps {
  tickets?: Ticket[];
  isLoading?: boolean;
  isError?: boolean;
  pagination?: PaginationMeta;
  page: number;
  onPageChange: (page: number) => void;
  onSelect: (id: string) => void;
  onCreate: () => void;
  /** آیا فیلتری (جستجو/وضعیت/اولویت) اعمال شده است؟ */
  filtered?: boolean;
}

export function TicketList({
  tickets,
  isLoading,
  isError,
  pagination,
  page,
  onPageChange,
  onSelect,
  onCreate,
  filtered = false,
}: TicketListProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <TicketCardSkeleton key={index} />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-gray-500">
          خطا در دریافت تیکت‌ها. لطفاً دوباره تلاش کنید.
        </p>
      </div>
    );
  }

  if (!tickets || tickets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-14 px-6 bg-white rounded-2xl border border-dashed border-gray-200">
        <div className="size-14 rounded-full bg-primary-50 flex items-center justify-center mb-3">
          <Headphones size={26} className="text-primary-600" />
        </div>
        <p className="font-bold text-gray-700 text-sm">
          {filtered
            ? 'تیکتی با این فیلترها یافت نشد'
            : 'هنوز تیکتی ثبت نکرده‌اید'}
        </p>
        <p className="text-xs text-gray-400 mt-1 leading-6">
          {filtered
            ? 'می‌توانید فیلترها را تغییر دهید یا تیکت جدیدی ایجاد کنید.'
            : 'سؤال یا مشکلی دارید؟ تیکت جدید ایجاد کنید تا پشتیبانی پاسخ دهد.'}
        </p>
        <Button className="mt-4 rounded-full px-5" onClick={onCreate}>
          <Plus size={16} />
          تیکت جدید
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {tickets.map(ticket => (
        <TicketCard key={ticket.id} ticket={ticket} onSelect={onSelect} />
      ))}

      {(pagination?.totalPages ?? 1) > 1 && (
        <CustomPagination
          totalPages={pagination!.totalPages}
          currentPage={page}
          onPageChange={onPageChange}
        />
      )}
    </div>
  );
}
