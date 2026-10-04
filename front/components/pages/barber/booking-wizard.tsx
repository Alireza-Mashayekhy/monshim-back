'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

import { LightboxModal } from '@/components/pages/barber/lightboxModal';
import { Step1Profile } from '@/components/pages/barber/step1';
import { Step2BookConfirm } from '@/components/pages/barber/step2';
import { Button } from '@/components/ui/button';
import { buildAuthHref } from '@/lib/auth';
import type { ApiListResponse } from '@/services/api/types';
import { useCurrentUser } from '@/services/features/auth/hooks';
import { useBarber } from '@/services/features/barber/hooks';
import type { Barber, BarberReview } from '@/services/features/barber/types';
import { useAvailableSlots } from '@/services/features/booking/hooks';
import { usePayBooking } from '@/services/features/payment/hooks';

export default function BookingWizard({
  initialBarber,
  initialReviews,
}: {
  initialBarber: Barber;
  initialReviews?: ApiListResponse<BarberReview> | null;
}) {
  const id = String(initialBarber.id);
  const router = useRouter();
  const { user } = useCurrentUser();

  // State
  const [step, setStep] = useState(1);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Queries & Mutations
  const {
    data: barber,
    isLoading: barberLoading,
    error: barberError,
  } = useBarber(Number(id), initialBarber);

  const barberUserId =
    (barber?.data?.userId ?? barber?.data?.id)?.toString() || '';
  const { data: availableTimes, isLoading: timesLoading } = useAvailableSlots(
    barberUserId,
    selectedDate,
    selectedServiceIds,
  );

  const payBookingMutation = usePayBooking();

  const toggleService = (sid: string) => {
    setSelectedServiceIds(prev =>
      prev.includes(sid) ? prev.filter(x => x !== sid) : [...prev, sid],
    );
  };

  const handlePayment = async () => {
    if (!selectedDate || !selectedTime || selectedServiceIds.length === 0)
      return;
    if (!user) {
      toast.info('برای نهایی‌کردن رزرو ابتدا وارد حساب کاربری شوید.');
      router.push(buildAuthHref('/login', `/barber/${id}`));
      return;
    }
    try {
      await payBookingMutation.mutateAsync({
        barberId: Number(id),
        serviceIds: selectedServiceIds,
        date: selectedDate,
        time: selectedTime,
        note: '',
      });
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || 'خطا در اتصال به درگاه پرداخت',
      );
    }
  };

  // Loading & Error
  if (barberLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">در حال بارگذاری...</div>
      </div>
    );
  }
  if (barberError || !barber) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <h2 className="text-xl font-bold text-gray-800">آرایشگر یافت نشد</h2>
        <Button onClick={() => router.push('/')}>بازگشت به خانه</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {step === 1 && (
        <Step1Profile
          barber={barber.data}
          selectedServiceIds={selectedServiceIds}
          onToggleService={toggleService}
          onContinue={() => setStep(2)}
          onImageClick={setSelectedImage}
          initialReviews={initialReviews}
        />
      )}
      {step === 2 && (
        <Step2BookConfirm
          barber={barber.data}
          selectedServiceIds={selectedServiceIds}
          availableTimes={availableTimes?.data?.slots || []}
          timesLoading={timesLoading}
          selectedDateISO={selectedDate}
          selectedTime={selectedTime}
          onSelectDateISO={d => {
            setSelectedDate(d);
            setSelectedTime(null);
          }}
          onSelectTime={setSelectedTime}
          onConfirm={handlePayment}
          onBack={() => setStep(1)}
          isSubmitting={payBookingMutation.isPending}
        />
      )}

      <LightboxModal
        image={selectedImage}
        onClose={() => setSelectedImage(null)}
      />
    </div>
  );
}
