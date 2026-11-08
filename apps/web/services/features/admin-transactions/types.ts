import type { ApiSingleResponse, PaginationMeta } from '@/services/api/types';

export type AdminTransactionSource = 'gateway' | 'wallet';

export type AdminTransactionType =
  | 'SUBSCRIPTION'
  | 'BOOKING'
  | 'WALLET'
  | 'PUBLIC_PAGE'
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
  /** مجموع پرداخت‌های موفقِ برگشت‌نخوردهٔ درگاه */
  gatewayReceivedAmount: number;
  successfulGatewayPaymentCount: number;
  /** پرداخت رزروهای موفق و برگشت‌نخورده (شامل کمیسیون) */
  bookingPaymentsAmount: number;
  bookingCommissionAmount: number;
  bookingCommissionUnknownCount: number;
  subscriptionRevenueAmount: number;
  publicPageRevenueAmount: number;
  publicPageCount: number;
  walletTopUpAmount: number;
  netRevenueAmount: number;
  /** درآمد رزروی که واقعاً در کیف پول آرایشگر مانده است */
  barberWalletCreditsAmount: number;
  pendingWithdrawalsAmount: number;
  pendingWithdrawalCount: number;
  completedWithdrawalsAmount: number;
  /** بازپرداخت‌های مشتری که هنوز دستی واریز نشده‌اند (در کارت‌ها جمع زده نمی‌شود) */
  pendingCustomerRefundsAmount: number;
  pendingCustomerRefundCount: number;
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

export interface ReviewWithdrawalInput {
  id: string;
  /** شناسهٔ پیگیری واریز (برای تایید) */
  transferReference?: string;
  /** دلیل رد (برای رد کردن) */
  reason?: string;
}

export interface AdminTransactionsResponse extends ApiSingleResponse<{
  transactions: AdminTransaction[];
  summary: AdminTransactionSummary;
}> {
  pagination: PaginationMeta;
}
