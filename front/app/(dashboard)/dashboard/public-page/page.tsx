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
  Pencil,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { toast } from 'sonner';

import DashboardShell from '@/components/dashboard/layout/dashboard-shell';
import AppCard from '@/components/shared/app-card';
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
  useUpdatePublicPageSlug,
} from '@/services/features/public-page/hooks';

const URL_HOST_PREFIX = `${siteConfig.url.replace(/^https?:\/\//, '')}/barber/`;

/**
 * صفحهٔ اختصاصی (عمومی) آرایشگاه در داشبورد.
 *
 * صفحهٔ عمومی با آدرس `/barber/[slug]` وقتی فعال می‌شود که یکی از این دو شرط
 * برقرار باشد:
 *   • خرید یک‌بارهٔ پکیج ۷۹۹ هزار تومانی (مادام‌العمر)؛
 *   • یا ثبت ۳۰۰ رزرو موفق که پرداخت آن‌ها در درگاه انجام شده و لغو نشده باشند
 *     (مشابه بخش امور مالی).
 *
 * پس از فعال‌سازی، آرایشگر باید یک اسلاگ یکتا انتخاب کند تا به‌جای شناسهٔ عددی
 * در آدرس عمومی سالن نمایش داده شود.
 */
export default function PublicPagePage() {
  const [copied, setCopied] = useState(false);
  const [isEditingSlug, setIsEditingSlug] = useState(false);
  const [slugDraft, setSlugDraft] = useState('');

  const { data: statusData, isLoading } = useMyPublicPageStatus();
  const payPublicPage = usePayPublicPage();
  const updateSlug = useUpdatePublicPageSlug();

  const status = statusData?.data;
  const isActive = Boolean(status?.isActive);
  const currentSlug = status?.slug ?? null;
  const required = status?.requiredPaidBookings ?? 300;
  const paidBookings = status?.paidBookingsCount ?? 0;
  const progress = Math.min(100, Math.round((paidBookings / required) * 100));
  const price = status?.packagePriceTomans ?? 799000;
  const publicUrl = status?.publicUrl ?? '';

  const showSlugForm = isActive && (!currentSlug || isEditingSlug);
  const trimmedDraft = slugDraft.trim();
  const localValidation = validatePublicPageSlug(slugDraft);
  const candidateSlug = localValidation.valid ? localValidation.slug : '';
  const debouncedSlug = useDebounce(candidateSlug, 350);
  const isSameAsCurrent = Boolean(
    currentSlug &&
    localValidation.valid &&
    localValidation.slug === currentSlug,
  );
  const shouldCheckRemote =
    showSlugForm &&
    localValidation.valid &&
    !isSameAsCurrent &&
    debouncedSlug === localValidation.slug;

  const slugCheck = useCheckPublicPageSlug(debouncedSlug, shouldCheckRemote);
  const isCheckingAvailability =
    showSlugForm &&
    localValidation.valid &&
    !isSameAsCurrent &&
    (debouncedSlug !== localValidation.slug || slugCheck.isFetching);
  const remoteAvailability = slugCheck.data?.data;

  const canSaveSlug =
    localValidation.valid &&
    !isSameAsCurrent &&
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

  const handleStartEditSlug = () => {
    setSlugDraft(currentSlug ?? '');
    setIsEditingSlug(true);
  };

  const handleCancelEditSlug = () => {
    setSlugDraft('');
    setIsEditingSlug(false);
  };

  const handleSaveSlug = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!localValidation.valid) {
      toast.error(localValidation.reason);
      return;
    }

    if (isSameAsCurrent) {
      setIsEditingSlug(false);
      return;
    }

    try {
      const response = await updateSlug.mutateAsync(localValidation.slug);
      const savedSlug = response.data?.slug ?? localValidation.slug;
      void revalidateMyPublicBarberPage([currentSlug, savedSlug]);
      setSlugDraft('');
      setIsEditingSlug(false);
      toast.success(
        currentSlug
          ? 'اسلاگ صفحهٔ اختصاصی با موفقیت ویرایش شد'
          : 'اسلاگ صفحهٔ اختصاصی با موفقیت ثبت شد',
      );
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'خطا در ثبت اسلاگ'));
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
                  ? 'صفحهٔ اختصاصی شما فعال است؛ مشتریان می‌توانند بدون ورود به سامانه آن را با آدرس اختصاصی شما ببینند و در نتایج جستجو نمایش داده می‌شود.'
                  : 'صفحهٔ اختصاصی شما فعال شده است! برای ساخت لینک عمومی و جایگزینی شناسهٔ عددی در آدرس، لطفاً یک اسلاگ یکتا برای سالن خود انتخاب و ثبت کنید.'}
            </p>

            {isActive && currentSlug && publicUrl && !isEditingSlug && (
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
                  <Button
                    size="sm"
                    variant="ghost"
                    type="button"
                    onClick={handleStartEditSlug}
                  >
                    <Pencil size={14} /> تغییر اسلاگ
                  </Button>
                </div>
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
                    {currentSlug
                      ? 'ویرایش اسلاگ آدرس اختصاصی'
                      : 'ثبت اسلاگ آدرس اختصاصی سالن'}
                  </h3>
                </div>

                <p className="text-xs leading-6 text-muted-foreground">
                  این عبارت به‌جای شناسهٔ عددی در آدرس عمومی صفحهٔ شما نمایش
                  داده می‌شود. فقط از حروف انگلیسی کوچک، اعداد و خط تیره (-)
                  استفاده کنید.
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
                  ) : isSameAsCurrent ? (
                    <span className="text-muted-foreground">
                      این اسلاگ هم‌اکنون روی صفحهٔ شما ثبت شده است.
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
                    {currentSlug
                      ? 'ذخیرهٔ اسلاگ جدید'
                      : 'ثبت اسلاگ و ساخت لینک'}
                  </Button>
                  {currentSlug && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={updateSlug.isPending}
                      onClick={handleCancelEditSlug}
                    >
                      انصراف
                    </Button>
                  )}
                </div>
              </form>
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
                <li>• انتخاب اسلاگ (آدرس اختصاصی یکتا) بدون نمایش آیدی</li>
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
