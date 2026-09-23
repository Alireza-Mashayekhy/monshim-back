export interface ClubGroup {
  id: string;
  name: string;
  customersCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface ClubCustomer {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  groupId?: string | null;
  /** رابطهٔ گروه — بسته به پاسخ سرور ممکن است نباشد */
  group?: { id: string; name: string } | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface ClubCustomerQuery {
  page?: number;
  limit?: number;
  search?: string;
  groupId?: string;
}

export interface CreateClubCustomerDto {
  firstName: string;
  lastName: string;
  phone: string;
  groupId?: string | null;
}

export interface UpdateClubCustomerDto {
  firstName?: string;
  lastName?: string;
  /** مقدار null برای حذف گروه */
  groupId?: string | null;
}

export interface CreateCustomerGroupDto {
  name: string;
}

export const REMINDER_HOURS_OPTIONS = [1, 2, 4, 6, 12, 24] as const;

export interface CreateManualBookingDto {
  /** شناسه مشتری باشگاه */
  clubCustomerId: string;
  serviceId: string;
  /** YYYY-MM-DD */
  date: string;
  /** HH:mm */
  time: string;
  barberNote?: string;
  customerNote?: string;
  sendDepositLink?: boolean;
  sendSmsReminder?: boolean;
  reminderHours?: number;
}
