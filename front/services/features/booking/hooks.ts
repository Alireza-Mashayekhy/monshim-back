// services/features/booking/hooks.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import {
  cancelBooking,
  confirmBooking,
  createBooking,
  CreateBookingDto,
  getAvailableSlots,
  getBarberBookings,
  getMyBookings,
  resendDepositLink,
  updateBookingStatus,
  updateBookingTime,
} from './api';
import { Booking, BookingQueryParams, MyBookingsQuery } from './types';

export const useAvailableSlots = (
  barberId: string,
  date: string | null,
  serviceIds: string[],
  excludeBookingId?: string,
) => {
  return useQuery({
    queryKey: [
      'available-slots',
      barberId,
      date,
      [...serviceIds].sort(),
      excludeBookingId ?? null,
    ],

    queryFn: () =>
      getAvailableSlots(barberId, date!, serviceIds, excludeBookingId),

    enabled: !!barberId && !!date && serviceIds.length > 0,

    staleTime: 0,
    refetchInterval: 30 * 1000,
  });
};

export const useCreateBooking = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateBookingDto) => createBooking(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    },
  });
};

export const useBarberBookings = (params: BookingQueryParams) => {
  return useQuery({
    queryKey: ['barber-bookings', params],
    queryFn: () => getBarberBookings(params),
    staleTime: 2 * 60 * 1000,
  });
};

export const useUpdateBookingStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: Booking['status'] }) =>
      updateBookingStatus(id, status),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['barber-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['my-bookings'] });

      const messages: Record<Booking['status'], string> = {
        pending: 'نوبت به حالت «در انتظار تایید» برگشت.',
        confirmed: 'نوبت تایید شد و پیامک تایید برای مشتری ارسال شد.',
        completed: 'نوبت «انجام شده» ثبت شد.',
        rejected: 'درخواست رد شد؛ مبلغ در صف بازپرداخت مشتری ثبت شد.',
        canceled: 'نوبت لغو شد.',
      };

      toast.success(messages[variables.status]);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'خطا در تغییر وضعیت نوبت');
    },
  });
};

export const useUpdateBookingTime = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, time }: { id: string; time: string }) =>
      updateBookingTime(id, time),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['barber-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['available-slots'] });
      toast.success('ساعت نوبت تغییر کرد و پیامک آن برای مشتری ارسال شد.');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'خطا در تغییر ساعت نوبت');
    },
  });
};

export const useResendDepositLink = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => resendDepositLink(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['barber-bookings'] });
      toast.success('لینک بیعانه دوباره برای مشتری پیامک شد.');
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || 'ارسال دوبارهٔ لینک بیعانه ناموفق بود',
      );
    },
  });
};

export const useConfirmBooking = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => confirmBooking(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['barber-bookings'] });
      toast.success('نوبت با موفقیت تأیید شد.');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'خطا در تأیید نوبت');
    },
  });
};

export const useCancelBooking = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => cancelBooking(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['barber-bookings'] });
      queryClient.invalidateQueries({ queryKey: myBookingKeys.all });
      toast.success('نوبت با موفقیت لغو شد.');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'خطا در لغو نوبت');
    },
  });
};

/* ─────────────── نوبت‌های من (سمت کاربر) ─────────────── */

export const myBookingKeys = {
  all: ['my-bookings'] as const,
  list: (params: MyBookingsQuery) => ['my-bookings', params] as const,
};

export const useMyBookings = (params: MyBookingsQuery = {}) => {
  return useQuery({
    queryKey: myBookingKeys.list(params),
    queryFn: () => getMyBookings(params),
    staleTime: 30 * 1000,
  });
};
