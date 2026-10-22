import { api } from '@/services/api/client';
import { endpoints } from '@/services/api/endpoints';
import { ApiSingleResponse } from '@/services/api/types';

import {
  DepositInvoiceResponse,
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

// درخواست خرید پکیج «صفحهٔ عمومی آرایشگاه» با درگاه زیبال
export async function payPublicPage() {
  const { data } = await api.post<ApiSingleResponse<InitiatePaymentResponse>>(
    endpoints.payment.publicPage,
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

// دریافت صورت‌حساب لینک بیعانه
export async function getDepositInvoice(token: string) {
  const { data } = await api.get<ApiSingleResponse<DepositInvoiceResponse>>(
    endpoints.payment.depositInvoice(token),
  );
  return data.data;
}

// تایید صورت‌حساب بیعانه و شروع پرداخت درگاه
export async function payDepositByToken(token: string) {
  const { data } = await api.post<ApiSingleResponse<InitiatePaymentResponse>>(
    endpoints.payment.payDeposit(token),
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
