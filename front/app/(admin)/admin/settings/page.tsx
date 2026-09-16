'use client';

import { Settings } from 'lucide-react';

import FinancialSettings from '@/components/admin/settings/financial-settings';
import SubscriptionSection from '@/components/admin/settings/subscription-section';

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-6" dir="rtl">
      <div>
        <div className="flex items-center gap-2">
          <Settings className="size-5" />

          <h1 className="text-2xl font-bold">تنظیمات</h1>
        </div>

        <p className="text-sm text-muted-foreground mt-2">
          مدیریت تنظیمات مالی و اشتراک‌های سایت
        </p>
      </div>

      <FinancialSettings />

      <SubscriptionSection />
    </div>
  );
}
