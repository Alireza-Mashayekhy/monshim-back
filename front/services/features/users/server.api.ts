import { serverFetch } from '@/services/api/server';

import { UserResponse } from './types';

export async function getMe() {
  return serverFetch<UserResponse>('/auth/me');
}
