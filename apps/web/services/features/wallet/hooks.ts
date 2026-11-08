// services/features/wallet/hooks.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { walletApi } from './api';
import { WithdrawRequest } from './types';

export const useWalletBalance = () => {
  return useQuery({
    queryKey: ['wallet-balance'],
    queryFn: walletApi.getBalance,
    staleTime: 30 * 1000, // ۳۰ ثانیه
  });
};

export const useTransactions = (page = 1, limit = 10) => {
  return useQuery({
    queryKey: ['wallet-transactions', page, limit],
    queryFn: () => walletApi.getTransactions({ page, limit }),
    staleTime: 60 * 1000,
  });
};

export const useBankCards = () => {
  return useQuery({
    queryKey: ['bank-cards'],
    queryFn: walletApi.getCards,
    staleTime: 5 * 60 * 1000,
  });
};

export const useWithdraw = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: WithdrawRequest) => walletApi.requestWithdraw(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallet-balance'] });
      queryClient.invalidateQueries({ queryKey: ['wallet-transactions'] });
      toast.success('درخواست برداشت با موفقیت ثبت شد.');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'خطا در ثبت درخواست برداشت');
    },
  });
};

export const useAddCard = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: walletApi.addCard,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-cards'] });
      toast.success('کارت بانکی با موفقیت افزوده شد.');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'خطا در افزودن کارت');
    },
  });
};

export const useDeleteCard = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: walletApi.deleteCard,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-cards'] });
      toast.success('کارت بانکی با موفقیت حذف شد.');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'خطا در حذف کارت');
    },
  });
};
