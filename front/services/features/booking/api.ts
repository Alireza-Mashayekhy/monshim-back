// services/features/booking/api.ts
import { api } from '@/services/api/client';
import { endpoints } from '@/services/api/endpoints';
import {
  ApiListResponse,
  ApiSingleResponse,
  PaginationMeta,
} from '@/services/api/types';

import { AvailableSlotsResponse } from '../barber/types';
import {
  Booking,
  BookingQueryParams,
  MyBooking,
  MyBookingsQuery,
} from './types';

export interface CreateBookingDto {
  barberId: number;
  serviceId: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  note?: string;
}

export const createBooking = async (
  dto: CreateBookingDto,
): Promise<Booking> => {
  const { data } = await api.post(endpoints.booking.create, dto);
  return data;
};

export const getAvailableSlots = async (
  barberId: string,
  date: string | null,
  serviceId: string | null,
) => {
  const { data } = await api.get<ApiSingleResponse<AvailableSlotsResponse>>(
    endpoints.booking.availableTimes,
    {
      params: { barberId, date, serviceId },
    },
  );
  return data;
};

export const getBarberBookings = async (
  params: BookingQueryParams,
): Promise<ApiListResponse<Booking>> => {
  const { data } = await api.get('/bookings/barber/my', { params });
  return data;
};

// دریافت نوبت‌های یک آرایشگر خاص (برای ادمین)
export const getBarberBookingsById = async (
  barberId: number,
  params: BookingQueryParams,
): Promise<ApiListResponse<Booking>> => {
  const { data } = await api.get(`/bookings/barber/${barberId}`, { params });
  return data;
};

// به‌روزرسانی وضعیت نوبت
export const updateBookingStatus = async (
  id: string,
  status: Booking['status'],
): Promise<Booking> => {
  const { data } = await api.patch(`/bookings/${id}/status`, { status });
  return data;
};

// تأیید نوبت توسط آرایشگر (اختیاری)
export const confirmBooking = async (id: string): Promise<Booking> => {
  const { data } = await api.patch(`/bookings/${id}/confirm`);
  return data;
};

// لغو نوبت توسط مشتری
export const cancelBooking = async (id: string): Promise<Booking> => {
  const { data } = await api.patch(`/bookings/${id}/cancel`);
  return data;
};

export const getMyBookings = async (
  params?: MyBookingsQuery,
): Promise<{ data: MyBooking[]; pagination?: PaginationMeta }> => {
  const { data } = await api.get('/bookings/my', { params });

  const payload = data?.data;

  // پشتیبانی از هر دو حالت: آرایه مستقیم یا بسته‌ی صفحه‌بندی‌شده
  const list: MyBooking[] = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.data)
      ? payload.data
      : [];

  const pagination: PaginationMeta | undefined = Array.isArray(payload)
    ? data?.pagination
    : (payload?.pagination ?? data?.pagination);

  return { data: list, pagination };
};
