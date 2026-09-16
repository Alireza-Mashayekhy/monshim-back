import { Flag } from 'lucide-react';

import {
  TICKET_PRIORITY_BADGE_CLASS,
  TICKET_PRIORITY_LABEL,
  TICKET_STATUS_BADGE_CLASS,
  TICKET_STATUS_DOT_CLASS,
  TICKET_STATUS_LABEL,
} from '@/constants/ticket';
import { cn } from '@/lib/utils';
import type {
  TicketPriority,
  TicketStatus,
} from '@/services/features/ticket/types';

export function TicketStatusBadge({
  status,
  className,
}: {
  status: TicketStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium whitespace-nowrap',
        TICKET_STATUS_BADGE_CLASS[status],
        className,
      )}
    >
      <span
        className={cn('size-1.5 rounded-full', TICKET_STATUS_DOT_CLASS[status])}
      />
      {TICKET_STATUS_LABEL[status]}
    </span>
  );
}

export function TicketPriorityBadge({
  priority,
  className,
}: {
  priority: TicketPriority;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium whitespace-nowrap',
        TICKET_PRIORITY_BADGE_CLASS[priority],
        className,
      )}
    >
      <Flag size={10} />
      {TICKET_PRIORITY_LABEL[priority]}
    </span>
  );
}
