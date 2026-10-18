import { api } from '@/services/api/client';
import { endpoints } from '@/services/api/endpoints';
import { ApiSingleResponse } from '@/services/api/types';

import { PublicPageStatus } from './types';

/** وضعیت صفحهٔ عمومیِ آرایشگرِ جاری (فعال/غیرفعال و پیشرفت به سمت حد نصاب) */
export async function getMyPublicPageStatus() {
  const { data } = await api.get<ApiSingleResponse<PublicPageStatus>>(
    endpoints.publicPage.me,
  );
  return data;
}
