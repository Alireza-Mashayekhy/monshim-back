// components/dashboard/appointments/AppointmentCard.tsx
'use client';

import { Check, MessageCircle, Phone, XCircle } from 'lucide-react';

import AppCard from '@/components/shared/app-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  BOOKING_STATUS_BADGE_CLASS,
  BOOKING_STATUS_LABEL,
} from '@/constants/booking';
import { formatPrice } from '@/lib/utils';
import { useUpdateBookingStatus } from '@/services/features/booking/hooks';
import { Booking } from '@/services/features/booking/types';

interface AppointmentCardProps {
  booking: Booking;
}

export default function AppointmentCard({ booking }: AppointmentCardProps) {
  const { id, customer, service, date, time, price, status } = booking;
  const updateStatus = useUpdateBookingStatus();

  const handleCall = () => {
    if (customer?.phone) window.location.href = `tel:${customer.phone}`;
  };

  const handleChat = () => {
    // پیاده‌سازی چت
  };

  return (
    <AppCard>
      <div className="flex justify-between items-start">
        <div>
          <Badge
            className={`rounded-full ${BOOKING_STATUS_BADGE_CLASS[status]}`}
          >
            {BOOKING_STATUS_LABEL[status]}
          </Badge>
          <h3 className="mt-4 text-xl font-bold">
            {customer?.fullName || 'مشتری'}
          </h3>
          <p className="text-slate-500">{service?.name || 'خدمت'}</p>
        </div>
        <div className="text-left">
          <h3 className="text-2xl font-bold">{time}</h3>
          <p className="text-slate-500">{date}</p>
        </div>
      </div>

      <div className="mt-6 flex justify-between items-center">
        <span className="font-bold">{formatPrice(price)}</span>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="icon"
            className="rounded-full"
            onClick={handleCall}
          >
            <Phone size={18} />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            className="rounded-full"
            onClick={handleChat}
          >
            <MessageCircle size={18} />
          </Button>

          {status === 'pending' && (
            <>
              {/* تایید */}
              <Button
                size="icon"
                className="rounded-full"
                onClick={() =>
                  updateStatus.mutate({
                    id,
                    status: 'confirmed',
                  })
                }
                disabled={updateStatus.isPending}
              >
                <Check size={18} />
              </Button>

              {/* رد */}
              <Button
                size="icon"
                variant="destructive"
                className="rounded-full"
                onClick={() =>
                  updateStatus.mutate({
                    id,
                    status: 'rejected',
                  })
                }
                disabled={updateStatus.isPending}
              >
                <XCircle size={18} />
              </Button>
            </>
          )}

          {status === 'confirmed' && (
            <>
              {/* انجام شد */}
              <Button
                size="icon"
                className="rounded-full"
                variant="outline"
                onClick={() =>
                  updateStatus.mutate({
                    id,
                    status: 'completed',
                  })
                }
                disabled={updateStatus.isPending}
              >
                <Check size={18} />
              </Button>

              {/* لغو */}
              <Button
                size="icon"
                className="rounded-full"
                variant="destructive"
                onClick={() =>
                  updateStatus.mutate({
                    id,
                    status: 'canceled',
                  })
                }
                disabled={updateStatus.isPending}
              >
                <XCircle size={18} />
              </Button>
            </>
          )}
        </div>
      </div>
    </AppCard>
  );
}
