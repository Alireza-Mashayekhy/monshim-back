'use client';

import { CalendarClock, Loader2, MapPin, Scissors, Store } from 'lucide-react';
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
import { formatPersianWeekday, isoToJalali } from '@/lib/date-utils';
import { cn, formatPrice } from '@/lib/utils';
import { useCancelBooking } from '@/services/features/booking/hooks';
import type { MyBooking } from '@/services/features/booking/types';

interface AppointmentCardProps {
  booking: MyBooking;
}

export function AppointmentCard({ booking }: AppointmentCardProps) {
  const [cancelOpen, setCancelOpen] = useState(false);
  const cancelBooking = useCancelBooking();

  const salonName = booking.barber?.salonName;
  const serviceName = booking.service?.name;
  const duration = booking.service?.durationMinutes;
  const cancelable = canCancelBooking(booking.status);

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
      <div className="w-full bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        {/* وضعیت + تاریخ */}
        <div className="flex items-start justify-between gap-2">
          <span
            className={cn(
              'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium whitespace-nowrap',
              BOOKING_STATUS_BADGE_CLASS[booking.status],
            )}
          >
            {BOOKING_STATUS_LABEL[booking.status]}
          </span>

          <div className="text-left">
            <p className="text-sm font-bold text-gray-800">
              {isoToJalali(booking.date) || booking.date}
            </p>
            <p className="text-[10px] text-gray-400">
              {formatPersianWeekday(booking.date)}
            </p>
          </div>
        </div>

        {/* آرایشگاه و خدمت */}
        <div className="mt-3 space-y-1.5">
          {salonName && (
            <div className="flex items-center gap-1.5 text-sm text-gray-700">
              <Store size={14} className="shrink-0 text-primary-600" />
              <span className="font-medium truncate">{salonName}</span>
            </div>
          )}

          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Scissors size={13} className="shrink-0 text-gray-400" />
            <span className="truncate">
              {serviceName || 'خدمت'}
              {duration ? ` • ${duration} دقیقه` : ''}
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <CalendarClock size={13} className="shrink-0 text-gray-400" />
            <span>ساعت {booking.time}</span>
          </div>

          {booking.barber?.address && (
            <div className="flex items-start gap-1.5 text-xs text-gray-400">
              <MapPin size={13} className="shrink-0 mt-0.5" />
              <span className="line-clamp-2">{booking.barber.address}</span>
            </div>
          )}
        </div>

        {booking.note && (
          <p className="mt-3 text-xs text-gray-500 bg-gray-50 rounded-lg p-2 leading-5">
            {booking.note}
          </p>
        )}

        {/* قیمت + لغو */}
        <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
          <span className="text-sm font-bold text-gray-800">
            {booking.price ? `${formatPrice(booking.price)} تومان` : '—'}
          </span>

          {cancelable && (
            <Button
              variant="outline"
              size="sm"
              className="rounded-full text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
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
            <AlertDialogDescription>
              آیا از لغو این نوبت مطمئن هستید؟ این عمل قابل بازگشت نیست.
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
                'لغو نوبت'
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
        <div className="h-4 w-20 bg-gray-100 rounded" />
      </div>
      <div className="h-4 w-2/3 bg-gray-100 rounded mt-4" />
      <div className="h-3 w-1/2 bg-gray-100 rounded mt-2" />
      <div className="h-3 w-1/3 bg-gray-100 rounded mt-2" />
      <div className="flex justify-between mt-4 pt-3 border-t border-gray-100">
        <div className="h-4 w-24 bg-gray-100 rounded" />
        <div className="h-7 w-24 bg-gray-100 rounded-full" />
      </div>
    </div>
  );
}
