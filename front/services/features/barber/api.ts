import { getImageUploadError } from '@/lib/image-upload';
import { api } from '@/services/api/client';
import { endpoints } from '@/services/api/endpoints';
import { ApiListResponse, ApiSingleResponse } from '@/services/api/types';

import {
  Barber,
  BarberProfile,
  BarberResponse,
  UpdateBarberProfile,
  WorkHours,
} from './types';

export async function barberList(query?: {
  page: number;
  limit: number;
  cityId?: number;
  search?: string;
}) {
  const { data } = await api.get<ApiListResponse<BarberResponse>>(
    endpoints.barber.list,
    {
      params: query,
    },
  );

  return data;
}

export const getBarberById = async (id: number) => {
  const url = endpoints.barber.detail(id);
  const { data } = await api.get<ApiSingleResponse<Barber>>(url);
  return data;
};

export const getMyBarberProfile = async () => {
  const { data } = await api.get<ApiSingleResponse<BarberProfile>>(
    endpoints.barber.myPofile,
  );
  return data;
};

export const updateBarberProfile = async (dto: UpdateBarberProfile) => {
  const { data } = await api.patch<ApiSingleResponse<BarberProfile>>(
    endpoints.barber.updateProfile,
    dto,
  );
  return data;
};

export const uploadProfileImage = async (file: File): Promise<string> => {
  const validationError = getImageUploadError(file);
  if (validationError) throw new Error(validationError);
  const formData = new FormData();
  formData.append('image', file);
  const { data } = await api.post(
    endpoints.barber.updateProfileImage,
    formData,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
    },
  );
  return data.imageUrl;
};

export const getWorkHours = async () => {
  const { data } = await api.get<ApiListResponse<WorkHours>>(
    endpoints.barber.workHours,
  );
  return data;
};

export const updateWorkHours = async (dto: { hours: WorkHours[] }) => {
  const { data } = await api.post<ApiListResponse<WorkHours>>(
    endpoints.barber.updateWorkHours,
    dto,
  );
  return data;
};

export const getMyReferralCode = async () => {
  const { data } = await api.get(endpoints.barber.referralCode);
  return data;
};

export const getMyReferrals = async () => {
  const { data } = await api.get(endpoints.referral.myReferrals);
  return data;
};
