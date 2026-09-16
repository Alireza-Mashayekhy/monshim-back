'use client';

import { ChevronLeft, UserRound } from 'lucide-react';

import CustomPagination from '@/components/shared/custom-pagination';
import {
  TicketPriorityBadge,
  TicketStatusBadge,
} from '@/components/shared/ticket-badges';
import { Skeleton } from '@/components/ui/skeleton';
import { TICKET_DEPARTMENT_LABEL } from '@/constants/ticket';
import { formatTicketDate } from '@/lib/date-utils';
import { cn } from '@/lib/utils';
import type { PaginationMeta } from '@/services/api/types';
import type { Ticket } from '@/services/features/ticket/types';

interface AdminTicketListProps {
  tickets?: Ticket[];
  isLoading?: boolean;
  isError?: boolean;
  pagination?: PaginationMeta;
  page: number;
  onPageChange: (page: number) => void;
  onSelect: (id: string) => void;
  selectedId?: string | null;
  filtered?: boolean;
}

export function AdminTicketList({
  tickets,
  isLoading,
  isError,
  pagination,
  page,
  onPageChange,
  onSelect,
  selectedId,
  filtered = false,
}: AdminTicketListProps) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-20 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center py-10 text-sm text-gray-500">
        خطا در دریافت تیکت‌ها. لطفاً دوباره تلاش کنید.
      </div>
    );
  }

  if (!tickets || tickets.length === 0) {
    return (
      <div className="text-center py-10 text-sm text-gray-400">
        {filtered ? 'تیکتی با این فیلترها یافت نشد' : 'تیکتی ثبت نشده است'}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {tickets.map(ticket => {
        const unread = ticket.unreadCount ?? 0;
        const lastMessage = ticket.lastMessage;

        return (
          <button
            key={ticket.id}
            type="button"
            onClick={() => onSelect(ticket.id)}
            className={cn(
              'w-full text-right rounded-lg border p-3 transition-colors',
              selectedId === ticket.id
                ? 'border-primary bg-primary-50/60'
                : 'border-gray-200 bg-white hover:border-primary/40',
            )}
          >
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-gray-800 truncate flex-1">
                {ticket.subject}
              </span>
              {unread > 0 && (
                <span className="shrink-0 min-w-5 h-5 px-1.5 rounded-full bg-primary-600 text-white text-[10px] font-bold flex items-center justify-center">
                  {unread > 99 ? '۹۹+' : unread}
                </span>
              )}
              <ChevronLeft size={16} className="shrink-0 text-gray-300" />
            </div>

            {lastMessage && (
              <p className="mt-1 text-xs text-gray-500 line-clamp-1">
                {lastMessage.senderRole === 'USER' && (
                  <span className="inline-flex items-center gap-1 text-gray-400">
                    <UserRound size={11} />
                    کاربر:
                  </span>
                )}{' '}
                {lastMessage.message}
              </p>
            )}

            <div className="mt-2 flex items-center gap-1.5 flex-wrap">
              <TicketStatusBadge status={ticket.status} />
              <TicketPriorityBadge priority={ticket.priority} />
              <span className="text-[10px] text-gray-400">
                {TICKET_DEPARTMENT_LABEL[ticket.department] ??
                  ticket.department}
              </span>
              <span className="text-[10px] text-gray-300">•</span>
              <span className="text-[10px] text-gray-400">
                کاربر {ticket.userId.toLocaleString('fa-IR')}
              </span>
              <span className="text-[10px] text-gray-300">•</span>
              <span className="text-[10px] text-gray-400">
                {formatTicketDate(lastMessage?.createdAt ?? ticket.updatedAt)}
              </span>
            </div>
          </button>
        );
      })}

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
