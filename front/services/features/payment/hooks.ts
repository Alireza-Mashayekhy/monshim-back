import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

import {
  getDepositInvoice,
  getPaymentStatus,
  payBooking,
  payDepositByToken,
  payPublicPage,
  paySubscription,
} from './api';
import {
  InitiateBookingPaymentDto,
  InitiateSubscriptionPaymentDto,
} from './types';

export const usePaySubscription = () => {
  return useMutation({
    mutationFn: (dto: InitiateSubscriptionPaymentDto) => paySubscription(dto),
    onSuccess: response => {
      const paymentUrl = response.data?.paymentUrl;
      if (paymentUrl) {
        toast.info('در حال انتقال به درگاه پرداخت زیبال...');
        window.location.href = paymentUrl;
      }
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || 'خطا در ارتباط با درگاه پرداخت',
      );
    },
  });
};

/** خرید یک‌بارهٔ پکیج صفحهٔ عمومی آرایشگاه (۷۹۹ هزار تومان) */
export const usePayPublicPage = () => {
  return useMutation({
    mutationFn: () => payPublicPage(),
    onSuccess: response => {
      const paymentUrl = response.data?.paymentUrl;
      if (paymentUrl) {
        toast.info('در حال انتقال به درگاه پرداخت زیبال...');
        window.location.href = paymentUrl;
      }
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || 'خطا در ارتباط با درگاه پرداخت',
      );
    },
  });
};

export const usePayBooking = () => {
  return useMutation({
    mutationFn: (dto: InitiateBookingPaymentDto) => payBooking(dto),
    onSuccess: response => {
      const paymentUrl = response.data?.paymentUrl;
      if (paymentUrl) {
        toast.info('در حال انتقال به درگاه پرداخت زیبال...');
        window.location.href = paymentUrl;
      }
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || 'خطا در ایجاد درخواست پرداخت نوبت',
      );
    },
  });
};

export const useDepositInvoice = (token: string | null) => {
  return useQuery({
    queryKey: ['deposit-invoice', token],
    queryFn: () => getDepositInvoice(token!),
    enabled: Boolean(token),
    staleTime: 0,
    retry: false,
  });
};

export const usePayDeposit = (token: string) => {
  return useMutation({
    mutationFn: () => payDepositByToken(token),
    onSuccess: response => {
      const paymentUrl = response.data?.paymentUrl;
      if (paymentUrl) {
        toast.info('در حال انتقال به درگاه امن پرداخت...');
        window.location.href = paymentUrl;
      }
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || 'خطا در اتصال به درگاه پرداخت',
      );
    },
  });
};

export const usePaymentStatus = (trackId: number | string | null) => {
  return useQuery({
    queryKey: ['payment-status', trackId],
    queryFn: () => getPaymentStatus(trackId!),
    enabled: !!trackId,
    staleTime: 0,
  });
};
