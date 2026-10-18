'use client';

import {
  BadgeCheck,
  CheckCircle2,
  Copy,
  Globe,
  Info,
  Loader2,
  Lock,
  Sparkles,
  Users,
} from 'lucide-react';
import { useState } from 'react';

import DashboardShell from '@/components/dashboard/layout/dashboard-shell';
import AppCard from '@/components/shared/app-card';
import FadeIn from '@/components/shared/fade-in';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn, formatPrice, toPersianDigits } from '@/lib/utils';
import {
  usePayPublicPagePackage,
  usePublicPageStatus,
} from '@/services/features/public-page/hooks';

export default function PublicPagePanel() {
  const { data: response, isLoading } = usePublicPageStatus();
  const payPackageMutation = usePayPublicPagePackage();
  const [copied, setCopied] = useState(false);

  const status = response?.data ?? null;

  if (isLoading) {
    return (
      <DashboardShell>
        <div className="flex min-h-[400px] items-center justify-center">
          <Loader2 className="size-7 animate-spin text-primary" />
        </div>
      </DashboardShell>
    );
  }

  const active = Boolean(status?.active);
  const progress = Math.min(
    100,
    Math.round(
      ((status?.depositBookingsCount ?? 0) /
        (status?.requiredDepositBookings ?? 1)) *
        100,
    ),
  );

  const copyPublicUrl = async () => {
    if (!status?.publicUrl) return;

    try {
      await navigator.clipboard.writeText(status.publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt('آدرس صفحهٔ عمومی:', status.publicUrl);
    }
  };

  return (
    <DashboardShell>
      {/* وضعیت فعلی */}
      <FadeIn delay={0.05}>
        <AppCard className="p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary-2 text-primary">
                <Globe size={17} />
              </div>

              <div>
                <h2 className="text-sm font-black text-gray-900">
                  صفحهٔ عمومی آرایشگاه
                </h2>

                <p className="mt-0.5 text-[11px] font-medium text-gray-400">
                  نمایهٔ عمومی شما در جست‌وجوی سایت و موتورهای جستجو
                </p>
              </div>
            </div>

            {active ? (
              <Badge className="rounded-lg border border-green-200 bg-green-50 px-2.5 py-1 text-green-600">
                <CheckCircle2 size={13} className="ml-1" />
                فعال
              </Badge>
            ) : (
              <Badge className="rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1 text-gray-500">
                <Lock size={12} className="ml-1" />
                غیرفعال
              </Badge>
            )}
          </div>

          {active && status?.publicUrl && (
            <div className="mt-4 flex flex-wrap items-center gap-2 rounded-2xl border border-primary-2 bg-primary-3 px-4 py-3">
              <span className="text-xs font-bold text-gray-600">
                نشانی صفحهٔ عمومی:
              </span>

              <span className="text-xs font-black text-primary" dir="ltr">
                {status.publicUrl}
              </span>

              <Button
                variant="outline"
                size="sm"
                onClick={copyPublicUrl}
                className="mr-auto h-7 px-2.5 text-[11px]"
              >
                {copied ? (
                  <CheckCircle2 size={13} className="text-green-500" />
                ) : (
                  <Copy size={13} />
                )}
                {copied ? 'کپی شد' : 'کپی لینک'}
              </Button>
            </div>
          )}

          {active && (
            <p className="mt-3 text-[11px] font-medium leading-5 text-gray-400">
              {status?.reason === 'package'
                ? 'صفحهٔ شما با خرید پکیج فعال شده و همیشه روشن می‌ماند.'
                : 'صفحهٔ شما به‌دلیل تعداد رزروهای بیعانه‌دار فعال است.'}
              {' '}این صفحه در سایت‌مپ سایت اعلام می‌شود و توسط موتورهای
              جستجو نمایه (سئو) می‌شود.
            </p>
          )}
        </AppCard>
      </FadeIn>

      {/* دو راه فعال‌سازی */}
      <FadeIn delay={0.12}>
        <div className="mb-3 mt-5 flex items-end justify-between gap-2">
          <div>
            <h3 className="text-base font-black text-gray-900 sm:text-lg">
              نحوهٔ فعال‌سازی
            </h3>

            <p className="mt-1 text-xs font-medium text-gray-400">
              برای دیده‌شدن صفحه توسط کاربران، یکی از این دو راه را
              طی کنید.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
          {/* راه اول: خرید پکیج */}
          <div
            className={cn(
              'relative flex h-full flex-col overflow-hidden rounded-[28px] border bg-white p-5 shadow-[0_4px_20px_rgba(15,23,42,0.04)]',
              status?.purchased
                ? 'border-green-200 ring-1 ring-green-200'
                : 'border-gray-100',
            )}
          >
            {status?.purchased && (
              <div className="absolute left-0 top-0 flex items-center gap-1 rounded-br-2xl bg-green-500 px-3 py-1.5 text-[10px] font-black text-white">
                <BadgeCheck size={12} />
                خریداری‌شده
              </div>
            )}

            <div className="flex items-center gap-2.5">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-white">
                <Sparkles size={19} />
              </div>

              <h4 className="text-base font-black text-gray-900">
                پکیج صفحه عمومی
              </h4>
            </div>

            <p className="mt-3 text-xs leading-6 text-gray-400">
              با خرید این پکیج (یک‌باره و دائمی)، صفحهٔ عمومی
              آرایشگاه‌تان بدون نیاز به هیچ شرط دیگری فعال و سئو
              می‌شود.
            </p>

            <div className="mt-4 flex items-baseline gap-1">
              <span className="text-3xl font-black tracking-tight text-gray-900">
                {toPersianDigits(formatPrice(status?.packagePrice ?? 599000))}
              </span>

              <span className="text-xs font-bold text-gray-400">
                تومان
              </span>
            </div>

            <div className="mt-auto pt-5">
              <Button
                className="w-full"
                variant={status?.purchased ? 'outline' : 'default'}
                disabled={
                  Boolean(status?.purchased) ||
                  payPackageMutation.isPending
                }
                onClick={() => payPackageMutation.mutate()}
              >
                {payPackageMutation.isPending ? (
                  <>
                    <Loader2 className="ml-1.5 size-4 animate-spin" />
                    در حال انتقال به درگاه...
                  </>
                ) : status?.purchased ? (
                  'پکیج خریداری شده است'
                ) : (
                  'خرید و پرداخت آنلاین'
                )}
              </Button>
            </div>
          </div>

          {/* راه دوم: رزروهای بیعانه‌دار */}
          <div
            className={cn(
              'relative flex h-full flex-col overflow-hidden rounded-[28px] border bg-white p-5 shadow-[0_4px_20px_rgba(15,23,42,0.04)]',
              !status?.purchased && active
                ? 'border-green-200 ring-1 ring-green-200'
                : 'border-gray-100',
            )}
          >
            {active && !status?.purchased && (
              <div className="absolute left-0 top-0 flex items-center gap-1 rounded-br-2xl bg-green-500 px-3 py-1.5 text-[10px] font-black text-white">
                <BadgeCheck size={12} />
                تکمیل شد
              </div>
            )}

            <div className="flex items-center gap-2.5">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-2 text-primary">
                <Users size={19} />
              </div>

              <h4 className="text-base font-black text-gray-900">
                {toPersianDigits(
                  status?.requiredDepositBookings ?? 300,
                )}{' '}
                رزرو با بیعانه
              </h4>
            </div>

            <p className="mt-3 text-xs leading-6 text-gray-400">
              تا با {toPersianDigits(
                status?.requiredDepositBookings ?? 300,
              )}{' '}
              رزرو فعالِ بیعانه‌دار برسید، صفحهٔ عمومی رایگان فعال
              می‌شود. بیعانه زمانی محسوب می‌شود که مشتری بیعانهٔ
              رزرو را پرداخت کرده باشد یا شما رزرو را دستی با دکمهٔ
              لینک بیعانه ثبت کرده باشید.
            </p>

            <div className="mt-4">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-gray-500">
                  رزروهای بیعانه‌دار شما
                </span>

                <span className="text-primary">
                  <span className="text-base font-black">
                    {toPersianDigits(status?.depositBookingsCount ?? 0)}
                  </span>
                  {' / '}
                  {toPersianDigits(
                    status?.requiredDepositBookings ?? 300,
                  )}
                </span>
              </div>

              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-200/70">
                <div
                  className={cn(
                    'h-full rounded-full transition-all',
                    active ? 'bg-green-500' : 'bg-primary',
                  )}
                  style={{ width: `${Math.max(progress, 2)}%` }}
                />
              </div>
            </div>

            <div className="mt-auto pt-5">
              <div className="rounded-2xl bg-primary-3 px-4 py-3 text-center text-[11px] font-bold text-primary">
                {active
                  ? 'شرط رزرو برآورده شده است'
                  : `برای فعال‌سازی رایگان به ${toPersianDigits(
                      Math.max(
                        (status?.requiredDepositBookings ?? 300) -
                          (status?.depositBookingsCount ?? 0),
                        0,
                      ),
                    )} رزرو بیعانه‌دار دیگر نیاز دارید`}
              </div>
            </div>
          </div>
        </div>
      </FadeIn>

      <FadeIn delay={0.2}>
        <div className="mt-5 flex items-start gap-2 rounded-2xl border border-primary-2 bg-primary-3 px-4 py-3">
          <Info size={15} className="mt-0.5 shrink-0 text-primary" />

          <p className="text-[11px] font-medium leading-6 text-gray-500">
            صفحهٔ عمومی فقط برای آرایشگرهای فعال نمایش داده و در
            سایت‌مپ سایت اعلام می‌شود. تا زمانی که هیچ‌یک از شرط‌ها
            برآورده نشده باشد، حتی با وارد کردن دستی نشانی صفحه،
            خطای ۴۰۴ نمایش داده می‌شود.
          </p>
        </div>
      </FadeIn>
    </DashboardShell>
  );
}
