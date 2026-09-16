import { api } from '@/services/api/client';
import { endpoints } from '@/services/api/endpoints';
import { ApiListResponse } from '@/services/api/types';

import { UserResponse } from './types';

export async function usersList(query: { page: number; search: string }) {
  const { data } = await api.get<ApiListResponse<UserResponse>>(
    endpoints.users.list,
    {
      params: query,
    },
  );

  return data;
}

export async function editUser(dto: { fullName: string; birthDate?: string | null }) {
  const { data } = await api.patch(endpoints.users.edit, dto);

  return data;
}
