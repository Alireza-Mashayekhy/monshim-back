import type { ApiSingleResponse, PaginationMeta } from '@/services/api/types';

export type AdminWithdrawalStatus = 'PENDING' | 'COMPLETED' | 'FAILED';

export interface AdminWithdrawalUser {
  id: number;
  fullName: string;
  phone: string;
  roles: string[];
  salonName: string | null;
}

export interface AdminWithdrawalCard {
  id: string;
  bankName: string;
  cardNumber: string;
  shebaNumber: string | null;
  ownerName: string;
  isDefault: boolean;
}

export interface AdminWithdrawal {
  id: string;
  amount: number;
  status: AdminWithdrawalStatus;
  description: string | null;
  requestedAt: string;
  /** موجودی کیف پول؛ مبلغ درخواست قبلاً از آن کسر شده است. */
  walletBalance: number;
  user: AdminWithdrawalUser | null;
  card: AdminWithdrawalCard | null;
}

export interface AdminWithdrawalSummary {
  totalCount: number;
  totalAmount: number;
  pendingCount: number;
  pendingAmount: number;
  completedCount: number;
  completedAmount: number;
  rejectedCount: number;
  rejectedAmount: number;
}

export interface AdminWithdrawalFilters {
  page: number;
  limit: number;
  status?: AdminWithdrawalStatus;
  search?: string;
  from?: string;
  to?: string;
}

export interface AdminWithdrawalsResponse extends ApiSingleResponse<{
  withdrawals: AdminWithdrawal[];
  summary: AdminWithdrawalSummary;
}> {
  pagination: PaginationMeta;
}

export interface ReviewAdminWithdrawalInput {
  id: string;
  /** شناسهٔ پیگیری واریز (برای تایید) */
  transferReference?: string;
  /** دلیل رد (برای رد کردن) */
  reason?: string;
}
