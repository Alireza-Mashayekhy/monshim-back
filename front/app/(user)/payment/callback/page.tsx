'use client';

import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  CreditCard,
  Hash,
  Home,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

import { Button } from '@/components/ui/button';
import { formatPrice } from '@/lib/utils';

const toPersianDigits = (num: number | string): string => {
  const farsiDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return String(num).replace(/[0-9]/g, w => farsiDigits[+w]);
};

function PaymentCallbackContent() {
  const searchParams = useSearchParams();

  const status = searchParams.get('status');
  const isSuccess = status === 'success';
  const trackId = searchParams.get('trackId');
  const refNumber = searchParams.get('refNumber');
  const amount = searchParams.get('amount');
  const purpose = searchParams.get('purpose');
  const message = searchParams.get('message');

  const nowFormatted = new Date().toLocaleDateString('fa-IR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const getPurposeLabel = () => {
    switch (purpose) {
      case 'SUBSCRIPTION':
        return 'خرید اشتراک سالن زیبایی';
      case 'BOOKING':
        return 'رزرو آنلاین نوبت آرایشگاه';
      case 'WALLET':
        return 'شارژ آنلاین کیف پول';
      default:
        return 'پرداخت اینترنتی منشیم';
    }
  };

  const getDestinationLink = () => {
    switch (purpose) {
      case 'SUBSCRIPTION':
        return {
          href: '/dashboard/subscription',
          label: 'مشاهده اشتراک در داشبورد',
        };
      case 'BOOKING':
        return {
          href: '/appointments',
          label: 'مشاهده لیست نوبت‌های من',
        };
      case 'WALLET':
        return {
          href: '/dashboard/financial',
          label: 'مشاهده موجودی کیف پول',
        };
      default:
        return {
          href: '/home',
          label: 'بازگشت به صفحه اصلی',
        };
    }
  };

  const destination = getDestinationLink();

  return (
    <div className="min-h-screen  flex items-center justify-center p-4">
      <div className="w-full bg-white rounded-3xl border border-primary/30 shadow-xl p-6 sm:p-8 space-y-6 text-right">
        {/* Status Header */}
        <div className="text-center space-y-3">
          <div
            className={`w-20 h-20 mx-auto rounded-3xl flex items-center justify-center transition-all ${
              isSuccess
                ? 'bg-gray-200 text-primary ring-8 ring-primary/10'
                : 'bg-rose-50 text-rose-500 ring-8 ring-rose-500/10'
            }`}
          >
            {isSuccess ? (
              <CheckCircle2 size={44} className="stroke-[2.5]" />
            ) : (
              <AlertCircle size={44} className="stroke-[2.5]" />
            )}
          </div>

          <div className="space-y-1">
            <h1 className="text-lg sm:text-xl font-black text-gray-900 tracking-tight">
              {isSuccess ? 'پرداخت با موفقیت انجام شد' : 'پرداخت ناموفق بود'}
            </h1>
            <p className="text-xs text-gray-500 leading-relaxed font-normal">
              {isSuccess
                ? `${getPurposeLabel()} با موفقیت در سیستم ثبت گردید.`
                : message ||
                  'تراکنش توسط کاربر لغو گردید یا از سمت درگاه تایید نشد.'}
            </p>
          </div>
        </div>

        {/* Receipt Details Box */}
        {isSuccess ? (
          <div className="bg-white rounded-2xl border border-primary/20 p-4 space-y-3 text-xs">
            <div className="flex items-center justify-between py-1.5 border-b border-primary/10">
              <span className="text-gray-500 flex items-center gap-1.5 font-medium">
                <Sparkles size={14} className="text-primary" />
                بابت:
              </span>
              <span className="font-bold text-gray-900">
                {getPurposeLabel()}
              </span>
            </div>

            {amount && (
              <div className="flex items-center justify-between py-1.5 border-b border-primary/10">
                <span className="text-gray-500 flex items-center gap-1.5 font-medium">
                  <CreditCard size={14} className="text-primary" />
                  مبلغ پرداخت شده:
                </span>
                <span className="font-black text-sm text-primary">
                  {toPersianDigits(formatPrice(amount))} تومان
                </span>
              </div>
            )}

            {trackId && (
              <div className="flex items-center justify-between py-1.5 border-b border-primary/10">
                <span className="text-gray-500 flex items-center gap-1.5 font-medium">
                  <Hash size={14} className="text-primary" />
                  شناسه رهگیری درگاه زیبال:
                </span>
                <span className="font-mono font-bold text-gray-900 dir-ltr">
                  {trackId}
                </span>
              </div>
            )}

            {refNumber && (
              <div className="flex items-center justify-between py-1.5 border-b border-primary/10">
                <span className="text-gray-500 flex items-center gap-1.5 font-medium">
                  <Hash size={14} className="text-primary" />
                  شماره مرجع شاپرک:
                </span>
                <span className="font-mono font-bold text-gray-900 dir-ltr">
                  {refNumber}
                </span>
              </div>
            )}

            <div className="flex items-center justify-between py-1.5">
              <span className="text-gray-500 flex items-center gap-1.5 font-medium">
                <Calendar size={14} className="text-primary" />
                تاریخ و زمان:
              </span>
              <span className="text-gray-700 font-medium">{nowFormatted}</span>
            </div>
          </div>
        ) : (
          <div className="bg-rose-50/60 rounded-2xl border border-rose-100 p-4 text-xs text-rose-700 leading-relaxed text-center">
            در صورتی که مبلغی از حساب شما کسر شده است، ظرف حداکثر ۷۲ ساعت توسط
            بانک مبدأ بازگردانده خواهد شد.
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-2 pt-2">
          {isSuccess ? (
            <>
              <Link href={destination.href} className="w-full block">
                <Button className="w-full">
                  <span>{destination.label}</span>
                  <ChevronLeft size={16} />
                </Button>
              </Link>
              <Link href="/home" className="w-full block">
                <Button variant="outline" className="w-full">
                  <Home size={16} />
                  <span>صفحه اصلی منشیم</span>
                </Button>
              </Link>
            </>
          ) : (
            <>
              <Link href="/home" className="w-full block">
                <Button className="w-full">
                  <Home size={16} />
                  <span>بازگشت به خانه</span>
                </Button>
              </Link>
              <Button
                className="w-full"
                variant="outline"
                type="button"
                onClick={() => window.history.back()}
              >
                <RotateCcw size={14} />
                <span>تلاش مجدد</span>
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PaymentCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white flex items-center justify-center">
          <div className="text-gray-500 text-xs">
            در حال پردازش نتیجه پرداخت...
          </div>
        </div>
      }
    >
      <PaymentCallbackContent />
    </Suspense>
  );
}
