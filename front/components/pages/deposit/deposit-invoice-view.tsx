'use client';

import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  CreditCard,
  FileText,
  Hash,
  Home,
  Loader2,
  MapPin,
  NotebookPen,
  Phone,
  ReceiptText,
  RotateCcw,
  Scissors,
  ShieldCheck,
  UserRound,
  Wallet,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import Logo from '@/components/shared/logo';
import { Button } from '@/components/ui/button';
import { toFa } from '@/lib/jalali';
import { cn, formatPrice, getFullImageUrl } from '@/lib/utils';
import {
  useDepositInvoice,
  usePayDeposit,
} from '@/services/features/payment/hooks';

interface DepositInvoiceViewProps {
  token: string;
}

const PERSIAN_FULL_DATE = new Intl.DateTimeFormat('fa-IR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

const PERSIAN_DATETIME = new Intl.DateTimeFormat('fa-IR', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

function formatAppointmentDate(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return toFa(isoDate);
  return PERSIAN_FULL_DATE.format(date);
}

function formatRemainingCountdown(
  expiresAtIso: string | null,
  nowMs: number,
): string | null {
  if (!expiresAtIso) return null;
  const expiresMs = new Date(expiresAtIso).getTime();
  if (!Number.isFinite(expiresMs)) return null;

  const remainingMs = expiresMs - nowMs;
  if (remainingMs <= 0) {
    return 'مهلت پرداخت رو به اتمام است';
  }

  const totalMinutes = Math.ceil(remainingMs / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0 && minutes > 0) {
    return `${toFa(hours)} ساعت و ${toFa(minutes)} دقیقه مهلت پرداخت`;
  }
  if (hours > 0) {
    return `${toFa(hours)} ساعت مهلت پرداخت`;
  }
  return `${toFa(minutes)} دقیقه مهلت پرداخت`;
}

export function DepositInvoiceView({ token }: DepositInvoiceViewProps) {
  const searchParams = useSearchParams();
  const paymentCallbackState = searchParams.get('payment');
  const callbackMessage = searchParams.get('message');
  const callbackTrackId = searchParams.get('trackId');
  const callbackRefNumber = searchParams.get('refNumber');

  const {
    data: invoice,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useDepositInvoice(token);
  const payDeposit = usePayDeposit(token);

  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNowMs(Date.now()), 30_000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f4f8f9] py-6 px-4 sm:py-10">
        <div className="mx-auto max-w-lg space-y-4">
          <div className="flex items-center justify-between px-1">
            <div className="h-9 w-28 animate-pulse rounded-xl bg-slate-200/80" />
            <div className="h-7 w-32 animate-pulse rounded-full bg-slate-200/80" />
          </div>
          <div className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-sm">
            <div className="h-32 animate-pulse bg-primary/85" />
            <div className="space-y-4 p-6">
              <div className="h-16 animate-pulse rounded-2xl bg-slate-100" />
              <div className="grid grid-cols-2 gap-3">
                <div className="h-16 animate-pulse rounded-2xl bg-slate-100" />
                <div className="h-16 animate-pulse rounded-2xl bg-slate-100" />
              </div>
              <div className="h-28 animate-pulse rounded-2xl bg-slate-100" />
              <div className="h-36 animate-pulse rounded-2xl bg-slate-100" />
              <div className="h-14 animate-pulse rounded-2xl bg-primary/30" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !invoice) {
    const errMsg =
      (error as any)?.response?.data?.message ||
      'لینک صورت‌حساب معتبر نیست یا منقضی شده است.';

    return (
      <div
        dir="rtl"
        className="min-h-screen bg-[#f4f8f9] flex items-center justify-center p-4"
      >
        <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 text-center shadow-lg space-y-5">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 text-rose-500 ring-8 ring-rose-500/10">
            <AlertCircle size={34} />
          </div>
          <div className="space-y-1.5">
            <h1 className="text-lg font-black text-gray-900">
              صورت‌حساب یافت نشد
            </h1>
            <p className="text-xs leading-6 text-gray-500">{errMsg}</p>
          </div>
          <div className="flex flex-col gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={() => void refetch()}
              disabled={isFetching}
              className="w-full h-11 rounded-xl font-bold"
            >
              <RotateCcw
                size={15}
                className={cn(isFetching && 'animate-spin')}
              />
              بررسی مجدد لینک
            </Button>
            <Link href="/" className="block w-full">
              <Button className="w-full h-11 rounded-xl font-bold">
                <Home size={15} />
                صفحه اصلی منشیم
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isPaid = invoice.status === 'paid';
  const isPayable = invoice.status === 'payable';
  const isClosed =
    invoice.status === 'canceled' || invoice.status === 'expired';

  const salonAvatar = getFullImageUrl(invoice.salon.profileImage);
  const countdownText = isPayable
    ? formatRemainingCountdown(invoice.appointment.expiresAt, nowMs)
    : null;
  const invoiceCode = `INV-${invoice.token.slice(0, 8).toUpperCase()}`;

  const effectiveTrackId =
    invoice.receipt?.trackId != null
      ? String(invoice.receipt.trackId)
      : callbackTrackId;
  const effectiveRefNumber = invoice.receipt?.refNumber || callbackRefNumber;
  const paidDateFormatted = invoice.receipt?.paidAt
    ? PERSIAN_DATETIME.format(new Date(invoice.receipt.paidAt))
    : null;

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-[#f4f8f9] py-5 px-3.5 sm:py-9 sm:px-5"
    >
      <div className="mx-auto max-w-lg space-y-4">
        {/* نوار برند بالای صورت‌حساب */}
        <header className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2.5">
            <Logo label="صفحه اصلی منشیم" />
            <div>
              <p className="text-xs font-black text-gray-900">منشیم</p>
              <p className="text-[10px] font-medium text-gray-500">
                صورت‌حساب رسمی رزرو نوبت
              </p>
            </div>
          </div>

          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-white px-3 py-1.5 text-[11px] font-bold text-primary shadow-2xs">
            <ShieldCheck size={14} className="shrink-0" />
            پرداخت امن شاپرک
          </span>
        </header>

        {/* کارت اصلی صورت‌حساب */}
        <main className="overflow-hidden rounded-[28px] border border-slate-200/90 bg-white shadow-[0_14px_40px_-15px_rgba(11,114,133,0.16)]">
          {/* سربرگ رنگی وضعیت صورت‌حساب */}
          <div
            className={cn(
              'relative px-5 py-6 text-white sm:px-7',
              isPaid
                ? 'bg-gradient-to-br from-emerald-600 via-teal-600 to-primary'
                : isClosed
                  ? 'bg-gradient-to-br from-slate-700 to-slate-800'
                  : 'bg-gradient-to-br from-primary via-[#096171] to-[#074c59]',
            )}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-bold backdrop-blur-xs">
                  <ReceiptText size={13} />
                  {isPaid
                    ? 'رسید پرداخت‌شده'
                    : isClosed
                      ? 'صورت‌حساب غیرفعال'
                      : 'پیش‌فاکتور و صورت‌حساب نوبت'}
                </div>

                <h1 className="text-lg font-black tracking-tight sm:text-xl">
                  {isPaid
                    ? 'بیعانه با موفقیت پرداخت شد'
                    : isClosed
                      ? invoice.status === 'canceled'
                        ? 'این نوبت لغو شده است'
                        : 'مهلت این نوبت به پایان رسیده'
                      : 'بررسی صورت‌حساب و پرداخت'}
                </h1>

                <p className="text-xs leading-5 text-white/85">
                  {isPaid
                    ? 'نوبت شما در سالن قطعی شده است. جزئیات خدمات و تسویه را در زیر ببینید.'
                    : isClosed
                      ? invoice.statusReason ||
                        'امکان پرداخت برای این لینک وجود ندارد.'
                      : 'لطفاً جزئیات خدمات، مبلغ بیعانه و کمیسیون را بررسی کرده و وارد درگاه شوید.'}
                </p>
              </div>

              <div className="flex flex-col items-end gap-1.5 shrink-0">
                <span
                  dir="ltr"
                  className="rounded-lg bg-black/20 px-2.5 py-1 font-mono text-[11px] font-bold tracking-wider text-white/95"
                >
                  #{invoiceCode}
                </span>

                {countdownText && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-300/95 px-2.5 py-1 text-[10px] font-black text-amber-950">
                    <Clock3 size={11} />
                    {countdownText}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* پیام بازگشت ناموفق از درگاه */}
          {paymentCallbackState === 'failed' && !isPaid && (
            <div className="mx-5 mt-5 flex items-start gap-2.5 rounded-2xl border border-rose-200 bg-rose-50/90 p-3.5 text-xs leading-6 text-rose-800 sm:mx-7">
              <AlertCircle size={17} className="mt-0.5 shrink-0 text-rose-600" />
              <div className="space-y-0.5">
                <p className="font-black">پرداخت در درگاه تکمیل نشد</p>
                <p className="text-[11px] text-rose-700">
                  {callbackMessage ||
                    'تراکنش لغو شد یا تأیید نشد. در صورت تمایل می‌توانید مجدداً دکمه پرداخت را بزنید.'}
                </p>
              </div>
            </div>
          )}

          {/* پیام موفقیت بلافاصله پس از بازگشت از درگاه */}
          {isPaid && (
            <div className="mx-5 mt-5 rounded-2xl border border-emerald-200 bg-emerald-50/75 p-4 text-xs text-emerald-900 sm:mx-7 space-y-2.5">
              <div className="flex items-center gap-2 font-black text-emerald-800">
                <CheckCircle2 size={17} className="shrink-0 text-emerald-600" />
                <span>تراکنش شما در شبکه شاپرک تأیید و ثبت شد</span>
              </div>

              <div className="grid grid-cols-1 gap-1.5 border-t border-emerald-200/70 pt-2.5 text-[11px] sm:grid-cols-2">
                {effectiveTrackId && (
                  <div className="flex items-center justify-between sm:justify-start sm:gap-2">
                    <span className="text-emerald-700 flex items-center gap-1">
                      <Hash size={12} />
                      کد رهگیری زیبال:
                    </span>
                    <span dir="ltr" className="font-mono font-bold text-gray-900">
                      {effectiveTrackId}
                    </span>
                  </div>
                )}

                {effectiveRefNumber && (
                  <div className="flex items-center justify-between sm:justify-start sm:gap-2">
                    <span className="text-emerald-700 flex items-center gap-1">
                      <Hash size={12} />
                      مرجع شاپرک:
                    </span>
                    <span dir="ltr" className="font-mono font-bold text-gray-900">
                      {effectiveRefNumber}
                    </span>
                  </div>
                )}

                {paidDateFormatted && (
                  <div className="flex items-center justify-between sm:col-span-2 sm:justify-start sm:gap-2">
                    <span className="text-emerald-700">زمان ثبت پرداخت:</span>
                    <span className="font-bold text-gray-900">
                      {paidDateFormatted}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* بخش ۱: مشخصات سالن و زمان نوبت */}
          <section className="p-5 sm:p-7 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-100 bg-primary-2 text-primary">
                  {salonAvatar ? (
                    <Image
                      src={salonAvatar}
                      alt={invoice.salon.name}
                      fill
                      sizes="56px"
                      className="object-cover"
                    />
                  ) : (
                    <Scissors size={22} />
                  )}
                </div>

                <div className="min-w-0">
                  <h2 className="truncate text-base font-black text-gray-900">
                    {invoice.salon.name}
                  </h2>
                  {(invoice.salon.cityName || invoice.salon.address) && (
                    <p className="mt-1 flex items-center gap-1 text-xs text-gray-500">
                      <MapPin size={13} className="shrink-0 text-primary" />
                      <span className="line-clamp-1">
                        {[invoice.salon.cityName, invoice.salon.address]
                          .filter(Boolean)
                          .join('، ')}
                      </span>
                    </p>
                  )}
                </div>
              </div>

              {invoice.salon.phone && (
                <a
                  href={`tel:${invoice.salon.phone}`}
                  className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-gray-700 transition hover:border-primary/40 hover:bg-primary-3 hover:text-primary"
                >
                  <Phone size={13} />
                  تماس
                </a>
              )}
            </div>

            {/* جدول مشخصات نوبت */}
            <div className="grid grid-cols-1 gap-2.5 rounded-2xl border border-slate-100 bg-[#f9fbfc] p-3.5 sm:grid-cols-2">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-primary shadow-2xs">
                  <UserRound size={15} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-medium text-gray-400">
                    نام مشتری
                  </p>
                  <p className="truncate text-xs font-black text-gray-900">
                    {invoice.customer.fullName}
                    {invoice.customer.maskedPhone && (
                      <span
                        dir="ltr"
                        className="ms-1.5 font-normal text-[11px] text-gray-400"
                      >
                        ({toFa(invoice.customer.maskedPhone)})
                      </span>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-primary shadow-2xs">
                  <CalendarDays size={15} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-medium text-gray-400">
                    تاریخ مراجعه
                  </p>
                  <p className="truncate text-xs font-black text-gray-900">
                    {formatAppointmentDate(invoice.appointment.date)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 sm:col-span-2 border-t border-slate-100 pt-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-primary shadow-2xs">
                  <Clock3 size={15} />
                </div>
                <div className="flex flex-1 flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-[10px] font-medium text-gray-400">
                      ساعت حضور در سالن
                    </p>
                    <p className="text-xs font-black text-gray-900">
                      ساعت {toFa(invoice.appointment.startTime)} تا{' '}
                      {toFa(invoice.appointment.endTime)}
                    </p>
                  </div>
                  <span className="rounded-lg bg-primary-2/80 px-2.5 py-1 text-[11px] font-bold text-primary">
                    مجموعاً {toFa(invoice.appointment.totalDurationMinutes)}{' '}
                    دقیقه
                  </span>
                </div>
              </div>
            </div>

            {invoice.appointment.customerNote && (
              <div className="flex items-start gap-2 rounded-2xl border border-amber-200/80 bg-amber-50/60 p-3 text-xs leading-6 text-amber-900">
                <NotebookPen size={14} className="mt-1 shrink-0 text-amber-600" />
                <div>
                  <span className="font-black">یادداشت سالن: </span>
                  <span>{invoice.appointment.customerNote}</span>
                </div>
              </div>
            )}

            {/* بخش ۲: لیست ریز خدمات و قیمت هر خدمت */}
            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between">
                <h3 className="flex items-center gap-1.5 text-sm font-black text-gray-900">
                  <FileText size={16} className="text-primary" />
                  ریز خدمات و تعرفه‌ها
                </h3>
                <span className="text-xs font-bold text-gray-400">
                  {toFa(invoice.items.length)} خدمت
                </span>
              </div>

              <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200/80 bg-white">
                {invoice.items.map((item, idx) => (
                  <div
                    key={item.bookingId}
                    className="p-3.5 sm:px-4 space-y-2 transition-colors hover:bg-slate-50/60"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-start gap-2.5">
                        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-primary-2 text-xs font-black text-primary">
                          {toFa(idx + 1)}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-black text-gray-900">
                            {item.name}
                          </p>
                          <p className="mt-0.5 text-[11px] font-medium text-gray-400">
                            ساعت {toFa(item.time)} •{' '}
                            {toFa(item.durationMinutes)} دقیقه
                          </p>
                        </div>
                      </div>

                      <div className="text-left shrink-0">
                        <p className="text-[10px] font-medium text-gray-400">
                          قیمت کل خدمت
                        </p>
                        <p className="text-sm font-black text-gray-900">
                          {toFa(formatPrice(item.price))}{' '}
                          <span className="text-[11px] font-semibold text-gray-500">
                            تومان
                          </span>
                        </p>
                      </div>
                    </div>

                    {/* ردیف سهم پرداخت آنلاین هر خدمت */}
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-1.5 text-[11px]">
                      {item.hasDeposit ? (
                        <>
                          <span className="font-bold text-primary">
                            بیعانه این خدمت:{' '}
                            {toFa(formatPrice(item.payableAmount))} تومان
                          </span>
                          <span className="font-medium text-gray-500">
                            مانده در سالن:{' '}
                            {toFa(formatPrice(item.remainingInSalon))} تومان
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="font-bold text-primary">
                            سهم پرداخت آنلاین:{' '}
                            {toFa(formatPrice(item.payableAmount))} تومان
                          </span>
                          <span className="font-medium text-emerald-700">
                            بدون بیعانه مجزا (تسویه کامل)
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* خط پرفراژ جداکننده صورت‌حساب */}
          <div className="relative flex items-center py-1">
            <span className="h-6 w-3 rounded-l-full border border-r-0 border-slate-200/90 bg-[#f4f8f9]" />
            <div className="flex-1 border-t-2 border-dashed border-slate-200" />
            <span className="h-6 w-3 rounded-r-full border border-l-0 border-slate-200/90 bg-[#f4f8f9]" />
          </div>

          {/* بخش ۳: خلاصه محاسبه صورت‌حساب و دکمه ورود به درگاه */}
          <section className="p-5 sm:p-7 space-y-4">
            <h3 className="flex items-center gap-1.5 text-sm font-black text-gray-900">
              <Wallet size={16} className="text-primary" />
              خلاصه محاسبه صورت‌حساب
            </h3>

            <div className="space-y-3 rounded-2xl border border-slate-100 bg-[#f9fbfc] p-4 text-xs sm:text-sm">
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-500">
                  مجموع قیمت کل خدمات ({toFa(invoice.items.length)} خدمت)
                </span>
                <span className="font-bold text-gray-800">
                  {toFa(formatPrice(invoice.pricing.totalServicePrice))} تومان
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-500">
                  {invoice.pricing.remainingInSalon > 0
                    ? 'جمع پیش‌پرداخت / بیعانه خدمات (سهم سالن)'
                    : 'سهم خدمات قابل پرداخت آنلاین'}
                </span>
                <span className="font-bold text-gray-900">
                  {toFa(formatPrice(invoice.pricing.depositAmount))} تومان
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-500">
                  کمیسیون سامانه منشیم (
                  {toFa(invoice.pricing.commissionPercent)}٪ بیشترین بیعانه)
                </span>
                <span className="font-bold text-primary">
                  {toFa(formatPrice(invoice.pricing.commissionAmount))} تومان
                </span>
              </div>

              <div className="border-t border-dashed border-slate-200 pt-3">
                <div className="flex items-center justify-between rounded-2xl border border-primary/25 bg-primary-3 px-4 py-3.5">
                  <div>
                    <p className="text-xs font-black text-gray-900 sm:text-sm">
                      {isPaid
                        ? 'مبلغ پرداخت‌شده در درگاه'
                        : 'مبلغ قابل پرداخت در درگاه'}
                    </p>
                    <p className="mt-0.5 text-[10px] font-medium text-gray-500">
                      جمع بیعانه خدمات + کمیسیون سامانه
                    </p>
                  </div>

                  <div className="text-left">
                    <span className="text-xl font-black text-primary sm:text-2xl">
                      {toFa(
                        formatPrice(
                          isPaid && invoice.receipt
                            ? invoice.receipt.amount
                            : invoice.pricing.amountToPay,
                        ),
                      )}
                    </span>
                    <span className="ms-1 text-xs font-bold text-primary">
                      تومان
                    </span>
                  </div>
                </div>
              </div>

              {invoice.pricing.remainingInSalon > 0 && (
                <div className="flex items-center justify-between rounded-xl border border-amber-200/80 bg-amber-50/70 px-3.5 py-2.5 text-xs text-amber-900">
                  <span className="font-bold">
                    مانده قابل پرداخت حضوری در سالن:
                  </span>
                  <span className="font-black">
                    {toFa(formatPrice(invoice.pricing.remainingInSalon))} تومان
                  </span>
                </div>
              )}
            </div>

            {/* دکمه‌های اقدام بر اساس وضعیت */}
            {isPayable && (
              <div className="space-y-3 pt-1">
                <Button
                  type="button"
                  size="lg"
                  disabled={payDeposit.isPending}
                  onClick={() => payDeposit.mutate()}
                  className="h-14 w-full rounded-2xl bg-primary text-base font-black text-white shadow-lg shadow-primary/25 transition hover:bg-primary/90 disabled:shadow-none flex items-center justify-center gap-2"
                >
                  {payDeposit.isPending ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      <span>در حال انتقال به درگاه پرداخت...</span>
                    </>
                  ) : (
                    <>
                      <CreditCard size={19} />
                      <span>
                        پرداخت و ورود به درگاه (
                        {toFa(formatPrice(invoice.pricing.amountToPay))} تومان)
                      </span>
                      <ArrowLeft size={18} />
                    </>
                  )}
                </Button>

                <p className="text-center text-[11px] leading-5 text-gray-400">
                  با کلیک روی دکمه بالا به درگاه رسمی پرداخت اینترنتی زیبال منتقل
                  می‌شوید و پس از پرداخت، نوبت شما بلافاصله قطعی می‌گردد.
                </p>
              </div>
            )}

            {isPaid && (
              <div className="grid grid-cols-1 gap-2.5 pt-1 sm:grid-cols-2">
                <Link href="/panel/appointments" className="block w-full">
                  <Button className="h-12 w-full rounded-xl font-bold">
                    مشاهده در نوبت‌های من
                  </Button>
                </Link>
                <Link href="/" className="block w-full">
                  <Button
                    variant="outline"
                    className="h-12 w-full rounded-xl font-bold"
                  >
                    <Home size={15} />
                    صفحه اصلی منشیم
                  </Button>
                </Link>
              </div>
            )}

            {isClosed && (
              <div className="grid grid-cols-1 gap-2.5 pt-1 sm:grid-cols-2">
                {invoice.salon.phone && (
                  <a href={`tel:${invoice.salon.phone}`} className="block w-full">
                    <Button className="h-12 w-full rounded-xl font-bold">
                      <Phone size={15} />
                      تماس با سالن جهت هماهنگی
                    </Button>
                  </a>
                )}
                <Link href="/" className="block w-full">
                  <Button
                    variant="outline"
                    className="h-12 w-full rounded-xl font-bold"
                  >
                    <Home size={15} />
                    بازگشت به صفحه اصلی
                  </Button>
                </Link>
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}
