// types/booking.types.ts
export type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'completed'
  | 'canceled'
  | 'rejected';

export interface Booking {
  id: string;
  customerId: number;
  barberId: number;
  serviceId: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  price: number;
  status: BookingStatus;
  note?: string;
  createdAt: string;
  updatedAt: string;
  // روابط (برای نمایش)
  customer?: {
    id: number;
    fullName: string;
    phone: string;
  };
  service?: {
    id: string;
    name: string;
    durationMinutes: number;
  };
  barber?: {
    id: string;
    salonName: string;
  };
}

export interface BookingQueryParams {
  page?: number;
  limit?: number;
  status?: Booking['status'];
  date?: string; // YYYY-MM-DD
  search?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * نوبت از نگاه کاربر (پاسخ /bookings/my)
 * فیلدها اختیاری در نظر گرفته شده‌اند چون بسته به رابطه‌های برگشتی
 * ممکن است بعضی از آن‌ها وجود نداشته باشند.
 */
export interface MyBooking {
  id: string;
  customerId?: number;
  barberId?: number;
  serviceId?: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  price?: number;
  status: BookingStatus;
  note?: string;
  createdAt?: string;
  updatedAt?: string;
  // روابط (برای نمایش)
  barber?: {
    id?: string | number;
    salonName?: string;
    address?: string;
    phone?: string;
  };
  service?: {
    id?: string;
    name?: string;
    durationMinutes?: number;
    price?: number;
  };
  customer?: {
    id?: number;
    fullName?: string;
    phone?: string;
  };
}

export interface MyBookingsQuery {
  page?: number;
  limit?: number;
  status?: BookingStatus;
}

/** وضعیت‌هایی که نوبت هنوز جاری است و کاربر می‌تواند لغو کند */
export const ACTIVE_BOOKING_STATUSES: BookingStatus[] = [
  'pending',
  'confirmed',
];
