// app/(dashboard)/financial/page.tsx
'use client';

import { ArrowDownLeft, Plus, Wallet } from 'lucide-react';
import { useState } from 'react';

import { CardModal } from '@/components/dashboard/financial/cardModal';
import { WithdrawModal } from '@/components/dashboard/financial/withdrawModal';
import DashboardShell from '@/components/dashboard/layout/dashboard-shell';
import AppCard from '@/components/shared/app-card';
import FadeIn from '@/components/shared/fade-in';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatPrice } from '@/lib/utils';
import {
  useTransactions,
  useWalletBalance,
} from '@/services/features/wallet/hooks';

export default function FinancialPage() {
  const [showCardModal, setShowCardModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);

  const {
    data: balanceData,
    isLoading: balanceLoading,
    error: balanceError,
  } = useWalletBalance();

  const { data: transactionsData, isLoading: transactionsLoading } =
    useTransactions(1, 10);

  const balance = balanceData?.data?.balance || 0;

  if (balanceError) {
    return (
      <DashboardShell>
        <div className="text-center py-10 text-red-500">
          خطا در بارگذاری اطلاعات مالی. لطفاً مجدداً تلاش کنید.
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <FadeIn>
        <AppCard className="bg-gradient-to-br from-primary to-primary-700 text-white">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-white/70">موجودی کیف پول</p>
              {balanceLoading ? (
                <Skeleton className="h-10 w-32 bg-white/20 mt-2" />
              ) : (
                <h2 className="mt-2 text-4xl font-bold">
                  {formatPrice(balance)}
                </h2>
              )}
              <p className="text-white/70 text-sm">تومان</p>
            </div>
            <Wallet size={32} className="text-white/50" />
          </div>
          <div className="mt-6 flex gap-3">
            <Button
              variant="secondary"
              className="flex-1 text-primary"
              onClick={() => setShowWithdrawModal(true)}
              disabled={balance <= 0}
            >
              <ArrowDownLeft size={16} /> درخواست تسویه
            </Button>
            <Button
              variant="secondary"
              className="flex-1 text-primary"
              onClick={() => setShowCardModal(true)}
            >
              <Plus size={16} /> مدیریت کارت‌ها
            </Button>
          </div>
        </AppCard>
      </FadeIn>

      <FadeIn delay={0.1}>
        <h3 className="font-bold text-gray-800 text-sm mb-3">
          تراکنش‌های اخیر
        </h3>
        <div className="space-y-3">
          {transactionsLoading ? (
            <>
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-16 w-full rounded-2xl" />
              ))}
            </>
          ) : transactionsData?.data && transactionsData?.data?.length > 0 ? (
            transactionsData.data.slice(0, 10).map(t => (
              <AppCard key={t.id} className="flex justify-between items-center">
                <div>
                  <p className="font-bold text-gray-800 text-sm">
                    {t.description}
                  </p>
                  <span className="text-xs text-gray-400">
                    {new Date(t.createdAt).toLocaleDateString('fa-IR')}
                  </span>
                </div>
                <span
                  className={`text-sm font-bold ${
                    t.type === 'DEPOSIT' || t.type === 'INCOME'
                      ? 'text-green-600'
                      : 'text-red-500'
                  }`}
                >
                  {t.type === 'DEPOSIT' || t.type === 'INCOME' ? '+' : '-'}
                  {formatPrice(t.amount)}
                </span>
              </AppCard>
            ))
          ) : (
            <p className="text-gray-400 text-center py-6 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
              تراکنشی یافت نشد
            </p>
          )}
        </div>
      </FadeIn>

      <CardModal open={showCardModal} onOpenChange={setShowCardModal} />
      <WithdrawModal
        open={showWithdrawModal}
        onOpenChange={setShowWithdrawModal}
        balance={balance}
      />
    </DashboardShell>
  );
}
