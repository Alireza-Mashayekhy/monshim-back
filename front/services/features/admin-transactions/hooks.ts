import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  exportAdminTransactions,
  getAdminTransactions,
  settleAdminRefund,
} from './api';
import { AdminTransactionFilters, SettleAdminRefundInput } from './types';

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
