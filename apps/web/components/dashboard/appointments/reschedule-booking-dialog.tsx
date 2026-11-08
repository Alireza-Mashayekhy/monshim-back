'use client';

import { CalendarClock, Clock3, MessageSquareText } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { formatJalaliDate, parseISODateLocal } from '@/lib/jalali';
import { cn, toPersianDigits } from '@/lib/utils';
import {
  useAvailableSlots,
  useUpdateBookingTime,
} from '@/services/features/booking/hooks';
import type { Booking } from '@/services/features/booking/types';

interface RescheduleBookingDialogProps {
  booking: Booking;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RescheduleBookingDialog({
  booking,
  open,
  onOpenChange,
}: RescheduleBookingDialogProps) {
  const [selectedTime, setSelectedTime] = useState('');
  const updateTime = useUpdateBookingTime();
  const serviceIds = useMemo(() => [booking.serviceId], [booking.serviceId]);
  const currentTime = booking.time.slice(0, 5);

  const {
    data: slotsResponse,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useAvailableSlots(
    String(booking.barberId),
    open ? booking.date : null,
    serviceIds,
    booking.id,
  );

  const slots = useMemo(
    () =>
      Array.from(new Set(slotsResponse?.data?.slots ?? [])).filter(
        slot => slot !== currentTime,
      ),
    [slotsResponse?.data?.slots, currentTime],
  );

  const closeAndReset = () => {
    setSelectedTime('');
    onOpenChange(false);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      if (!updateTime.isPending) closeAndReset();
      return;
    }
    onOpenChange(true);
  };

  const handleSubmit = () => {
    if (!selectedTime || updateTime.isPending) return;

    if (isFetching || !slots.includes(selectedTime)) {
      setSelectedTime('');
      toast.error('این ساعت دیگر آزاد نیست؛ لطفاً ساعت دیگری انتخاب کنید.');
      return;
    }

    updateTime.mutate(
      { id: booking.id, time: selectedTime },
      { onSuccess: closeAndReset },
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent dir="rtl" className="max-w-md rounded-3xl p-5">
        <DialogHeader className="text-right">
          <DialogTitle className="flex items-center gap-2 text-base font-black text-gray-900">
            <CalendarClock size={19} className="text-primary" />
            تغییر ساعت نوبت
          </DialogTitle>
          <DialogDescription className="text-xs leading-6 text-gray-500">
            ساعت جدید نوبت {booking.customer?.fullName || 'مشتری'} را برای خدمت
            «{booking.service?.name || 'خدمت'}» انتخاب کنید.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between gap-3 rounded-2xl bg-gray-50 px-3 py-2.5 text-xs">
          <span className="font-bold text-gray-500">
            {formatJalaliDate(parseISODateLocal(booking.date))}
          </span>
          <span className="inline-flex items-center gap-1.5 font-black text-gray-800">
            <Clock3 size={14} className="text-gray-400" />
            ساعت فعلی: {toPersianDigits(currentTime)}
          </span>
        </div>

        <div className="min-h-32">
          <p className="mb-2.5 text-xs font-black text-gray-700">
            ساعت‌های آزاد
          </p>

          {isLoading ? (
            <div className="grid grid-cols-4 gap-2">
              {Array.from({ length: 8 }).map((_, index) => (
                <Skeleton key={index} className="h-10 rounded-xl" />
              ))}
            </div>
          ) : isError ? (
            <div className="rounded-2xl border border-red-100 bg-red-50/60 p-4 text-center">
              <p className="text-xs font-bold text-red-600">
                دریافت ساعت‌های آزاد ناموفق بود.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => void refetch()}
              >
                تلاش دوباره
              </Button>
            </div>
          ) : slots.length ? (
            <div className="grid max-h-64 grid-cols-4 gap-2 overflow-y-auto p-0.5">
              {slots.map(slot => {
                const selected = selectedTime === slot;
                return (
                  <button
                    key={slot}
                    type="button"
                    disabled={updateTime.isPending}
                    onClick={() => setSelectedTime(slot)}
                    className={cn(
                      'h-10 rounded-xl border text-xs font-black transition-colors',
                      selected
                        ? 'border-primary bg-primary text-white shadow-sm'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-primary/40 hover:bg-primary-2 hover:text-primary',
                    )}
                    aria-pressed={selected}
                  >
                    {toPersianDigits(slot)}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/70 p-5 text-center text-xs font-bold leading-6 text-gray-500">
              ساعت آزاد دیگری برای این روز پیدا نشد.
            </div>
          )}
        </div>

        <div className="flex items-start gap-2 rounded-2xl bg-blue-50 px-3 py-2.5 text-[11px] font-semibold leading-5 text-blue-700">
          <MessageSquareText size={15} className="mt-0.5 shrink-0" />
          بعد از ثبت تغییر، ساعت جدید با پیامک به مشتری اطلاع داده می‌شود.
        </div>

        <DialogFooter className="-mx-5 -mb-5 flex-row p-5">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            disabled={updateTime.isPending}
            onClick={closeAndReset}
          >
            انصراف
          </Button>
          <Button
            type="button"
            className="flex-1"
            loading={updateTime.isPending}
            disabled={!selectedTime || isFetching || isLoading}
            onClick={handleSubmit}
          >
            ثبت ساعت جدید
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
