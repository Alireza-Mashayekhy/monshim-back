import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  approveAdminWithdrawal,
  getAdminWithdrawals,
  rejectAdminWithdrawal,
} from './api';
import type {
  AdminWithdrawalFilters,
  ReviewAdminWithdrawalInput,
} from './types';

const WITHDRAWALS_KEY = 'admin-withdrawals' as const;

export const adminWithdrawalKeys = {
  all: [WITHDRAWALS_KEY] as const,
  list: (filters: AdminWithdrawalFilters) =>
    [WITHDRAWALS_KEY, 'list', filters] as const,
  summary: [WITHDRAWALS_KEY, 'summary'] as const,
};

export function useAdminWithdrawals(
  filters: AdminWithdrawalFilters,
  enabled = true,
) {
  return useQuery({
    queryKey: adminWithdrawalKeys.list(filters),
    queryFn: () => getAdminWithdrawals(filters),
    staleTime: 30 * 1000,
    enabled,
  });
}

/**
 * تعداد درخواست‌های برداشتِ در انتظار برای نشان‌دادن در منوی ادمین.
 * از همان endpoint لیست استفاده می‌کند تا شمارنده با صفحه یکی باشد.
 */
export function usePendingWithdrawalsCount(enabled = true) {
  return useQuery({
    queryKey: adminWithdrawalKeys.summary,
    queryFn: () => getAdminWithdrawals({ page: 1, limit: 1 }),
    select: response => response.data.summary.pendingCount,
    staleTime: 60 * 1000,
    enabled,
  });
}

function invalidateWithdrawalCaches(
  queryClient: ReturnType<typeof useQueryClient>,
) {
  queryClient.invalidateQueries({ queryKey: adminWithdrawalKeys.all });
  queryClient.invalidateQueries({ queryKey: ['admin-transactions'] });
  queryClient.invalidateQueries({ queryKey: ['wallet-transactions'] });
  queryClient.invalidateQueries({ queryKey: ['wallet-balance'] });
}

export function useApproveAdminWithdrawal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ReviewAdminWithdrawalInput) =>
      approveAdminWithdrawal(input),
    onSuccess: () => invalidateWithdrawalCaches(queryClient),
  });
}

export function useRejectAdminWithdrawal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ReviewAdminWithdrawalInput) =>
      rejectAdminWithdrawal(input),
    onSuccess: () => invalidateWithdrawalCaches(queryClient),
  });
}
