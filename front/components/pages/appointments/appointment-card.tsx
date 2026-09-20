'use client';

import {
  AlertTriangle,
  CalendarClock,
  CalendarDays,
  Eye,
  Loader2,
  MapPin,
  Scissors,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';

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
import { canCancelBooking } from '@/constants/booking';
import {
  BOOKING_STATUS_BADGE_CLASS,
  BOOKING_STATUS_LABEL,
} from '@/constants/booking';
import { toFa } from '@/lib/jalali';
import { cn, formatPrice, getFullImageUrl } from '@/lib/utils';
import { useCancelBooking } from '@/services/features/booking/hooks';
import type { MyBooking } from '@/services/features/booking/types';

interface AppointmentCardProps {
  booking: MyBooking;
}

const DAY_MS = 86_400_000;

/** اختلاف روز هدف با امروز (۰ = امروز، ۱ = فردا) */
const dayDiffFromToday = (isoDate: string): number => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(target.getTime())) return Number.NaN;
  return Math.round((target.getTime() - today.getTime()) / DAY_MS);
};

/** برچسب خوانا برای تاریخ نوبت: امروز / فردا، ۱۸ مهر / ۱۸ مهر ۱۴۰۵ */
const bookingDateLabel = (date: string): string => {
  if (!date) return '';
  const d = new Date(`${date}T00:00:00`);
  if (Number.isNaN(d.getTime())) return date;

  const diff = dayDiffFromToday(date);
  if (diff === 0) return 'امروز';
  if (diff === 1)
    return `فردا، ${d.toLocaleDateString('fa-IR', {
      day: 'numeric',
      month: 'long',
    })}`;
  if (diff > 1)
    return d.toLocaleDateString('fa-IR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  return d.toLocaleDateString('fa-IR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

export function AppointmentCard({ booking }: AppointmentCardProps) {
  const [cancelOpen, setCancelOpen] = useState(false);
  const cancelBooking = useCancelBooking();

  const salonName = booking.barber?.salonName;
  const address = booking.barber?.address;
  const serviceName = booking.service?.name;
  const duration = booking.service?.durationMinutes;
  const deposit = Number(booking.service?.depositPrice) || 0;
  const cancelable = canCancelBooking(booking.status);
  const salonId = booking.barber?.id;
  const imageUrl = getFullImageUrl(booking.barber?.profileImage);

  const handleCancel = async () => {
    try {
      await cancelBooking.mutateAsync(booking.id);
      setCancelOpen(false);
    } catch {
      // خطا در هوک با toast نمایش داده می‌شود
    }
  };

  return (
    <>
      <div className="w-full bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
        {/* وضعیت + آیکون */}
        <div className="flex items-center justify-between">
          <span
            className={cn(
              'inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-bold whitespace-nowrap',
              BOOKING_STATUS_BADGE_CLASS[booking.status],
            )}
          >
            {BOOKING_STATUS_LABEL[booking.status]}
          </span>
          <div className="w-8 h-8 rounded-lg bg-primary-2/60 text-primary flex items-center justify-center shrink-0">
            <CalendarClock size={15} />
          </div>
        </div>

        {/* سالن + خدمت */}
        <div className="flex items-start gap-3">
          <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-primary-2 border border-gray-100 shrink-0 flex items-center justify-center text-primary">
            {imageUrl ? (
              <Image
                src={imageUrl}
                alt={salonName || 'سالن زیبایی'}
                fill
                sizes="56px"
                className="object-cover"
              />
            ) : (
              <Scissors size={20} />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-black text-gray-900 truncate">
              {salonName || 'سالن زیبایی'}
            </h3>
            <p className="text-xs text-gray-500 mt-1 truncate">
              {serviceName || 'خدمت'}
              {duration ? ` • ${toFa(duration)} دقیقه` : ''}
            </p>
            {booking.note && (
              <p className="text-[11px] text-gray-400 mt-1 truncate">
                توضیحات: {booking.note}
              </p>
            )}
          </div>
        </div>

        {/* آرایشگاه و خدمت */}
        {/* تاریخ و آدرس */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs text-gray-700 font-bold">
            <CalendarDays size={13} className="text-primary-600 shrink-0" />
            <span>
              {bookingDateLabel(booking.date)}
              {booking.time ? ` - ساعت ${toFa(booking.time)}` : ''}
            </span>
          </div>
          {address && (
            <div className="flex items-start gap-1.5 text-[11px] text-gray-400">
              <MapPin size={13} className="shrink-0 mt-0.5" />
              <span className="line-clamp-1">{address}</span>
            </div>
          )}
        </div>

        {/* مبلغ */}
        <div className="pt-3 border-t border-gray-100 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">مبلغ کل رزرو</span>
            <span className="text-sm font-black text-gray-900">
              {booking.price ? `${formatPrice(booking.price)} تومان` : '—'}
            </span>
          </div>

          {deposit > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-gray-400">بیعانه</span>
              <span className="text-[11px] font-bold text-primary-600">
                {formatPrice(deposit)} تومان
              </span>
            </div>
          )}
        </div>

        {/* اقدامات */}
        <div
          className={cn(
            'grid gap-2',
            cancelable ? 'grid-cols-2' : 'grid-cols-1',
          )}
        >
          {salonId != null && (
            <Link href={`/barber/${salonId}`} className="contents">
              <Button className="w-full gap-1.5">
                <Eye size={15} />
                مشاهده جزئیات
              </Button>
            </Link>
          )}

          {cancelable && (
            <Button
              variant="outline"
              type="button"

              className="w-full border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-300"
              onClick={() => setCancelOpen(true)}
              disabled={cancelBooking.isPending}
            >
              لغو نوبت
            </Button>
          )}
        </div>
      </div>

      <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <AlertDialogContent className="max-w-sm rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>لغو نوبت</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                آیا از لغو نوبت {salonName || 'این سالن'} در تاریخ{' '}
                {booking.date} ساعت {booking.time} مطمئن هستید؟ این عمل قابل
                بازگشت نیست.
              </p>
              <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl p-3 text-xs text-red-600 font-medium leading-5">
                <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                <span>
                  با لغو نوبت، بیعانه پرداخت‌شده به شما بازگردانده نمی‌شود.
                </span>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>انصراف</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              disabled={cancelBooking.isPending}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {cancelBooking.isPending ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                'تأیید و لغو'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function AppointmentCardSkeleton() {
  return (
    <div className="w-full bg-white rounded-2xl border border-gray-100 p-4 animate-pulse">
      <div className="flex justify-between">
        <div className="h-4 w-24 bg-gray-100 rounded-full" />
        <div className="h-8 w-8 bg-gray-100 rounded-lg" />
      </div>
      <div className="flex items-center gap-3 mt-4">
        <div className="h-14 w-14 bg-gray-100 rounded-xl" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-2/3 bg-gray-100 rounded" />
          <div className="h-3 w-1/2 bg-gray-100 rounded" />
        </div>{' '}
      </div>
      <div className="h-3 w-1/2 bg-gray-100 rounded mt-3" />
      <div className="h-3 w-2/3 bg-gray-100 rounded mt-2" />
      <div className="flex justify-between mt-4 pt-3 border-t border-gray-100">
        <div className="h-4 w-24 bg-gray-100 rounded" />
        <div className="h-4 w-28 bg-gray-100 rounded" />
      </div>
    </div>
  );
}
