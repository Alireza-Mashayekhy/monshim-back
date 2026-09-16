'use client';

import { useMemo } from 'react';

import { useBarberBookings } from '@/services/features/booking/hooks';
import { useWalletBalance } from '@/services/features/wallet/hooks';

export const useDashboardStats = () => {
  const walletQuery = useWalletBalance();

  const bookingsQuery = useBarberBookings({
    page: 1,
    limit: 100,
  });

  const stats = useMemo(() => {
    const bookings = Array.isArray(bookingsQuery.data)
      ? bookingsQuery.data
      : (bookingsQuery.data?.data ?? []);

    const today = new Date();

    const todayBookings = bookings.filter((booking: any) => {
      const date = new Date(booking.date);

      return (
        date.getFullYear() === today.getFullYear() &&
        date.getMonth() === today.getMonth() &&
        date.getDate() === today.getDate()
      );
    });

    const uniqueCustomers = new Set(
      bookings.map((booking: any) => booking.customerId).filter(Boolean),
    );

    return {
      todayAppointments: todayBookings.length,
      customers: uniqueCustomers.size,

      // فعلاً تا endpoint درآمد نداشته باشیم
      // از داده ساختگی استفاده نمی‌کنیم.
      todayRevenue: null,

      // تا endpoint پروفایل/امتیاز مشخص نباشد
      rating: null,
    };
  }, [bookingsQuery.data]);

  return {
    stats,
    balance: walletQuery.data,

    isLoading: walletQuery.isLoading || bookingsQuery.isLoading,

    isError: walletQuery.isError || bookingsQuery.isError,

    refetch: () => {
      walletQuery.refetch();
      bookingsQuery.refetch();
    },
  };
};
