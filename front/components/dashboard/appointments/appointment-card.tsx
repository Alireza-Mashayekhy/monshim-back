// components/dashboard/appointments/AppointmentCard.tsx
'use client';

import {
  BellRing,
  Check,
  CheckCheck,
  Link2,
  NotebookPen,
  Phone,
  StickyNote,
  XCircle,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  BOOKING_STATUS_BADGE_CLASS,
  BOOKING_STATUS_LABEL,
} from '@/constants/booking';
import { toISODate } from '@/lib/jalali';
import { cn, formatPrice, toPersianDigits } from '@/lib/utils';
import { useUpdateBookingStatus } from '@/services/features/booking/hooks';
import { Booking } from '@/services/features/booking/types';

interface AppointmentCardProps {
  booking: Booking;
}

export default function AppointmentCard({ booking }: AppointmentCardProps) {
  const { customer, service, time, status, price } = booking;
  const updateStatus = useUpdateBookingStatus();

  const handleCall = () => {
    if (customer?.phone) window.location.href = `tel:${customer.phone}`;
  };

  const handleStatus = (next: Booking['status']) => {
    if (updateStatus.isPending) return;

    updateStatus.mutate({ id: booking.id, status: next });
  };

  const isToday = booking.date === toISODate(new Date());
  const isPending = status === 'pending';
  const isConfirmed = status === 'confirmed';
  const isDone =
    status === 'completed' || status === 'canceled' || status === 'rejected';

  return (
    <div
      className={cn(
        'flex gap-3.5 rounded-3xl border bg-white p-4 shadow-[0_4px_20px_rgba(15,23,42,0.04)] transition-all sm:gap-4',
        isPending
          ? 'border-amber-200 bg-amber-50/40'
          : 'border-gray-100 hover:border-primary/25',
      )}
    >
      {/* ستون ساعت */}
      <div className="flex w-14 shrink-0 flex-col items-center gap-1 sm:w-16">
        <div
          className={cn(
            'flex w-full flex-col items-center rounded-2xl py-2.5',
            isToday && status !== 'canceled' && status !== 'rejected'
              ? 'bg-primary text-white'
              : 'bg-gray-50 text-gray-700',
          )}
        >
          <span className="text-base font-black leading-none tracking-tight sm:text-lg">
            {toPersianDigits(time.slice(0, 5))}
          </span>

          {service?.durationMinutes ? (
            <span
              className={cn(
                'mt-1 text-[9px] font-bold',
                isToday && status !== 'canceled' && status !== 'rejected'
                  ? 'text-white/70'
                  : 'text-gray-400',
              )}
            >
              {toPersianDigits(service.durationMinutes)}′
            </span>
          ) : null}
        </div>

        {isPending && (
          <span className="mt-0.5 h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <h3 className="text-sm font-black text-gray-900">
                {customer?.fullName || 'مشتری'}
              </h3>

              <Badge
                className={cn(
                  'h-5 rounded-md border px-1.5 text-[10px] font-bold',
                  BOOKING_STATUS_BADGE_CLASS[status],
                )}
              >
                {BOOKING_STATUS_LABEL[status]}
              </Badge>
            </div>

            <p className="mt-1 text-[11px] font-medium text-gray-400" dir="ltr">
              {customer?.phone
                ? toPersianDigits(customer.phone)
                : 'بدون شماره تماس'}
            </p>
          </div>

          <div className="text-left">
            <p className="text-xs font-black text-gray-900">
              {toPersianDigits(formatPrice(price))}
              <span className="ms-1 text-[10px] font-bold text-gray-400">
                تومان
              </span>
            </p>
          </div>
        </div>

        {/* خدمت */}
        <div className="mt-2.5 inline-flex max-w-full items-center gap-1.5 rounded-lg bg-gray-50 px-2.5 py-1.5">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />

          <span className="truncate text-[11px] font-bold text-gray-600">
            {service?.name || 'خدمت'}
          </span>
        </div>
        {(booking.barberNote || booking.customerNote) && (
          <div className="mt-2.5 space-y-1.5">
            {booking.barberNote && (
              <p className="flex items-start gap-1.5 text-[11px] leading-5 text-gray-500">
                <NotebookPen
                  size={12}
                  className="mt-1 shrink-0 text-gray-400"
                />
                <span className="min-w-0">
                  <span className="font-black text-gray-400">یادداشت من: </span>
                  {booking.barberNote}
                </span>
              </p>
            )}

            {booking.customerNote && (
              <p className="flex items-start gap-1.5 text-[11px] leading-5 text-gray-500">
                <StickyNote size={12} className="mt-1 shrink-0 text-gray-400" />
                <span className="min-w-0">
                  <span className="font-black text-gray-400">
                    یادداشت مشتری:{' '}
                  </span>
                  {booking.customerNote}
                </span>
              </p>
            )}
          </div>
        )}

        {/* نشان یادآوری / بیعانه */}
        {(booking.sendSmsReminder || booking.sendDepositLink) && (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {booking.sendSmsReminder && booking.reminderHours ? (
              <span className="inline-flex items-center gap-1 rounded-md bg-primary-2 px-2 py-1 text-[10px] font-black text-primary">
                <BellRing size={11} />
                یادآوری {toPersianDigits(booking.reminderHours)} ساعت قبل
              </span>
            ) : null}

            {booking.sendDepositLink ? (
              <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-1 text-[10px] font-black text-blue-600">
                <Link2 size={11} />
                لینک بیعانه
              </span>
            ) : null}
          </div>
        )}

        {/* عملیات */}
        {!isDone && (
          <div className="mt-3.5 flex items-center justify-between gap-2 border-t border-gray-50 pt-3">
            <Button
              variant="outline"
              size="sm"
              className="h-8 rounded-lg text-[11px] font-bold"
              onClick={handleCall}
              disabled={!customer?.phone}
            >
              <Phone size={13} className="ml-1" />
              تماس
            </Button>

            <div className="flex gap-1.5">
              {isPending && (
                <>
                  <Button
                    size="sm"
                    className="h-8 rounded-lg text-[11px] font-black"
                    onClick={() => handleStatus('confirmed')}
                    disabled={updateStatus.isPending}
                  >
                    <Check size={13} className="ml-1" />
                    تایید
                  </Button>

                  <Button
                    size="sm"
                    variant="destructive"
                    className="h-8 rounded-lg text-[11px] font-black"
                    onClick={() => handleStatus('rejected')}
                    disabled={updateStatus.isPending}
                  >
                    <XCircle size={13} className="ml-1" />
                    رد
                  </Button>
                </>
              )}

              {isConfirmed && (
                <>
                  <Button
                    size="sm"
                    className="h-8 rounded-lg text-[11px] font-black"
                    onClick={() => handleStatus('completed')}
                    disabled={updateStatus.isPending}
                  >
                    <CheckCheck size={13} className="ml-1" />
                    انجام شد
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 rounded-lg text-[11px] font-bold text-red-500 hover:bg-red-50 hover:text-red-600"
                    onClick={() => handleStatus('canceled')}
                    disabled={updateStatus.isPending}
                  >
                    <XCircle size={13} className="ml-1" />
                    لغو
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
