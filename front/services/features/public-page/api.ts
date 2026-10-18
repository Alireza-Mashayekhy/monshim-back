import { api } from '@/services/api/client';
import { endpoints } from '@/services/api/endpoints';
import { ApiSingleResponse } from '@/services/api/types';

import {
  PublicPagePaymentResponse,
  PublicPageStatus,
} from './types';

// وضعیت صفحهٔ عمومی آرایشگر متصل
export async function getPublicPageStatus() {
  const { data } = await api.get<ApiSingleResponse<PublicPageStatus>>(
    endpoints.barber.publicPageStatus,
  );

  return data;
}

// شروع خرید پکیج صفحه عمومی با درگاه زیبال
export async function payPublicPagePackage() {
  const { data } = await api.post<
    ApiSingleResponse<PublicPagePaymentResponse>
  >(endpoints.payment.publicPage);

  return data;
}
