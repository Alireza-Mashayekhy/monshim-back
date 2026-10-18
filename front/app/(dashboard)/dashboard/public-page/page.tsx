// app/(dashboard)/public-page/page.tsx
'use client';

import {
  BadgeCheck,
  Check,
  ExternalLink,
  Globe,
  Loader2,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import DashboardShell from '@/components/dashboard/layout/dashboard-shell';
import AppCard from '@/components/shared/app-card';
import FadeIn from '@/components/shared/fade-in';
import PageHeader from '@/components/shared/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatFaNumber, toPersianDigits } from '@/lib/utils';
import { usePayPublicPage } from '@/services/features/payment/hooks';
import { useMyPublicPageStatus } from '@/services/features/public-page/hooks';

/**
 * صفحهٔ اختصاصی (عمومی) آرایشگاه در داشبورد.
 *
 * صفحهٔ عمومی با آدرس `/barber/[id]` وقتی فعال می‌شود که یکی از این دو شرط
 * برقرار باشد:
 *   • خرید یک‌بارهٔ پکیج ۵۹۹ هزار تومانی (مادام‌العمر)؛
 *   • یا ثبت ۳۰۰ نوبتِ پرداخت‌شده (بیعانهٔ پرداخت‌شده یا پرداخت کامل آنلاین،
 *     به‌صورت تجمعی).
 */
export default function PublicPagePage() {
  const [copied, setCopied] = useState(false);

  const { data: statusData, isLoading } = useMyPublicPageStatus();
  const payPublicPage = usePayPublicPage();

  const status = statusData?.data;
  const isActive = Boolean(status?.isActive);
  const required = status?.requiredPaidBookings ?? 300;
  const paidBookings = status?.paidBookingsCount ?? 0;
  const progress = Math.min(100, Math.round((paidBookings / required) * 100));
  const price = status?.packagePriceTomans ?? 599000;
  const publicUrl = status?.publicUrl ?? '';

  const handleCopy = async () => {
    if (!publicUrl) return;
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // دسترسی به کلیپ‌بورد ممکن است مسدود باشد
    }
  };

  if (isLoading) {
    return (
      <DashboardShell>
        <PageHeader title="صفحهٔ اختصاصی آرایشگاه" />
        <div className="mt-4 space-y-4">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <PageHeader title="صفحهٔ اختصاصی آرایشگاه" />

      <FadeIn>
        <div className="mt-4 space-y-4">
          <AppCard>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <Globe size={20} className="text-primary" />
                <h2 className="text-base font-black text-gray-900">
                  وضعیت صفحهٔ عمومی
                </h2>
              </div>
              {isActive ? (
                <Badge className="gap-1 bg-primary text-white">
                  <BadgeCheck size={13} /> فعال
                </Badge>
              ) : (
                <Badge variant="secondary">غیرفعال</Badge>
              )}
            </div>

            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              {isActive
                ? 'صفحهٔ اختصاصی شما فعال است؛ مشتریان می‌توانند بدون ورود به سامانه آن را ببینند و در نتایج جستجو نمایش داده می‌شود.'
                : 'صفحهٔ اختصاصی شما غیرفعال است. با خرید پکیج یا رسیدن به ۳۰۰ نوبتِ پرداخت‌شده فعال می‌شود.'}
            </p>

            {isActive && publicUrl && (
              <div className="mt-4 rounded-2xl border border-primary/20 bg-primary-2/50 p-4">
                <p className="text-xs text-muted-foreground">آدرس صفحهٔ شما</p>
                <p
                  dir="ltr"
                  className="mt-1 truncate text-left text-sm font-bold text-gray-900"
                >
                  {publicUrl}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button asChild size="sm" variant="outline">
                    <Link href={publicUrl} target="_blank">
                      <ExternalLink size={14} /> مشاهده صفحه
                    </Link>
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleCopy}>
                    {copied ? <Check size={14} /> : null}
                    {copied ? 'کپی شد' : 'کپی لینک'}
                  </Button>
                </div>
              </div>
            )}

            {isActive && status && !status.isApproved && (
              <p className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs leading-6 text-amber-700">
                پروفایل سالن شما هنوز تایید نشده است. صفحهٔ اختصاصی بلافاصله بعد
                از تایید پروفایل توسط ادمین در دسترس عموم قرار می‌گیرد.
              </p>
            )}

            {status?.reason === 'PACKAGE' && status.purchasedAt && (
              <p className="mt-3 text-xs text-muted-foreground">
                پکیج در تاریخ{' '}
                {toPersianDigits(
                  new Date(status.purchasedAt).toLocaleDateString('fa-IR'),
                )}{' '}
                خریداری شده و مادام‌العمر فعال است.
              </p>
            )}
          </AppCard>

          {!isActive && (
            <AppCard className="bg-gradient-to-br from-primary to-primary/60 text-white">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-white/70">پکیج صفحهٔ اختصاصی</p>
                  <h3 className="mt-2 text-3xl font-black">
                    {formatFaNumber(price)}
                  </h3>
                  <p className="text-sm text-white/70">
                    تومان — پرداخت یک‌باره
                  </p>
                </div>
                <Sparkles size={30} className="text-white/60" />
              </div>

              <ul className="mt-5 space-y-2 text-sm text-white/90">
                <li>• صفحهٔ اختصاصی و سئوشده برای سالن شما در گوگل</li>
                <li>• نمایش خدمات، قیمت‌ها، نمونه‌کارها و نظرات</li>
                <li>• فعال‌سازی آنی و مادام‌العمر بدون نیاز به تمدید</li>
              </ul>

              <Button
                variant="secondary"
                className="mt-5 w-full text-primary"
                disabled={payPublicPage.isPending}
                onClick={() => payPublicPage.mutate()}
              >
                {payPublicPage.isPending ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : null}
                خرید و فعال‌سازی صفحهٔ اختصاصی
              </Button>
            </AppCard>
          )}

          <AppCard>
            <h2 className="text-base font-black text-gray-900">
              فعال‌سازی رایگان با نوبت‌های پرداخت‌شده
            </h2>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">
              با رسیدن به {toPersianDigits(required)} نوبتِ پرداخت‌شده
              (نوبت‌هایی که بیعانه‌شان پرداخت شده یا مشتری کل مبلغ را هنگام رزرو
              آنلاین پرداخته باشد) صفحهٔ اختصاصی به‌صورت رایگان و برای همیشه
              فعال می‌شود.
            </p>

            <div className="mt-4">
              <div className="flex items-center justify-between text-sm">
                <span className="font-bold text-gray-800">
                  {toPersianDigits(paidBookings)} از {toPersianDigits(required)}
                </span>
                <span className="text-muted-foreground">
                  {toPersianDigits(progress)}٪
                </span>
              </div>
              <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </AppCard>
        </div>
      </FadeIn>
    </DashboardShell>
  );
}
