import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  approveAdminWithdrawal,
  exportAdminTransactions,
  getAdminTransactions,
  rejectAdminWithdrawal,
  settleAdminRefund,
} from './api';
import {
  AdminTransactionFilters,
  ReviewWithdrawalInput,
  SettleAdminRefundInput,
} from './types';

export const adminTransactionKeys = {
  all: ['admin-transactions'] as const,
  list: (filters: AdminTransactionFilters) =>
    [...adminTransactionKeys.all, filters] as const,
};

export function useAdminTransactions(
  filters: AdminTransactionFilters,
  enabled = true,
) {
  return useQuery({
    queryKey: adminTransactionKeys.list(filters),
    queryFn: () => getAdminTransactions(filters),
    staleTime: 30 * 1000,
    enabled,
  });
}

export function useExportAdminTransactions() {
  return useMutation({ mutationFn: exportAdminTransactions });
}

export function useSettleAdminRefund() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SettleAdminRefundInput) => settleAdminRefund(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminTransactionKeys.all });
      queryClient.invalidateQueries({ queryKey: ['wallet-transactions'] });
    },
  });
}

function invalidateTransactionCaches(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: adminTransactionKeys.all });
  queryClient.invalidateQueries({ queryKey: ['wallet-transactions'] });
  queryClient.invalidateQueries({ queryKey: ['wallet-balance'] });
}

export function useApproveAdminWithdrawal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ReviewWithdrawalInput) =>
      approveAdminWithdrawal(input),
    onSuccess: () => invalidateTransactionCaches(queryClient),
  });
}

export function useRejectAdminWithdrawal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ReviewWithdrawalInput) => rejectAdminWithdrawal(input),
    onSuccess: () => invalidateTransactionCaches(queryClient),
  });
}
