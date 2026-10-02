// app/(dashboard)/profile/page.tsx
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  Camera,
  CheckCircle2,
  Clock3,
  Copy,
  LogOut,
  Pencil,
  Share2,
  Store,
  User,
  UsersRound,
} from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import * as z from 'zod';

import DashboardShell from '@/components/dashboard/layout/dashboard-shell';
import { BasicInfoDrawer } from '@/components/dashboard/profile/basic-info-drawer';
import PortfolioManager from '@/components/dashboard/profile/portfolio-manager';
import { SalonInfoDrawer } from '@/components/dashboard/profile/salon-info-drawer';
import AppCard from '@/components/shared/app-card';
import FadeIn from '@/components/shared/fade-in';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { getApiErrorMessage } from '@/lib/api-error';
import { isoToJalali } from '@/lib/date-utils';
import { getImageUploadError, IMAGE_ACCEPT } from '@/lib/image-upload';
import { DefaultImage, getFullImageUrl, toPersianDigits } from '@/lib/utils';
import { useLogout } from '@/services/features/auth/hooks';
import {
  useMyBarberProfile,
  useMyReferralCode,
  useMyReferrals,
  useUploadProfileImage,
} from '@/services/features/barber/hooks';

const schema = z.object({
  fullName: z.string().min(1, 'نام و نام خانوادگی الزامی است'),
  birthDate: z.string().optional().nullable(),
  salonName: z.string().min(1, 'نام فروشگاه الزامی است'),
  provinceId: z.string().nullable(),
  cityId: z.string().nullable(),
  address: z.string().min(1, 'آدرس الزامی است'),
  bio: z.string().optional(),
  workStartTime: z.string().nullable().optional(),
  workEndTime: z.string().nullable().optional(),
});
type FormData = z.infer<typeof schema>;

export default function ProfilePage() {
  const { data: profile, isLoading, error } = useMyBarberProfile();
  const uploadImageMutation = useUploadProfileImage();
  const { data: referralData } = useMyReferralCode();

  const {
    data: referralsData,
    isLoading: referralsLoading,
    isError: referralsError,
    refetch: retryReferralQuery,
  } = useMyReferrals();

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [basicInfoDrawerOpen, setBasicInfoDrawerOpen] = useState(false);
  const [salonInfoDrawerOpen, setSalonInfoDrawerOpen] = useState(false);
  const logoutMutation = useLogout();
  const router = useRouter();

  const methods = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      fullName: '',
      birthDate: null,
      salonName: '',
      provinceId: null,
      cityId: null,
      address: '',
      bio: '',
      workStartTime: null,
      workEndTime: null,
    },
  });

  const { reset } = methods;

  // پر کردن فرم با داده‌های پروفایل
  useEffect(() => {
    if (profile?.data) {
      reset({
        fullName: profile.data.fullName || '',
        birthDate: isoToJalali(profile.data.birthDate) || null,
        salonName: profile.data.salonName || '',
        provinceId: profile.data.provinceId
          ? String(profile.data.provinceId)
          : null,
        cityId: profile.data.cityId ? String(profile.data.cityId) : null,
        address: profile.data.address || '',
        bio: profile.data.bio || '',
        workStartTime: profile.data.workStartTime || null,
        workEndTime: profile.data.workEndTime || null,
      });
    }
  }, [profile?.data, reset]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) {
      const validationError = getImageUploadError(file);
      if (validationError) {
        toast.error(validationError);
        return;
      }
      uploadImageMutation.mutate(file, {
        onSuccess: imageUrl => {
          setImagePreview(imageUrl);
          // مقدار فرم را به‌روز نمی‌کنیم چون در بک‌اند ذخیره می‌شود و در fetch بعدی می‌آید
        },
      });
    }
  };

  const handleLogout = async () => {
    if (logoutMutation.isPending) return;
    try {
      await logoutMutation.mutateAsync();
      router.replace('/login');
      router.refresh();
    } catch (logoutError) {
      toast.error(
        getApiErrorMessage(logoutError, 'خروج انجام نشد. دوباره تلاش کنید.'),
      );
    }
  };

  if (isLoading) {
    return (
      <DashboardShell>
        <div className="space-y-4">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </DashboardShell>
    );
  }

  if (error) {
    return (
      <DashboardShell>
        <div className="text-center py-10 text-red-500">
          خطا در بارگذاری اطلاعات:{' '}
          {(error as any)?.message || 'لطفاً مجدداً تلاش کنید'}
        </div>
      </DashboardShell>
    );
  }

  const isRejected = profile?.data?.rejectionReason;
  const myReferrals = referralsData?.data?.referrals ?? [];
  const referralStats = referralsData?.data?.stats;

  return (
    <DashboardShell>
      <FadeIn>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-800">پروفایل من</h2>
            <p className="text-sm text-gray-500">
              اطلاعات شخصی و تنظیمات حساب خود را مدیریت کنید
            </p>
          </div>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={handleLogout}
            loading={logoutMutation.isPending}
            className="gap-2 self-start"
          >
            <LogOut size={16} />
            خروج از حساب
          </Button>
        </div>
      </FadeIn>

      {/* وضعیت تایید */}
      {profile && (
        <FadeIn delay={0.05}>
          <AppCard
            className={`border-r-4 ${
              profile?.data?.isApproved
                ? 'border-green-500 bg-green-50'
                : isRejected
                  ? 'border-red-500 bg-red-50'
                  : 'border-yellow-500 bg-yellow-50'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`p-2 rounded-full ${
                  profile?.data?.isApproved
                    ? 'bg-green-100 text-green-700'
                    : isRejected
                      ? 'bg-red-100 text-red-700'
                      : 'bg-yellow-100 text-yellow-700'
                }`}
              >
                {profile?.data?.isApproved ? '✅' : isRejected ? '❌' : '⏳'}
              </div>
              <div>
                <p className="font-bold">
                  {profile?.data?.isApproved
                    ? 'حساب شما تایید شده است'
                    : isRejected
                      ? 'درخواست شما رد شده است'
                      : 'در انتظار تایید'}
                </p>
                {isRejected && (
                  <p className="text-sm text-red-600 mt-1">
                    دلیل: {profile?.data?.rejectionReason}
                  </p>
                )}
                {!profile?.data?.isApproved && !isRejected && (
                  <p className="text-sm text-yellow-600 mt-1">
                    اطلاعات شما در حال بررسی است، پس از تایید فعال می‌شود.
                  </p>
                )}
              </div>
            </div>
          </AppCard>
        </FadeIn>
      )}

      <FadeIn delay={0.1}>
        <div className="space-y-2 lg:space-y-5">
          <AppCard>
            <div className="flex flex-col items-center gap-4 sm:flex-row">
              <div className="relative">
                <Image
                  src={
                    getFullImageUrl(
                      imagePreview || profile?.data?.profileImage,
                    ) || DefaultImage
                  }
                  alt="پروفایل"
                  width={96}
                  height={96}
                  unoptimized
                  className="w-24 h-24 rounded-full border-2 border-gray-200 object-cover"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 bg-primary text-white p-1.5 rounded-full shadow-lg hover:bg-primary-700"
                >
                  <Camera size={16} />
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept={IMAGE_ACCEPT}
                  onChange={handleImageUpload}
                />
              </div>
              <div>
                <h3 className="font-bold text-gray-800">عکس پروفایل</h3>
                <p className="text-sm text-gray-500">
                  برای تغییر عکس کلیک کنید (حداکثر ۵ مگابایت)
                </p>
                {uploadImageMutation.isPending && (
                  <p className="text-xs text-primary-600 mt-1">
                    در حال آپلود...
                  </p>
                )}
              </div>
            </div>
          </AppCard>
          <AppCard>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                <User size={18} className="text-primary-600" />
                اطلاعات فردی
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setBasicInfoDrawerOpen(true)}
                className="gap-1"
              >
                <Pencil size={14} />
                ویرایش
              </Button>
            </div>
            <div className="space-y-3">
              <InfoRow
                label="نام و نام خانوادگی"
                value={profile?.data?.fullName || 'ثبت نشده'}
              />
              <InfoRow
                label="تاریخ تولد"
                value={
                  profile?.data?.birthDate
                    ? isoToJalali(profile.data.birthDate)
                    : 'ثبت نشده'
                }
              />
            </div>
          </AppCard>
          <AppCard>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                <Store size={18} className="text-primary-600" />
                اطلاعات فروشگاه
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSalonInfoDrawerOpen(true)}
                className="gap-1"
              >
                <Pencil size={14} />
                ویرایش
              </Button>
            </div>
            <div className="space-y-3">
              <InfoRow
                label="نام فروشگاه"
                value={profile?.data?.salonName || 'ثبت نشده'}
              />
              <InfoRow
                label="استان"
                value={profile?.data?.provinceName || 'ثبت نشده'}
              />
              <InfoRow
                label="شهر"
                value={profile?.data?.cityName || 'ثبت نشده'}
              />
              <InfoRow
                label="آدرس"
                value={profile?.data?.address || 'ثبت نشده'}
              />
              <InfoRow
                label="بیوگرافی"
                value={profile?.data?.bio || 'ثبت نشده'}
              />
            </div>
          </AppCard>
          <PortfolioManager images={profile?.data?.portfolioImages} />
          <AppCard>
            <h3 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
              <Share2 size={18} className="text-primary-600" />
              کد معرف شما
            </h3>
            <p className="text-sm text-gray-500 mb-3">
              آرایشگرهای دیگر را دعوت کنید؛ با تکمیل ۵ رزرو موفق توسط هر آرایشگر
              دعوت‌شده، ۳۰٬۰۰۰ تومان به کیف پول شما اضافه می‌شود.
            </p>
            {referralData?.data?.referralCode ? (
              <div className="flex items-center gap-2">
                <div className="flex-1 rounded-lg bg-gray-100 px-4 py-3 text-center">
                  <span className="font-mono text-lg font-bold tracking-widest text-primary-700">
                    {referralData.data.referralCode}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (!navigator.clipboard?.writeText) {
                      toast.error('مرورگر شما از کپی خودکار پشتیبانی نمی‌کند.');
                      return;
                    }

                    void navigator.clipboard
                      .writeText(referralData.data.referralCode)
                      .then(() => toast.success('کد معرف کپی شد.'))
                      .catch(() => toast.error('کپی کد معرف انجام نشد.'));
                  }}
                  className="rounded-lg bg-primary-100 p-3 text-primary-700 transition-colors hover:bg-primary-200"
                  title="کپی کد معرف"
                  aria-label="کپی کد معرف"
                >
                  <Copy size={18} />
                </button>
              </div>
            ) : (
              <p className="text-sm text-gray-400">
                کد معرف هنوز در دسترس نیست.
              </p>
            )}
            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <ReferralStat
                icon={<UsersRound size={17} />}
                label="تعداد معرفی‌ها"
                value={
                  referralsLoading || referralsError
                    ? '—'
                    : (referralStats?.total ?? 0)
                }
                color="text-blue-600 bg-blue-50"
              />
              <ReferralStat
                icon={<CheckCircle2 size={17} />}
                label="پاداش‌های واریزشده"
                value={
                  referralsLoading || referralsError
                    ? '—'
                    : (referralStats?.completed ?? 0)
                }
                color="text-green-600 bg-green-50"
              />
              <ReferralStat
                icon={<Clock3 size={17} />}
                label="دعوت‌های در جریان"
                value={
                  referralsLoading || referralsError
                    ? '—'
                    : (referralStats?.pending ?? 0)
                }
                color="text-amber-600 bg-amber-50"
              />
            </div>

            <div className="mt-5 border-t border-gray-100 pt-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h4 className="font-bold text-gray-800">
                  آرایشگرهای معرفی‌شده
                </h4>
                <span className="rounded-full bg-primary-50 px-2.5 py-1 text-xs font-semibold text-primary-700">
                  {referralsLoading || referralsError
                    ? '—'
                    : toPersianDigits(referralStats?.total ?? 0)}{' '}
                  نفر
                </span>
              </div>

              {referralsLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : referralsError ? (
                <div
                  role="alert"
                  className="rounded-xl bg-amber-50 px-4 py-5 text-center text-sm text-amber-800"
                >
                  <p>بارگذاری آمار معرفی‌ها انجام نشد.</p>
                  <button
                    type="button"
                    onClick={() => void retryReferralQuery()}
                    className="mt-2 font-semibold underline underline-offset-2"
                  >
                    تلاش دوباره
                  </button>
                </div>
              ) : myReferrals.length > 0 ? (
                <div className="divide-y divide-gray-100">
                  {myReferrals.map(referral => {
                    const completedCount = referral.completedBookingsCount ?? 0;
                    const rewardPaid = referral.rewardPaid;
                    const title =
                      referral.referredSalonName ||
                      referral.referredFullName ||
                      `آرایشگر ${toPersianDigits(referral.referredUserId)}`;
                    const subtitle =
                      referral.referredSalonName && referral.referredFullName
                        ? referral.referredFullName
                        : `عضویت در ${new Date(referral.createdAt).toLocaleDateString('fa-IR')}`;

                    return (
                      <div
                        key={referral.id}
                        className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center"
                      >
                        <div className="flex min-w-0 flex-1 items-center gap-3">
                          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-700">
                            <Store size={17} />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-gray-800">
                              {title}
                            </p>
                            <p className="truncate text-xs text-gray-400">
                              {subtitle}
                            </p>
                          </div>
                        </div>

                        <div className="w-full sm:max-w-64">
                          <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                            <span className="font-medium text-gray-600">
                              {toPersianDigits(completedCount)} رزرو موفق
                            </span>
                            <span className="text-gray-400">
                              شرط پاداش: ۵ رزرو
                            </span>
                          </div>
                          <div
                            className="h-1.5 overflow-hidden rounded-full bg-gray-100"
                            role="progressbar"
                            aria-label={`پیشرفت رزروهای ${title}`}
                            aria-valuemin={0}
                            aria-valuemax={5}
                            aria-valuenow={Math.min(completedCount, 5)}
                          >
                            <div
                              className="h-full rounded-full bg-primary transition-all"
                              style={{
                                width: `${Math.min(completedCount / 5, 1) * 100}%`,
                              }}
                            />
                          </div>
                        </div>

                        <span
                          className={`inline-flex shrink-0 items-center gap-1 self-start rounded-full px-2.5 py-1 text-xs font-semibold sm:self-center ${
                            rewardPaid
                              ? 'bg-green-50 text-green-700'
                              : 'bg-amber-50 text-amber-700'
                          }`}
                        >
                          {rewardPaid ? (
                            <>
                              <CheckCircle2 size={14} />
                              پاداش ۳۰٬۰۰۰ تومانی واریز شد
                            </>
                          ) : (
                            <>
                              <Clock3 size={14} />
                              در انتظار پاداش
                            </>
                          )}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="rounded-xl bg-gray-50 px-4 py-6 text-center text-sm text-gray-400">
                  هنوز آرایشگری با کد شما ثبت‌نام نکرده است.
                </p>
              )}
            </div>
          </AppCard>{' '}
        </div>
      </FadeIn>

      <BasicInfoDrawer
        open={basicInfoDrawerOpen}
        onOpenChange={setBasicInfoDrawerOpen}
      />
      <SalonInfoDrawer
        open={salonInfoDrawerOpen}
        onOpenChange={setSalonInfoDrawerOpen}
      />
    </DashboardShell>
  );
}

function ReferralStat({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  color: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-3">
      <div
        className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${color}`}
      >
        {icon}
      </div>
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="mt-0.5 text-lg font-bold text-gray-800">
          {toPersianDigits(value)}
        </p>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-medium text-gray-800">{value}</span>
    </div>
  );
}
