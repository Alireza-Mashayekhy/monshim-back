import { api } from '@/services/api/client';
import { endpoints } from '@/services/api/endpoints';

import type {
  AdminWithdrawalFilters,
  AdminWithdrawalsResponse,
  ReviewAdminWithdrawalInput,
} from './types';

export async function getAdminWithdrawals(
  filters: AdminWithdrawalFilters,
): Promise<AdminWithdrawalsResponse> {
  const { data } = await api.get<AdminWithdrawalsResponse>(
    endpoints.adminWithdrawals.list,
    { params: filters },
  );
  return data;
}

export async function approveAdminWithdrawal({
  id,
  transferReference,
}: ReviewAdminWithdrawalInput) {
  const { data } = await api.patch(endpoints.adminWithdrawals.approve(id), {
    transferReference: transferReference?.trim() || undefined,
  });
  return data;
}

export async function rejectAdminWithdrawal({
  id,
  reason,
}: ReviewAdminWithdrawalInput) {
  const { data } = await api.patch(endpoints.adminWithdrawals.reject(id), {
    reason: reason?.trim() || undefined,
  });
  return data;
}
