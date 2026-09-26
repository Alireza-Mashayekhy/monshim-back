import { api } from '@/services/api/client';
import { endpoints } from '@/services/api/endpoints';
import { ApiListResponse, ApiSingleResponse } from '@/services/api/types';

import {
  BarberProfile,
  BarberResponse,
  BarberReview,
  ModerateBarberReviewDto,
  ReviewBarberDto,
  UpdateBarberProfile,
} from './types';

export async function notApprovedBarberList(query?: {
  page: number;
  limit: number;
  search?: string;
}) {
  const { data } = await api.get<ApiListResponse<BarberResponse>>(
    endpoints.barber.admin.list,
    {
      params: query,
    },
  );

  return data;
}

export const getBarberById = async (id: string) => {
  const url = endpoints.barber.admin.detail(id);
  const { data } = await api.get<ApiSingleResponse<BarberProfile>>(url);
  return data;
};

export const updateBarber = async (dto: UpdateBarberProfile) => {
  const { data } = await api.patch<ApiSingleResponse<BarberProfile>>(
    endpoints.barber.admin.update,
    dto,
  );
  return data;
};

export const deleteBarber = async () => {
  const { data } = await api.delete<ApiSingleResponse<BarberProfile>>(
    endpoints.barber.admin.remove,
  );
  return data;
};

export async function reviewBarber(id: string, dto: ReviewBarberDto) {
  const { data } = await api.patch<ApiSingleResponse<BarberResponse>>(
    endpoints.barber.admin.review(id),
    dto,
  );

  return data;
}

export async function barberReviewListAdmin(query?: {
  page?: number;
  limit?: number;
  status?: 'pending' | 'approved' | 'rejected';
  search?: string;
}) {
  const { data } = await api.get<ApiListResponse<BarberReview>>(
    endpoints.barber.adminReviews.list,
    {
      params: query,
    },
  );

  return data;
}

export async function moderateBarberReview(
  id: string,
  dto: ModerateBarberReviewDto,
) {
  const { data } = await api.patch<ApiSingleResponse<BarberReview>>(
    endpoints.barber.adminReviews.moderate(id),
    dto,
  );

  return data;
}
