'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

import { LightboxModal } from '@/components/pages/barber/lightboxModal';
import { Step1Profile } from '@/components/pages/barber/step1';
import { Step2BookConfirm } from '@/components/pages/barber/step2';
import { Button } from '@/components/ui/button';
import { useBarber } from '@/services/features/barber/hooks';
import {
  useAvailableSlots,
  useCreateBooking,
} from '@/services/features/booking/hooks';
import { usePayBooking } from '@/services/features/payment/hooks';

export default function BookingWizard() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

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
  } = useBarber(Number(id));

  const barberUserId = barber?.data?.userId?.toString() || '';
  const { data: availableTimes, isLoading: timesLoading } = useAvailableSlots(
    barberUserId,
    selectedDate,
    selectedServiceIds,
  );

  const createBookingMutation = useCreateBooking();
  const payBookingMutation = usePayBooking();

  const toggleService = (sid: string) => {
    setSelectedServiceIds(prev =>
      prev.includes(sid) ? prev.filter(x => x !== sid) : [...prev, sid],
    );
  };

  const handlePayment = async () => {
    if (!selectedDate || !selectedTime || selectedServiceIds.length === 0)
      return;
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
          isSubmitting={
            createBookingMutation.isPending || payBookingMutation.isPending
          }
        />
      )}

      <LightboxModal
        image={selectedImage}
        onClose={() => setSelectedImage(null)}
      />
    </div>
  );
}
