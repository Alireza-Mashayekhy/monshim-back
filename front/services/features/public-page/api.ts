import { api } from '@/services/api/client';
import { endpoints } from '@/services/api/endpoints';
import { ApiSingleResponse } from '@/services/api/types';

import {
  PublicPageDiscountQuote,
  PublicPageStatus,
  SlugAvailabilityResult,
} from './types';

/** وضعیت صفحهٔ عمومیِ آرایشگرِ جاری (فعال/غیرفعال، اسلاگ و پیشرفت به سمت حد نصاب) */
export async function getMyPublicPageStatus() {
  const { data } = await api.get<ApiSingleResponse<PublicPageStatus>>(
    endpoints.publicPage.me,
  );
  return data;
}

/** بررسی آزاد و غیرتکراری بودن اسلاگ پیشنهادی */
export async function checkPublicPageSlug(slug: string) {
  const { data } = await api.get<ApiSingleResponse<SlugAvailabilityResult>>(
    endpoints.publicPage.checkSlug,
    { params: { slug } },
  );
  return data;
}

/** بررسی کد تخفیف و محاسبهٔ قیمت خرید صفحهٔ عمومی */
export async function quotePublicPageDiscount(code: string) {
  const { data } = await api.post<ApiSingleResponse<PublicPageDiscountQuote>>(
    endpoints.publicPage.discountQuote,
    { code },
  );
  return data;
}

/** ثبت یا ویرایش اسلاگ یکتای صفحهٔ اختصاصی آرایشگر */
export async function updateMyPublicPageSlug(slug: string) {
  const { data } = await api.patch<ApiSingleResponse<PublicPageStatus>>(
    endpoints.publicPage.updateSlug,
    { slug },
  );
  return data;
}
