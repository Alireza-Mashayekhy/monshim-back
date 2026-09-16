import { serverFetch } from '@/services/api/server';
import { ApiSingleResponse } from '@/services/api/types';

import { UserResponse } from './types';

export async function getMe() {
  return serverFetch<ApiSingleResponse<UserResponse>>('auth/me');
}
