// app/(dashboard)/profile/page.tsx
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Camera, Copy, Pencil, Share2, Store, User } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import * as z from 'zod';

import DashboardShell from '@/components/dashboard/layout/dashboard-shell';
import { BasicInfoDrawer } from '@/components/dashboard/profile/basic-info-drawer';
import { SalonInfoDrawer } from '@/components/dashboard/profile/salon-info-drawer';
import AppCard from '@/components/shared/app-card';
import FadeIn from '@/components/shared/fade-in';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { isoToJalali } from '@/lib/date-utils';
import { getImageUploadError, IMAGE_ACCEPT } from '@/lib/image-upload';
import { DefaultImage } from '@/lib/utils';
import {
  useMyBarberProfile,
  useMyReferralCode,
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

  const selectedProvince = profile?.data?.provinceId;

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [basicInfoDrawerOpen, setBasicInfoDrawerOpen] = useState(false);
  const [salonInfoDrawerOpen, setSalonInfoDrawerOpen] = useState(false);
  const [workHoursDrawerOpen, setWorkHoursDrawerOpen] = useState(false);

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

  const { reset, watch } = methods;

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
      setImagePreview(profile.data.profileImage || null);
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

  return (
    <DashboardShell>
      <FadeIn>
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-gray-800">پروفایل من</h2>
            <p className="text-sm text-gray-500">
              اطلاعات شخصی و تنظیمات حساب خود را مدیریت کنید
            </p>
          </div>
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
                <img
                  src={imagePreview || DefaultImage}
                  alt="پروفایل"
                  className="w-24 h-24 rounded-full object-cover border-2 border-gray-200"
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
          {/* کد معرف */}
          <AppCard>
            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Share2 size={18} className="text-primary-600" />
              کد معرف شما
            </h3>
            <p className="text-sm text-gray-500 mb-3">
              کد معرف خود را با آرایشگرهای دیگر به اشتراک بگذارید. وقتی آرایشگری
              با کد شما ثبت‌نام کند و ۵ رزرو موفق انجام دهد، ۵۰,۰۰۰ تومان به کیف
              پول شما اضافه می‌شود.
            </p>
            {referralData?.data?.referralCode ? (
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-gray-100 rounded-lg px-4 py-3 text-center">
                  <span className="font-mono text-lg font-bold tracking-widest text-primary-700">
                    {referralData?.data?.referralCode || ''}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(
                      referralData?.data?.referralCode || '',
                    );
                  }}
                  className="p-3 bg-primary-100 text-primary-700 rounded-lg hover:bg-primary-200 transition-colors"
                  title="کپی کد معرف"
                >
                  <Copy size={18} />
                </button>
              </div>
            ) : (
              <p className="text-sm text-gray-400"></p>
            )}
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

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-medium text-gray-800">{value}</span>
    </div>
  );
}
