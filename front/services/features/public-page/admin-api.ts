import { api } from '@/services/api/client';
import { endpoints } from '@/services/api/endpoints';
import { ApiSingleResponse } from '@/services/api/types';

export interface PublicPageDiscount {
  id: string;
  code: string;
  percentOff: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export async function getPublicPageDiscounts() {
  const { data } = await api.get<ApiSingleResponse<PublicPageDiscount[]>>(
    endpoints.publicPage.adminDiscounts,
  );
  return data;
}

export async function createPublicPageDiscount(dto: {
  code: string;
  percentOff: number;
}) {
  const { data } = await api.post<ApiSingleResponse<PublicPageDiscount>>(
    endpoints.publicPage.adminDiscounts,
    dto,
  );
  return data;
}

export async function updatePublicPageDiscount(
  id: string,
  dto: Partial<Pick<PublicPageDiscount, 'code' | 'percentOff' | 'isActive'>>,
) {
  const { data } = await api.patch<ApiSingleResponse<PublicPageDiscount>>(
    endpoints.publicPage.adminDiscount(id),
    dto,
  );
  return data;
}

export async function deletePublicPageDiscount(id: string) {
  const { data } = await api.delete<ApiSingleResponse<{ id: string }>>(
    endpoints.publicPage.adminDiscount(id),
  );
  return data;
}
