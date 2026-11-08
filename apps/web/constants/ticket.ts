import type {
  TicketDepartment,
  TicketPriority,
  TicketStatus,
} from '@/services/features/ticket/types';

export const TICKET_STATUS_LABEL: Record<TicketStatus, string> = {
  OPEN: 'در انتظار پاسخ',
  ANSWERED: 'پاسخ داده شده',
  CLOSED: 'بسته شده',
};

export const TICKET_STATUS_BADGE_CLASS: Record<TicketStatus, string> = {
  OPEN: 'bg-amber-100 text-amber-700 border-amber-200',
  ANSWERED: 'bg-blue-100 text-blue-700 border-blue-200',
  CLOSED: 'bg-gray-100 text-gray-600 border-gray-200',
};

export const TICKET_STATUS_DOT_CLASS: Record<TicketStatus, string> = {
  OPEN: 'bg-amber-500',
  ANSWERED: 'bg-blue-500',
  CLOSED: 'bg-gray-400',
};

export const TICKET_PRIORITY_LABEL: Record<TicketPriority, string> = {
  LOW: 'کم',
  NORMAL: 'عادی',
  HIGH: 'زیاد',
  URGENT: 'فوری',
};

export const TICKET_PRIORITY_BADGE_CLASS: Record<TicketPriority, string> = {
  LOW: 'bg-gray-100 text-gray-600 border-gray-200',
  NORMAL: 'bg-teal-50 text-teal-700 border-teal-200',
  HIGH: 'bg-orange-100 text-orange-700 border-orange-200',
  URGENT: 'bg-red-100 text-red-700 border-red-200',
};

export const TICKET_DEPARTMENT_LABEL: Record<TicketDepartment, string> = {
  GENERAL: 'عمومی',
  PAYMENT: 'مالی و پرداخت',
  TECHNICAL: 'فنی',
  COMPLAINT: 'شکایت',
  SUGGESTION: 'پیشنهاد',
};

/** گزینه‌های فیلتر وضعیت در لیست تیکت‌ها */
export const TICKET_STATUS_FILTERS: {
  value: TicketStatus | 'ALL';
  label: string;
}[] = [
  { value: 'ALL', label: 'همه' },
  { value: 'OPEN', label: TICKET_STATUS_LABEL.OPEN },
  { value: 'ANSWERED', label: TICKET_STATUS_LABEL.ANSWERED },
  { value: 'CLOSED', label: TICKET_STATUS_LABEL.CLOSED },
];

export const TICKET_PRIORITY_OPTIONS: {
  value: TicketPriority;
  text: string;
}[] = (Object.keys(TICKET_PRIORITY_LABEL) as TicketPriority[]).map(value => ({
  value,
  text: TICKET_PRIORITY_LABEL[value],
}));

export const TICKET_DEPARTMENT_OPTIONS: {
  value: TicketDepartment;
  text: string;
}[] = (Object.keys(TICKET_DEPARTMENT_LABEL) as TicketDepartment[]).map(
  value => ({
    value,
    text: TICKET_DEPARTMENT_LABEL[value],
  }),
);
