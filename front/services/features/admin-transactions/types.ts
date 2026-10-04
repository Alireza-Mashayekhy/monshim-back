import type { ApiSingleResponse, PaginationMeta } from '@/services/api/types';

export type AdminTransactionSource = 'gateway' | 'wallet';

export type AdminTransactionType =
  | 'SUBSCRIPTION'
  | 'BOOKING'
  | 'WALLET'
  | 'DEPOSIT'
  | 'WITHDRAWAL'
  | 'INCOME'
  | 'REFUND';

export type AdminTransactionStatus =
  'PAID' | 'COMPLETED' | 'PENDING' | 'FAILED' | 'CANCELED';

export interface AdminTransactionUser {
  id: number;
  fullName: string;
  phone: string;
  roles: string[];
  salonName: string | null;
}

export interface AdminTransaction {
  id: string;
  source: AdminTransactionSource;
  isCustomerRefundRequest: boolean;
  type: AdminTransactionType;
  status: AdminTransactionStatus;
  amount: number;
  commissionAmount: number | null;
  estimatedCommissionAmount: number | null;
  serviceAmount: number | null;
  barberAmount: number | null;
  description: string | null;
  user: AdminTransactionUser | null;
  createdAt: string;
  paidAt: string | null;
  orderId: string | null;
  trackId: number | string | null;
  referenceNumber: string | null;
  referenceId: string | null;
  cardNumber: string | null;
}

export interface AdminTransactionExportData {
  transactions: AdminTransaction[];
  summary: AdminTransactionSummary;
}

export interface AdminTransactionSummary {
  matchedCount: number;
  gatewayReceivedAmount: number;
  successfulGatewayPaymentCount: number;
  bookingPaymentsAmount: number;
  bookingCommissionAmount: number;
  bookingCommissionUnknownCount: number;
  subscriptionRevenueAmount: number;
  walletTopUpAmount: number;
  barberWalletCreditsAmount: number;
  pendingWithdrawalsAmount: number;
  pendingWithdrawalCount: number;
  completedWithdrawalsAmount: number;
  barberCancellationDebitsAmount: number;
  barberCancellationDebitCount: number;
  pendingAmount: number;
  unsuccessfulAmount: number;
  unsuccessfulCount: number;
  pendingCount: number;
}

export interface AdminTransactionFilters {
  page: number;
  limit: number;
  source?: AdminTransactionSource;
  type?: AdminTransactionType;
  status?: AdminTransactionStatus;
  search?: string;
  from?: string;
  to?: string;
}

export interface SettleAdminRefundInput {
  id: string;
  transferReference: string;
}

export interface AdminTransactionsResponse extends ApiSingleResponse<{
  transactions: AdminTransaction[];
  summary: AdminTransactionSummary;
}> {
  pagination: PaginationMeta;
}
