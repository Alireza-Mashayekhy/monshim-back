export type TicketStatus = 'OPEN' | 'ANSWERED' | 'CLOSED';

export type TicketPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

export type TicketDepartment =
  | 'GENERAL'
  | 'PAYMENT'
  | 'TECHNICAL'
  | 'COMPLAINT'
  | 'SUGGESTION';

export type MessageSender = 'USER' | 'ADMIN';

export interface TicketMessage {
  id: string;
  ticketId: string;
  senderRole: MessageSender;
  senderId: number;
  message: string;
  readByUser: boolean;
  readByAdmin: boolean;
  createdAt: string;
}

export interface Ticket {
  id: string;
  userId: number;
  subject: string;
  department: TicketDepartment;
  priority: TicketPriority;
  status: TicketStatus;
  createdAt: string;
  updatedAt: string;
  lastMessage?: TicketMessage | null;
  /** تعداد پیام‌های خوانده‌نشده (در لیست کاربر: پیام‌های ادمین) */
  unreadCount?: number;
  /** فقط در جزئیات تیکت برمی‌گردد */
  messages?: TicketMessage[];
  /** فقط در پاسخ‌های ادمین: نام کامل صاحب تیکت (کاربر حذف‌شده → null) */
  userName?: string | null;
  /** فقط در پاسخ‌های ادمین: آرایشگر یا کاربر بودن فرستندهٔ تیکت */
  userRole?: TicketSenderRole | null;
}

/** نقش نمایشی فرستندهٔ تیکت در پنل ادمین */
export type TicketSenderRole = 'barber' | 'user';

export interface TicketQueryParams {
  page?: number;
  limit?: number;
  status?: TicketStatus;
  priority?: TicketPriority;
  search?: string;
}

export interface CreateTicketDto {
  subject: string;
  message: string;
  department?: TicketDepartment;
  priority?: TicketPriority;
}

export interface SendMessageDto {
  message: string;
}
