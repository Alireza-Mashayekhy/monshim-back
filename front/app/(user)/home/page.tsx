'use client';
import { CalendarCheck2, MapPin, Scissors } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import BarberCard, {
  BarberCardSkeleton,
} from '@/components/shared/barber-card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { isoToJalali } from '@/lib/date-utils';
import { useCurrentUser } from '@/services/features/auth/hooks';
import { useHomeBarberList } from '@/services/features/barber/hooks';
import {
  useCancelBooking,
  useMyBookings,
} from '@/services/features/booking/hooks';
import { useLocationStore } from '@/store/useLocationStore';

export default function Home() {
  const { user } = useCurrentUser();
  const locationStore = useLocationStore();

  const [showCancelDialog, setShowCancelDialog] = useState(false);

  useEffect(() => {
    if (user?.cityId && user?.provinceId) {
      if (locationStore.cityId !== user.cityId) {
        locationStore.setLocation(
          user.provinceId,
          user.province?.name || '',
          user.cityId,
          user.city?.name || '',
        );
      }
    }
  }, [user?.cityId, user?.provinceId, user?.city?.name, user?.province?.name]);

  const effectiveCityId =
    user?.cityId ?? user?.city?.id ?? locationStore.cityId ?? undefined;
  const effectiveCityName = user?.city?.name || locationStore.cityName || '';

  // دریافت لیست نوبت‌های کاربر از دیتابیس
  const { data: myBookingsData, isLoading: bookingsLoading } = useMyBookings({
    limit: 5,
  });

  const { data: barbersData, isLoading: barbersLoading } = useHomeBarberList({
    cityId: effectiveCityId ? Number(effectiveCityId) : undefined,
    limit: 6,
  });

  const cancelMutation = useCancelBooking();

  // پیدا کردن اولین نوبت فعال (تأیید شده یا در انتظار)
  const activeBooking = myBookingsData?.data?.find(
    b => b.status === 'confirmed' || b.status === 'pending',
  );

  const handleConfirmCancel = async () => {
    if (!activeBooking?.id) return;
    try {
      await cancelMutation.mutateAsync(activeBooking.id);
      setShowCancelDialog(false);
    } catch {
      // خطا در هوک با toast مدیریت می‌شود
    }
  };

  const displayName = user?.fullName
    ? user.fullName.split(' ')[0]
    : 'کاربر گرامی';

  return (
    <div className="min-h-screen pb-10 text-right">
      <div className="max-w-md mx-auto px-4 pt-5 space-y-5">
        {/* ================= HEADER SECTION ================= */}
        <header className="flex items-center justify-between">
          {/* User profile & greeting */}
          <div className="flex items-center gap-3">
            <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-white shadow-sm ring-1 ring-primary/20 bg-primary-2 flex items-center justify-center text-primary font-bold text-base">
              {displayName.charAt(0)}
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-gray-500 font-medium">
                  سلام، {displayName}
                </span>
                {effectiveCityName && (
                  <span className="inline-flex items-center gap-0.5 text-[10px] text-primary bg-primary-2 px-1.5 py-0.5 rounded-md border border-primary/20 hover:bg-primary/20 transition-colors">
                    <MapPin size={10} />
                    <span>{effectiveCityName}</span>
                  </span>
                )}
              </div>
              <h1 className="text-sm sm:text-base font-black text-gray-900 tracking-tight">
                روز خوبی داشته باشید
              </h1>
            </div>
          </div>
        </header>
        {/* ================= PROMO / HERO BANNER ================= */}
        <section
          aria-label="آشنایی با سیستم مدیریت سالن منشیم"
          className="relative bg-white rounded-2xl border border-primary/30 shadow-xs overflow-hidden"
        >
          {/* Left illustration */}
          <Image
            src="/home/banner.jpg"
            alt="مدیریت سالن منشیم"
            width={1000}
            height={400}
            className="object-contain"
            priority
          />
        </section>

        {/* ================= NEXT APPOINTMENT CARD ================= */}
        {bookingsLoading ? (
          <div className="bg-white rounded-2xl border border-primary/20 p-5 animate-pulse space-y-3">
            <div className="h-5 bg-gray-200 rounded w-28" />
            <div className="h-12 bg-gray-100 rounded-xl" />
            <div className="h-9 bg-gray-200 rounded-xl" />
          </div>
        ) : activeBooking ? (
          <section
            aria-label="نوبت بعدی من"
            className="bg-white rounded-2xl border border-primary/30 shadow-xs p-4 sm:p-5 space-y-4"
          >
            {/* Card Top Row: Badge & Scissors Icon */}
            <div className="flex items-center justify-between">
              <span className="bg-primary-2 text-primary text-xs font-black px-3.5 py-1.5 rounded-lg inline-flex items-center gap-1">
                نوبت بعدی من
              </span>
              <div className="w-9 h-9 rounded-lg bg-primary-2 text-primary flex items-center justify-center">
                <Scissors size={18} />
              </div>
            </div>

            {/* Appointment Info Row */}
            <div className="flex items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-3">
                <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-primary-2 shrink-0 border border-gray-100 flex items-center justify-center text-primary">
                  {activeBooking?.barber?.profileImage && (
                    <Image
                      src={
                        process.env.NEXT_PUBLIC_IMAGE_URL +
                        activeBooking?.barber?.profileImage
                      }
                      fill
                      alt={activeBooking.barber?.salonName || 'سالن زیبایی'}
                    />
                  )}
                </div>
                <div className="flex flex-col">
                  <h3 className="text-sm font-black text-gray-900">
                    {activeBooking.barber?.salonName || 'سالن زیبایی'}
                  </h3>
                  <span className="text-xs text-gray-400 mt-1 font-medium">
                    {activeBooking.service?.name || 'خدمات رزرو شده'}
                  </span>
                </div>
              </div>

              {/* Date & Time */}
              <div className="text-left flex flex-col items-end">
                <span className="text-xs text-gray-500 font-medium">
                  {isoToJalali(activeBooking.date) || 'نوبت ثبت‌شده'}
                </span>
                <span className="text-sm font-black text-gray-900 mt-0.5 dir-ltr">
                  {activeBooking.time.split(':')[0]}:
                  {activeBooking.time.split(':')[1]}
                </span>
              </div>
            </div>

            {/* Action Buttons: مشاهده جزئیات & لغو */}
            <div className="grid grid-cols-2 gap-2 pt-2">
              <Link href="/appointments">
                <Button className="w-full">مشاهده جزئیات</Button>
              </Link>

              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCancelDialog(true)}
              >
                لغو
              </Button>
            </div>
          </section>
        ) : (
          /* وضعیت واقعی در صورت نبود نوبت فعال (بدون دیتای فیک) */
          <section
            aria-label="نوبت بعدی من"
            className="bg-white rounded-2xl border border-primary/30 shadow-xs p-5 space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="bg-primary-2 text-primary text-xs font-black px-3.5 py-1.5 rounded-lg inline-flex items-center gap-1">
                نوبت بعدی من
              </span>
              <div className="w-9 h-9 rounded-lg bg-primary-2 text-primary flex items-center justify-center">
                <CalendarCheck2 size={18} />
              </div>
            </div>

            <div className="py-2 text-center space-y-1">
              <p className="text-sm font-bold text-gray-800">
                در حال حاضر نوبت فعالی ندارید
              </p>
              <p className="text-xs text-gray-500 leading-relaxed">
                می‌توانید از بین سالن‌های زیبایی، نوبت جدید خود را رزرو کنید.
              </p>
            </div>

            <Link href="/explore">
              <Button className="w-full">رزرو نوبت جدید</Button>
            </Link>
          </section>
        )}

        {/* ================= NEARBY BARBERS SECTION ================= */}
        <section aria-label="آرایشگاه‌های شهر شما" className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-black text-gray-900">
                آرایشگاه‌های شهر شما
              </h2>
              {effectiveCityName && (
                <span className="text-[11px] font-bold text-primary bg-primary-2 px-2 py-0.5 rounded-lg border border-primary/20">
                  {effectiveCityName}
                </span>
              )}
            </div>
            <Link
              href="/explore"
              className="text-xs font-bold text-primary hover:underline transition-all"
            >
              مشاهده همه
            </Link>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {barbersLoading
              ? // بارگذاری اسکلتون
                Array.from({ length: 2 }).map((_, i) => (
                  <BarberCardSkeleton key={i} />
                ))
              : barbersData?.data &&
                barbersData.data.length > 0 &&
                // داده‌های واقعی از دیتابیس
                barbersData.data.slice(0, 4).map(barber => {
                  return <BarberCard key={barber?.salonName} barber={barber} />;
                })}
          </div>
        </section>
      </div>

      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent className="max-w-sm rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>لغو نوبت رزرو شده</AlertDialogTitle>
            <AlertDialogDescription>
              آیا از لغو نوبت {activeBooking?.barber?.salonName} در تاریخ{' '}
              {activeBooking?.date} ساعت {activeBooking?.time} اطمینان دارید؟
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>انصراف</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmCancel}
              disabled={cancelMutation.isPending}
              variant="destructive"
            >
              {cancelMutation.isPending ? 'در حال لغو...' : 'تأیید و لغو'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
