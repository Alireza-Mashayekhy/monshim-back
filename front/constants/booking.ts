import type { BookingStatus } from '@/services/features/booking/types';

export const BOOKING_STATUS_LABEL: Record<BookingStatus, string> = {
  pending: 'در انتظار تایید',
  confirmed: 'تایید شده',
  completed: 'انجام شده',
  canceled: 'لغو شده',
  rejected: 'رد شده',
};

export const BOOKING_STATUS_BADGE_CLASS: Record<BookingStatus, string> = {
  pending: 'bg-amber-100 text-amber-700 border-amber-200',
  confirmed: 'bg-green-100 text-green-700 border-green-200',
  completed: 'bg-blue-100 text-blue-700 border-blue-200',
  canceled: 'bg-red-100 text-red-700 border-red-200',
  rejected: 'bg-gray-100 text-gray-600 border-gray-200',
};

export const BOOKING_STATUS_DOT_CLASS: Record<BookingStatus, string> = {
  pending: 'bg-amber-500',
  confirmed: 'bg-green-500',
  completed: 'bg-blue-500',
  canceled: 'bg-red-500',
  rejected: 'bg-gray-400',
};

/** وضعیت‌هایی که نوبت هنوز جاری است و امکان لغو دارد */
export const CANCELABLE_STATUSES: BookingStatus[] = ['pending', 'confirmed'];

export const canCancelBooking = (status: BookingStatus): boolean =>
  CANCELABLE_STATUSES.includes(status);
