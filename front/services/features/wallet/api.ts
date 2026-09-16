// services/features/wallet/api.ts
import { api } from '@/services/api/client';
import { ApiListResponse, ApiSingleResponse } from '@/services/api/types';

import { BankCard, Transaction, WalletBalance, WithdrawRequest } from './types';

export const walletApi = {
  // دریافت موجودی
  getBalance: async () => {
    const { data } =
      await api.get<ApiSingleResponse<WalletBalance>>('/wallet/balance');
    return data;
  },

  // دریافت تراکنش‌ها
  getTransactions: async (params?: { page?: number; limit?: number }) => {
    const { data } = await api.get<ApiListResponse<Transaction>>(
      '/wallet/transactions',
      { params },
    );
    return data;
  },

  // درخواست برداشت
  requestWithdraw: async (
    dto: WithdrawRequest,
  ): Promise<{ message: string }> => {
    const { data } = await api.post('/wallet/withdraw', dto);
    return data;
  },

  // دریافت کارت‌های بانکی
  getCards: async () => {
    const { data } = await api.get<ApiListResponse<BankCard>>('/wallet/cards');
    return data;
  },

  // افزودن کارت بانکی
  addCard: async (
    dto: Omit<BankCard, 'id' | 'isDefault'>,
  ): Promise<BankCard> => {
    const { data } = await api.post('/wallet/cards', dto);
    return data;
  },

  // حذف کارت بانکی
  deleteCard: async (id: string): Promise<void> => {
    await api.delete(`/wallet/cards/${id}`);
  },
};
