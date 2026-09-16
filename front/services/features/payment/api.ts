import { api } from '@/services/api/client';
import { endpoints } from '@/services/api/endpoints';
import { ApiSingleResponse } from '@/services/api/types';

import {
  InitiateBookingPaymentDto,
  InitiatePaymentResponse,
  InitiateSubscriptionPaymentDto,
  PaymentStatusResponse,
} from './types';

// درخواست پرداخت آنلاین اشتراک با درگاه زیبال
export async function paySubscription(dto: InitiateSubscriptionPaymentDto) {
  const { data } = await api.post<ApiSingleResponse<InitiatePaymentResponse>>(
    endpoints.payment.subscription,
    dto,
  );
  return data;
}

// درخواست پرداخت آنلاین نوبت (رزرو بیعانه/کل مبلغ) با درگاه زیبال
export async function payBooking(dto: InitiateBookingPaymentDto) {
  const { data } = await api.post<ApiSingleResponse<InitiatePaymentResponse>>(
    endpoints.payment.booking,
    dto,
  );
  return data;
}

// استعلام وضعیت پرداخت
export async function getPaymentStatus(trackId: number | string) {
  const { data } = await api.get<ApiSingleResponse<PaymentStatusResponse>>(
    endpoints.payment.status(trackId),
  );
  return data;
}
