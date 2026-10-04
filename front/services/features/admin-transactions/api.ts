import { api } from '@/services/api/client';
import { endpoints } from '@/services/api/endpoints';
import type { ApiSingleResponse } from '@/services/api/types';

import type {
  AdminTransaction,
  AdminTransactionExportData,
  AdminTransactionFilters,
  AdminTransactionsResponse,
  SettleAdminRefundInput,
} from './types';

export async function getAdminTransactions(
  filters: AdminTransactionFilters,
): Promise<AdminTransactionsResponse> {
  const { data } = await api.get<AdminTransactionsResponse>(
    endpoints.adminTransactions.list,
    { params: filters },
  );
  return data;
}

export async function settleAdminRefund({
  id,
  transferReference,
}: SettleAdminRefundInput) {
  const { data } = await api.patch(
    endpoints.adminTransactions.settleRefund(id),
    { transferReference: transferReference.trim() || undefined },
  );
  return data;
}

function getTypeLabel(transaction: AdminTransaction) {
  if (transaction.isCustomerRefundRequest) {
    return 'بازپرداخت دستی به مشتری';
  }
  if (
    transaction.source === 'wallet' &&
    transaction.type === 'WITHDRAWAL' &&
    transaction.description?.startsWith('کسر کیف پول آرایشگر بابت لغو رزرو')
  ) {
    return 'کسر بابت لغو رزرو آرایشگر';
  }

  if (transaction.source === 'gateway') {
    switch (transaction.type) {
      case 'SUBSCRIPTION':
        return 'خرید اشتراک';
      case 'BOOKING':
        return 'پرداخت رزرو';
      case 'WALLET':
        return 'شارژ کیف پول';
      default:
        return transaction.type;
    }
  }

  switch (transaction.type) {
    case 'DEPOSIT':
      if (transaction.description?.startsWith('درآمد رزرو نوبت')) {
        return 'واریز درآمد رزرو به آرایشگر';
      }
      if (transaction.description?.includes('پاداش دعوت')) {
        return 'پاداش دعوت';
      }
      if (transaction.description?.includes('شارژ آنلاین کیف پول')) {
        return 'شارژ کیف پول';
      }
      return 'واریز به کیف پول';
    case 'WITHDRAWAL':
      return 'برداشت از کیف پول';
    case 'INCOME':
      return 'درآمد کیف پول';
    case 'REFUND':
      return 'بازگشت وجه';
    default:
      return transaction.type;
  }
}

function getStatusLabel(status: AdminTransaction['status']) {
  switch (status) {
    case 'PAID':
      return 'موفق';
    case 'COMPLETED':
      return 'انجام‌شده';
    case 'PENDING':
      return 'در انتظار';
    case 'FAILED':
      return 'ناموفق';
    case 'CANCELED':
      return 'لغوشده';
  }
}

export async function exportAdminTransactions(
  filters: Omit<AdminTransactionFilters, 'page' | 'limit'>,
) {
  const { data: response } = await api.get<
    ApiSingleResponse<AdminTransactionExportData>
  >(endpoints.adminTransactions.export, { params: filters });
  const xlsx = await import('xlsx');
  const { transactions, summary } = response.data;

  const transactionRows: (string | number)[][] = [
    [
      'شناسه',
      'منبع',
      'نوع تراکنش',
      'وضعیت',
      'مبلغ (تومان)',
      'کمیسیون قطعی (تومان)',
      'کمیسیون برآوردی (تومان)',
      'مبلغ خدمات (تومان)',
      'سهم آرایشگر (تومان)',
      'نام کاربر',
      'شماره موبایل',
      'نقش کاربر',
      'نام سالن',
      'شرح',
      'شناسه سفارش',
      'شناسه پیگیری درگاه',
      'شماره مرجع',
      'شناسه مرجع',
      'شماره کارت',
      'تاریخ ثبت',
      'تاریخ پرداخت',
      'پرچم بازپرداخت دستی',
    ],
    ...transactions.map(transaction => [
      transaction.id,
      transaction.source === 'gateway' ? 'درگاه پرداخت' : 'کیف پول',
      getTypeLabel(transaction),
      getStatusLabel(transaction.status),
      transaction.amount,
      transaction.commissionAmount ?? 'نامشخص',
      transaction.estimatedCommissionAmount ?? 'نامشخص',
      transaction.serviceAmount ?? '',
      transaction.barberAmount ?? '',
      transaction.user?.fullName ?? '',
      transaction.user?.phone ?? '',
      transaction.user?.roles.join('، ') ?? '',
      transaction.user?.salonName ?? '',
      transaction.description ?? '',
      transaction.orderId ?? '',
      transaction.trackId ?? '',
      transaction.referenceNumber ?? '',
      transaction.referenceId ?? '',
      transaction.cardNumber ?? '',
      transaction.createdAt,
      transaction.paidAt ?? '',
      transaction.isCustomerRefundRequest ? 'بازپرداخت دستی به مشتری' : '',
    ]),
  ];

  const transactionSheet = xlsx.utils.aoa_to_sheet(transactionRows);
  transactionSheet['!cols'] = [
    { wch: 20 },
    { wch: 16 },
    { wch: 28 },
    { wch: 16 },
    { wch: 18 },
    { wch: 22 },
    { wch: 24 },
    { wch: 20 },
    { wch: 20 },
    { wch: 24 },
    { wch: 18 },
    { wch: 18 },
    { wch: 24 },
    { wch: 36 },
    { wch: 24 },
    { wch: 24 },
    { wch: 24 },
    { wch: 24 },
    { wch: 20 },
    { wch: 24 },
    { wch: 24 },
    { wch: 28 },
  ];
  transactionSheet['!autofilter'] = {
    ref: `A1:V${Math.max(transactionRows.length, 1)}`,
  };

  const summaryRows: (string | number)[][] = [
    ['شاخص مالی', 'مقدار'],
    ['تعداد کل تراکنش‌های مطابق فیلتر', summary.matchedCount],
    ['دریافتی موفق از درگاه (تومان)', summary.gatewayReceivedAmount],
    ['تعداد پرداخت موفق درگاه', summary.successfulGatewayPaymentCount],
    ['پرداخت رزرو از درگاه (تومان)', summary.bookingPaymentsAmount],
    ['کمیسیون قطعی رزروهای موفق (تومان)', summary.bookingCommissionAmount],
    [
      'پرداخت‌های رزرو با کمیسیون نامشخص',
      summary.bookingCommissionUnknownCount,
    ],
    ['درآمد اشتراک (تومان)', summary.subscriptionRevenueAmount],
    ['شارژ کیف پول از درگاه (تومان)', summary.walletTopUpAmount],
    [
      'واریزی درآمد رزرو به آرایشگران (تومان)',
      summary.barberWalletCreditsAmount,
    ],
    ['برداشت‌های در انتظار (تومان)', summary.pendingWithdrawalsAmount],
    ['تعداد برداشت‌های در انتظار', summary.pendingWithdrawalCount],
    ['برداشت‌های انجام‌شده (تومان)', summary.completedWithdrawalsAmount],
    [
      'کسر از کیف پول آرایشگر بابت لغو رزرو (تومان)',
      summary.barberCancellationDebitsAmount,
    ],
    [
      'تعداد لغوهای دارای کسر از کیف پول آرایشگر',
      summary.barberCancellationDebitCount,
    ],
    ['کل مبالغ در انتظار (تومان)', summary.pendingAmount],
    ['تراکنش‌های ناموفق یا لغوشده (تومان)', summary.unsuccessfulAmount],
    ['تعداد تراکنش‌های ناموفق یا لغوشده', summary.unsuccessfulCount],
    ['تعداد تراکنش‌های در انتظار', summary.pendingCount],
    [
      'یادداشت',
      'شاخص‌های خلاصه ممکن است هم‌پوشانی داشته باشند و نباید با هم جمع شوند: شارژ درگاه و ثبت کیف پول دو مرحلهٔ یک جریان‌اند و برداشت‌های در انتظار زیرمجموعهٔ کل مبالغ در انتظار هستند. کمیسیونِ بدون دادهٔ ثبت‌شده با عنوان نامشخص می‌ماند و صفر فرض نمی‌شود.',
    ],
  ];
  const summarySheet = xlsx.utils.aoa_to_sheet(summaryRows);
  summarySheet['!cols'] = [{ wch: 44 }, { wch: 110 }];

  const workbook = xlsx.utils.book_new();
  workbook.Props = {
    Title: 'گزارش تراکنش‌های مون‌شیم',
    Subject: 'گزارش جامع مالی و گردش کیف پول',
    Author: 'Monshim',
  };
  xlsx.utils.book_append_sheet(workbook, transactionSheet, 'تراکنش‌ها');
  xlsx.utils.book_append_sheet(workbook, summarySheet, 'خلاصه مالی');
  xlsx.writeFile(
    workbook,
    `monshim-transactions-${new Date().toISOString().slice(0, 10)}.xlsx`,
    { compression: true },
  );
}
