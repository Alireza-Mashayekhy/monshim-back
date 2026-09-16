import { api } from '@/services/api/client';
import { endpoints } from '@/services/api/endpoints';
import { ApiListResponse, ApiSingleResponse } from '@/services/api/types';

import { CreateServiceDto, Service, UpdateServiceDto } from './types';

export async function servicesList() {
  const { data } = await api.get<ApiListResponse<Service>>(
    endpoints.services.list,
  );

  return data;
}

export const deleteService = async (id: number) => {
  const { data } = await api.delete<ApiSingleResponse<Service>>(
    endpoints.services.delete(id),
  );
  return data;
};

export const editService = async (id: number, dto: UpdateServiceDto) => {
  const { data } = await api.patch<ApiSingleResponse<Service>>(
    endpoints.services.edit(id),
    dto,
  );
  return data;
};

export const createService = async (dto: CreateServiceDto) => {
  const { data } = await api.post<ApiSingleResponse<Service>>(
    endpoints.services.create,
    dto,
  );
  return data;
};
