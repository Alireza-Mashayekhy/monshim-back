import type { Metadata } from 'next';

import AdminWithdrawalsPage from '@/components/admin/withdrawals/withdrawals-page';

export const metadata: Metadata = {
  title: 'درخواست‌های برداشت',
  description: 'بررسی و تعیین وضعیت درخواست‌های برداشت آرایشگران از کیف پول',
};

export default function AdminWithdrawalsRoutePage() {
  return <AdminWithdrawalsPage />;
}
