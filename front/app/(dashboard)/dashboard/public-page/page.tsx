// app/(dashboard)/public-page/page.tsx
'use client';

import {
  AlertCircle,
  BadgeCheck,
  Check,
  CheckCircle2,
  ExternalLink,
  Globe,
  Link2,
  Loader2,
  Lock,
  Sparkles,
  Tag,
  TriangleAlert,
} from 'lucide-react';
import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { toast } from 'sonner';

import DashboardShell from '@/components/dashboard/layout/dashboard-shell';
import AppCard from '@/components/shared/app-card';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import FadeIn from '@/components/shared/fade-in';
import PageHeader from '@/components/shared/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useDebounce } from '@/hooks/use-debounce';
import { revalidateMyPublicBarberPage } from '@/lib/actions/public-page';
import { getApiErrorMessage } from '@/lib/api-error';
import {
  MAX_PUBLIC_PAGE_SLUG_LENGTH,
  sanitizePublicPageSlugInput,
  validatePublicPageSlug,
} from '@/lib/public-page-slug';
import { siteConfig } from '@/lib/site-config';
import { formatFaNumber, toPersianDigits } from '@/lib/utils';
import { usePayPublicPage } from '@/services/features/payment/hooks';
import {
  useCheckPublicPageSlug,
  useMyPublicPageStatus,
  useQuotePublicPageDiscount,
  useUpdatePublicPageSlug,
} from '@/services/features/public-page/hooks';

const URL_HOST_PREFIX = `${siteConfig.url.replace(/^https?:\/\//, '')}/provider/`;

/**
 * صفحهٔ اختصاصی (عمومی) آرایشگاه در داشبورد.
 *
 * صفحهٔ عمومی با آدرس `/provider/[slug]` وقتی فعال می‌شود که یکی از این دو شرط
 * برقرار باشد:
 *   • خرید یک‌بارهٔ پکیج ۷۷۳ هزار تومانی؛
 *   • یا ثبت ۳۰۰ رزرو موفق که پرداخت آن‌ها در درگاه انجام شده و لغو نشده باشند
 *     (مشابه بخش امور مالی).
 *
 * پس از فعال‌سازی، آرایشگر باید یک اسلاگ یکتا انتخاب کند تا به‌جای شناسهٔ عددی
 * در آدرس عمومی سالن نمایش داده شود.
 */
export default function PublicPagePage() {
  const [copied, setCopied] = useState(false);
  const [slugDraft, setSlugDraft] = useState('');
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [discountCode, setDiscountCode] = useState('');

  const { data: statusData, isLoading } = useMyPublicPageStatus();
  const payPublicPage = usePayPublicPage();
  const quoteDiscount = useQuotePublicPageDiscount();
  const appliedDiscount = quoteDiscount.data?.data;
  const updateSlug = useUpdatePublicPageSlug();

  const status = statusData?.data;
  const isActive = Boolean(status?.isActive);
  const currentSlug = status?.slug ?? null;
  const required = status?.requiredPaidBookings ?? 300;
  const paidBookings = status?.paidBookingsCount ?? 0;
  const progress = Math.min(100, Math.round((paidBookings / required) * 100));
  const price = status?.packagePriceTomans ?? 773000;
  const hasReferralDiscount = Boolean(status?.hasReferralDiscount);
  const referralDiscountAmount = Math.round(price / 2);
  const publicUrl = status?.publicUrl ?? '';

  // اسلاگ فقط یک بار ثبت می‌شود: بعد از ثبت، فرم انتخاب اسلاگ دیگر نمایش داده
  // نمی‌شود و بک‌اند هم هر تلاش برای تغییر را رد می‌کند.
  const isSlugLocked = Boolean(status?.isSlugLocked ?? currentSlug);
  const showSlugForm = isActive && !currentSlug && !isSlugLocked;
  const trimmedDraft = slugDraft.trim();
  const localValidation = validatePublicPageSlug(slugDraft);
  const candidateSlug = localValidation.valid ? localValidation.slug : '';
  const debouncedSlug = useDebounce(candidateSlug, 350);
  const shouldCheckRemote =
    showSlugForm &&
    localValidation.valid &&
    debouncedSlug === localValidation.slug;

  const slugCheck = useCheckPublicPageSlug(debouncedSlug, shouldCheckRemote);
  const isCheckingAvailability =
    showSlugForm &&
    localValidation.valid &&
    (debouncedSlug !== localValidation.slug || slugCheck.isFetching);
  const remoteAvailability = slugCheck.data?.data;

  const canSaveSlug =
    localValidation.valid &&
    !isCheckingAvailability &&
    Boolean(remoteAvailability?.available) &&
    !updateSlug.isPending;

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

  // ثبت نهایی فقط بعد از تأیید صریح کاربر در دیالوگ انجام می‌شود.
  const handleSaveSlug = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!localValidation.valid) {
      toast.error(localValidation.reason);
      return;
    }
    if (!canSaveSlug) return;
    setIsConfirmOpen(true);
  };

  const handleConfirmSaveSlug = async () => {
    try {
      const response = await updateSlug.mutateAsync(localValidation.slug);
      const savedSlug = response.data?.slug ?? localValidation.slug;
      void revalidateMyPublicBarberPage([currentSlug, savedSlug]);
      setSlugDraft('');
      toast.success('آدرس اختصاصی شما ثبت شد و از این پس قابل تغییر نیست');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'خطا در ثبت اسلاگ'));
      throw error;
    }
  };

  const handleApplyDiscount = async () => {
    const code = discountCode.trim().toUpperCase();
    if (!code) {
      toast.error('کد تخفیف را وارد کنید');
      return;
    }
    try {
      const response = await quoteDiscount.mutateAsync(code);
      toast.success(`کد تخفیف ${response.data.code} با موفقیت اعمال شد`);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'کد تخفیف معتبر نیست'));
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
              {!isActive
                ? 'صفحهٔ اختصاصی شما غیرفعال است. با خرید پکیج یا رسیدن به ۳۰۰ رزرو موفقِ پرداخت‌شده در درگاه فعال می‌شود و سپس می‌توانید اسلاگ دلخواه سالن خود را ثبت کنید.'
                : currentSlug
                  ? 'صفحهٔ اختصاصی شما فعال است؛ مشتریان می‌توانند بدون ورود به سامانه آن را با آدرس اختصاصی شما ببینند و در نتایج جستجو نمایش داده می‌شود. آدرس اختصاصی شما قطعی و غیرقابل تغییر است.'
                  : 'صفحهٔ اختصاصی شما فعال شده است! برای ساخت لینک عمومی و جایگزینی شناسهٔ عددی در آدرس، لطفاً یک اسلاگ یکتا برای سالن خود انتخاب و ثبت کنید.'}
            </p>

            {isActive && currentSlug && publicUrl && (
              <div className="mt-4 rounded-2xl border border-primary/20 bg-primary-2/50 p-4">
                <p className="text-xs text-muted-foreground">
                  آدرس اختصاصی صفحهٔ شما
                </p>
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
                <p className="mt-3 flex items-start gap-1.5 rounded-xl bg-white/70 p-2.5 text-xs leading-6 text-gray-600">
                  <Lock size={14} className="mt-1 shrink-0 text-gray-400" />
                  <span>
                    آدرس اختصاصی فقط یک بار قابل انتخاب است و پس از ثبت قابل
                    تغییر نیست؛ تغییر آدرس باعث از دست رفتن رتبهٔ صفحهٔ شما در
                    نتایج گوگل می‌شود.
                  </span>
                </p>
              </div>
            )}

            {showSlugForm && (
              <form
                onSubmit={handleSaveSlug}
                className="mt-4 space-y-3 rounded-2xl border border-primary/25 bg-primary-2/40 p-4"
              >
                <div className="flex items-center gap-2">
                  <Link2 size={16} className="text-primary" />
                  <h3 className="text-sm font-black text-gray-900">
                    ثبت اسلاگ آدرس اختصاصی سالن
                  </h3>
                </div>

                <p className="text-xs leading-6 text-muted-foreground">
                  این عبارت به‌جای شناسهٔ عددی در آدرس عمومی صفحهٔ شما نمایش
                  داده می‌شود. فقط از حروف انگلیسی کوچک، اعداد و خط تیره (-)
                  استفاده کنید.
                </p>

                <p className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs leading-6 text-rose-700">
                  <TriangleAlert size={15} className="mt-1 shrink-0" />
                  <span>
                    <strong className="font-black">
                      این انتخاب فقط یک بار انجام می‌شود و قابل برگشت نیست.
                    </strong>{' '}
                    اسلاگ پس از ثبت قفل می‌شود و دیگر امکان تغییر آن از پنل وجود
                    ندارد؛ چون آدرس صفحهٔ شما در گوگل و لینک‌هایی که مشتریان
                    به‌اشتراک گذاشته‌اند به همین آدرس گره می‌خورد.
                  </span>
                </p>

                <div
                  dir="ltr"
                  className="flex items-center overflow-hidden rounded-xl border border-gray-200 bg-white focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20"
                >
                  <span className="select-none border-r border-gray-100 bg-gray-50 px-3 py-2.5 text-xs font-medium text-gray-500">
                    {URL_HOST_PREFIX}
                  </span>
                  <Input
                    dir="ltr"
                    value={slugDraft}
                    maxLength={MAX_PUBLIC_PAGE_SLUG_LENGTH}
                    autoComplete="off"
                    spellCheck={false}
                    placeholder="aria-salon"
                    onChange={e =>
                      setSlugDraft(sanitizePublicPageSlugInput(e.target.value))
                    }
                    className="h-11 rounded-none border-0 bg-transparent px-3 text-left text-sm font-semibold focus-visible:ring-0"
                  />
                </div>

                <div className="min-h-5 text-xs">
                  {!trimmedDraft ? (
                    <span className="text-muted-foreground">
                      نمونهٔ معتبر: aria-salon یا salon-mina-24
                    </span>
                  ) : !localValidation.valid ? (
                    <span className="flex items-center gap-1.5 font-medium text-rose-600">
                      <AlertCircle size={14} className="shrink-0" />
                      {localValidation.reason}
                    </span>
                  ) : isCheckingAvailability ? (
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <Loader2 size={14} className="shrink-0 animate-spin" />
                      در حال بررسی تکراری نبودن اسلاگ...
                    </span>
                  ) : slugCheck.isError ? (
                    <span className="flex items-center gap-1.5 font-medium text-rose-600">
                      <AlertCircle size={14} className="shrink-0" />
                      خطا در بررسی وضعیت اسلاگ؛ لطفاً دوباره تلاش کنید.
                    </span>
                  ) : remoteAvailability?.available ? (
                    <span className="flex items-center gap-1.5 font-medium text-emerald-600">
                      <CheckCircle2 size={14} className="shrink-0" />
                      {remoteAvailability.reason}
                    </span>
                  ) : remoteAvailability ? (
                    <span className="flex items-center gap-1.5 font-medium text-rose-600">
                      <AlertCircle size={14} className="shrink-0" />
                      {remoteAvailability.reason}
                    </span>
                  ) : null}
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  <Button
                    type="submit"
                    size="sm"
                    disabled={!canSaveSlug}
                    className="gap-1.5"
                  >
                    {updateSlug.isPending ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : null}
                    ثبت نهایی اسلاگ و ساخت لینک
                  </Button>
                </div>
                <p className="text-[11px] leading-5 text-muted-foreground">
                  با زدن این دکمه یک پنجرهٔ تأیید باز می‌شود تا انتخاب نهایی خود
                  را قطعی کنید.
                </p>
              </form>
            )}

            <ConfirmDialog
              open={isConfirmOpen}
              onOpenChange={setIsConfirmOpen}
              title="ثبت قطعی و یک‌بارهٔ آدرس اختصاصی"
              confirmLabel="بله، ثبت کن؛ دیگر تغییر نمی‌دهم"
              cancelLabel="انصراف"
              isPending={updateSlug.isPending}
              onConfirm={handleConfirmSaveSlug}
              description={
                <span className="block space-y-2 text-right">
                  <span className="block">
                    آدرس اختصاصی صفحهٔ شما به این صورت ساخته می‌شود:
                  </span>
                  <span
                    dir="ltr"
                    className="block rounded-lg bg-gray-100 px-2 py-1.5 text-center text-xs font-bold text-gray-800"
                  >
                    {`${URL_HOST_PREFIX}${localValidation.valid ? localValidation.slug : ''}`}
                  </span>
                  <span className="block font-bold text-rose-600">
                    ⚠️ این کار قابل برگشت نیست و فقط یک بار می‌توانید انجامش
                    بدهید.
                  </span>
                  <span className="block">
                    بعد از ثبت، اسلاگ قفل می‌شود و امکان تغییر آن از پنل وجود
                    ندارد؛ آدرس فعلی صفحهٔ شما در گوگل و لینک‌هایی که به‌اشتراک
                    گذاشته‌اید به همین عبارت وابسته می‌شود.
                  </span>
                  <span className="block">
                    اگر مطمئن نیستید، «انصراف» را بزنید و بعداً ثبت کنید.
                  </span>
                </span>
              }
            />

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
                خریداری شده و فعال است.
              </p>
            )}
          </AppCard>

          {!isActive && (
            <AppCard className="bg-gradient-to-br from-primary to-primary/60 text-white">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-white/70">پکیج صفحهٔ اختصاصی</p>
                  <h3 className="mt-2 text-3xl font-black">
                    {formatFaNumber(
                      hasReferralDiscount
                        ? referralDiscountAmount
                        : (appliedDiscount?.amount ?? price),
                    )}
                  </h3>
                  <p className="text-sm text-white/70">
                    تومان — پرداخت یک‌باره
                  </p>
                  {hasReferralDiscount ? (
                    <div className="mt-2 text-sm">
                      <p className="text-white/70 line-through">
                        {formatFaNumber(price)} تومان
                      </p>
                      <p className="mt-1 font-bold text-white">
                        تخفیف ویژهٔ دعوت: ۵۰٪
                      </p>
                    </div>
                  ) : appliedDiscount ? (
                    <div className="mt-2 text-sm">
                      <p className="text-white/70 line-through">
                        {formatFaNumber(appliedDiscount.originalAmount)} تومان
                      </p>
                      <p className="mt-1 font-bold text-white">
                        با تخفیف {toPersianDigits(appliedDiscount.percentOff)}٪:{' '}
                        {formatFaNumber(appliedDiscount.amount)} تومان
                      </p>
                    </div>
                  ) : null}
                </div>
                <Sparkles size={30} className="text-white/60" />
              </div>

              <ul className="mt-5 space-y-2 text-sm text-white/90">
                <li>• صفحهٔ اختصاصی و سئوشده برای سالن شما در گوگل</li>
                <li>
                  • انتخاب یک‌بارهٔ اسلاگ (آدرس اختصاصی یکتا) بدون نمایش آیدی
                </li>
                <li>• نمایش خدمات، قیمت‌ها، نمونه‌کارها و نظرات</li>
                <li>• فعال‌سازی آنی بدون نیاز به تمدید</li>
              </ul>

              {hasReferralDiscount ? (
                <p className="mt-5 rounded-2xl border border-white/20 bg-white/10 p-3 text-sm leading-6 text-white">
                  به‌دلیل ثبت‌نام با کد معرف، تخفیف ۵۰٪ خرید صفحهٔ عمومی به‌صورت
                  خودکار اعمال شده است.
                </p>
              ) : (
                <div className="mt-5 rounded-2xl border border-white/20 bg-white/10 p-3">
                  <label
                    htmlFor="public-page-discount"
                    className="mb-2 flex items-center gap-2 text-sm font-bold text-white"
                  >
                    <Tag size={15} /> کد تخفیف دارید؟
                  </label>
                  <div className="flex gap-2">
                    <Input
                      id="public-page-discount"
                      dir="ltr"
                      value={discountCode}
                      maxLength={32}
                      autoComplete="off"
                      placeholder="کد تخفیف"
                      className="bg-white text-gray-900 placeholder:text-gray-400"
                      onChange={event => {
                        setDiscountCode(
                          event.target.value.replace(/\s/g, '').toUpperCase(),
                        );
                        quoteDiscount.reset();
                      }}
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={!discountCode.trim() || quoteDiscount.isPending}
                      onClick={() => void handleApplyDiscount()}
                    >
                      {quoteDiscount.isPending ? (
                        <Loader2 size={15} className="animate-spin" />
                      ) : (
                        'اعمال'
                      )}
                    </Button>
                  </div>
                  {appliedDiscount && (
                    <p className="mt-2 text-xs font-semibold text-white">
                      {toPersianDigits(appliedDiscount.percentOff)}٪ تخفیف —
                      صرفه‌جویی {formatFaNumber(appliedDiscount.discountAmount)}{' '}
                      تومان
                    </p>
                  )}
                </div>
              )}

              <Button
                variant="secondary"
                className="mt-5 w-full text-primary"
                disabled={
                  payPublicPage.isPending ||
                  quoteDiscount.isPending ||
                  (!hasReferralDiscount &&
                    Boolean(discountCode.trim()) &&
                    !appliedDiscount)
                }
                onClick={() =>
                  payPublicPage.mutate(
                    hasReferralDiscount
                      ? undefined
                      : (appliedDiscount?.code ?? undefined),
                  )
                }
              >
                {payPublicPage.isPending ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : null}
                خرید و فعال‌سازی صفحهٔ اختصاصی
              </Button>
            </AppCard>
          )}

          {/* کارت فعال‌سازی رایگان فقط وقتی معنا دارد که صفحه با خرید پکیج فعال نشده باشد */}
          {!(isActive && status?.reason === 'PACKAGE') && (
            <AppCard>
              <h2 className="text-base font-black text-gray-900">
                فعال‌سازی رایگان با رزروهای موفق
              </h2>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">
                با رسیدن به {toPersianDigits(required)} رزرو موفق که پرداخت
                آن‌ها در درگاه با موفقیت انجام شده و لغو یا برگشت نشده باشند
                (مشابه بخش امور مالی)، صفحهٔ اختصاصی به‌صورت رایگان و برای همیشه
                فعال می‌شود.
              </p>

              <div className="mt-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-bold text-gray-800">
                    {toPersianDigits(paidBookings)} از{' '}
                    {toPersianDigits(required)}
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
          )}
        </div>
      </FadeIn>
    </DashboardShell>
  );
}
