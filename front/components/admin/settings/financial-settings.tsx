'use client';

import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  useSiteSettings,
  useUpdateSiteSettings,
} from '@/services/features/settings/hooks';

export default function FinancialSettings() {
  const { data, isLoading } = useSiteSettings();

  const updateMutation = useUpdateSiteSettings();

  const [depositPercent, setDepositPercent] = useState('');

  const [totalAmountPercent, setTotalAmountPercent] = useState('');

  useEffect(() => {
    if (!data) return;

    setDepositPercent(String(data?.data?.depositPercent));

    setTotalAmountPercent(String(data?.data?.commissionPercent));
  }, [data]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    updateMutation.mutate({
      depositPercent: Number(depositPercent),
      commissionPercent: Number(totalAmountPercent),
    });
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border p-5" dir="rtl">
        در حال دریافت تنظیمات...
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border" dir="rtl">
      <div className="p-5 border-b">
        <h2 className="font-semibold text-lg">تنظیمات مالی</h2>

        <p className="text-sm text-muted-foreground mt-1">
          درصدهای مربوط به پرداخت و بیعانه را مشخص کنید.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="p-5 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-2">
            <Label>درصد بیعانه</Label>

            <div className="relative">
              <Input
                type="number"
                min={0}
                max={100}
                step="0.01"
                value={depositPercent}
                onChange={e => setDepositPercent(e.target.value)}
                className="pl-10"
              />

              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                %
              </span>
            </div>

            <p className="text-xs text-muted-foreground">
              درصدی از مبلغ کل که هنگام رزرو به عنوان بیعانه پرداخت می‌شود.
            </p>
          </div>

          <div className="space-y-2">
            <Label>درصد مبلغ کل</Label>

            <div className="relative">
              <Input
                type="number"
                min={0}
                max={100}
                step="0.01"
                value={totalAmountPercent}
                onChange={e => setTotalAmountPercent(e.target.value)}
                className="pl-10"
              />

              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                %
              </span>
            </div>

            <p className="text-xs text-muted-foreground">
              درصدی که از مبلغ کل رزرو محاسبه می‌شود.
            </p>
          </div>
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={updateMutation.isPending}>
            {updateMutation.isPending ? 'در حال ذخیره...' : 'ذخیره تنظیمات'}
          </Button>
        </div>
      </form>
    </div>
  );
}
