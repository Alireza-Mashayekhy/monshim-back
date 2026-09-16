import { ChevronLeft, Headphones } from 'lucide-react';

import {
  TicketPriorityBadge,
  TicketStatusBadge,
} from '@/components/shared/ticket-badges';
import { TICKET_DEPARTMENT_LABEL } from '@/constants/ticket';
import { formatTicketDate } from '@/lib/date-utils';
import { cn } from '@/lib/utils';
import type { Ticket } from '@/services/features/ticket/types';

interface TicketCardProps {
  ticket: Ticket;
  onSelect: (id: string) => void;
  className?: string;
}

export function TicketCard({ ticket, onSelect, className }: TicketCardProps) {
  const unread = ticket.unreadCount ?? 0;
  const lastMessage = ticket.lastMessage;

  return (
    <button
      type="button"
      onClick={() => onSelect(ticket.id)}
      className={cn(
        'w-full text-right bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3 shadow-sm hover:border-primary-200 hover:shadow-md active:scale-[0.99] transition-all',
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        {/* موضوع + نشان خوانده‌نشده */}
        <div className="flex items-center gap-2">
          <span className="font-bold text-sm text-gray-800 truncate flex-1">
            {ticket.subject}
          </span>
          {unread > 0 && (
            <span className="shrink-0 min-w-5 h-5 px-1.5 rounded-full bg-primary-600 text-white text-[10px] font-bold flex items-center justify-center">
              {unread > 99 ? '۹۹+' : unread}
            </span>
          )}
        </div>

        {/* پیش‌نمایش آخرین پیام */}
        {lastMessage && (
          <p className="mt-1 text-xs text-gray-500 line-clamp-1">
            {lastMessage.senderRole === 'ADMIN' && (
              <span className="inline-flex items-center gap-1 text-gray-400">
                <Headphones size={11} />
                پشتیبانی:
              </span>
            )}{' '}
            {lastMessage.message}
          </p>
        )}

        {/* برچسب‌ها */}
        <div className="mt-2.5 flex items-center gap-1.5 flex-wrap">
          <TicketStatusBadge status={ticket.status} />
          <TicketPriorityBadge priority={ticket.priority} />
          <span className="text-[10px] text-gray-400">
            {TICKET_DEPARTMENT_LABEL[ticket.department] ?? ticket.department}
          </span>
          <span className="text-[10px] text-gray-300">•</span>
          <span className="text-[10px] text-gray-400">
            {formatTicketDate(lastMessage?.createdAt ?? ticket.updatedAt)}
          </span>
        </div>
      </div>

      <ChevronLeft size={18} className="shrink-0 text-gray-300" />
    </button>
  );
}

export function TicketCardSkeleton() {
  return (
    <div className="w-full bg-white rounded-2xl border border-gray-100 p-4 animate-pulse">
      <div className="h-4 w-2/3 bg-gray-100 rounded" />
      <div className="h-3 w-full bg-gray-100 rounded mt-3" />
      <div className="flex gap-2 mt-3">
        <div className="h-4 w-20 bg-gray-100 rounded-full" />
        <div className="h-4 w-14 bg-gray-100 rounded-full" />
      </div>
    </div>
  );
}
