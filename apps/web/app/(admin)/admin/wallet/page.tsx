import type { Metadata } from 'next';

import AdminTransactionsPage from '@/components/admin/transactions/transactions-page';

export const metadata: Metadata = {
  title: 'تراکنش‌ها و گزارش مالی',
  description: 'گزارش جامع پرداخت‌ها، کمیسیون و گردش کیف پول',
};

export default function AdminWalletPage() {
  return <AdminTransactionsPage />;
}
