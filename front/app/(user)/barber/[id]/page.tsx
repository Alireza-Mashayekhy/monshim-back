'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

import { LightboxModal } from '@/components/pages/barber/lightboxModal';
import { ShareModal } from '@/components/pages/barber/shareModal';
import { Step1Profile } from '@/components/pages/barber/step1';
import { Step2Services } from '@/components/pages/barber/step2';
import { Step3DateTime } from '@/components/pages/barber/step3';
import { Step4Payment } from '@/components/pages/barber/step4';
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
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(
    null,
  );
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'ONLINE' | 'WALLET'>(
    'ONLINE',
  );
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareLink, setShareLink] = useState('');

  // Queries & Mutations
  const {
    data: barber,
    isLoading: barberLoading,
    error: barberError,
  } = useBarber(Number(id));

  const { data: availableTimes, isLoading: timesLoading } = useAvailableSlots(
    barber?.data?.userId?.toString() || '',
    selectedDate,
    selectedServiceId, // ← اضافه شد
  );

  const createBookingMutation = useCreateBooking();
  const payBookingMutation = usePayBooking();

  // Handlers
  const handleConfirmService = () => {
    if (!selectedServiceId) return;
    setStep(3);
  };

  const handleConfirmDateTime = () => {
    if (selectedDate && selectedTime) {
      setStep(4);
    }
  };

  const handlePayment = async () => {
    if (!selectedServiceId || !selectedDate || !selectedTime) return;
    const service = barber?.data?.services?.find(
      s => s.id === selectedServiceId,
    );
    if (!service) return;

    if (paymentMethod === 'ONLINE') {
      try {
        await payBookingMutation.mutateAsync({
          barberId: Number(id),
          serviceId: selectedServiceId,
          date: selectedDate,
          time: selectedTime,
          note: '',
        });
      } catch (error: any) {
        toast.error(
          error.response?.data?.message || 'خطا در اتصال به درگاه پرداخت زیبال',
        );
      }
      return;
    }

    try {
      await createBookingMutation.mutateAsync({
        barberId: Number(id),
        serviceId: selectedServiceId,
        date: selectedDate,
        time: selectedTime,
        note: '',
      });
      toast.success('رزرو با موفقیت انجام شد!');
      router.push('/appointments');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'خطا در ثبت رزرو');
    }
  };

  // Loading & Error
  if (barberLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">در حال بارگذاری...</div>
      </div>
    );
  }
  if (barberError || !barber) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
        <h2 className="text-xl font-bold text-gray-800">آرایشگر یافت نشد</h2>
        <button
          onClick={() => router.push('/')}
          className="mt-4 bg-primary-600 text-white px-6 py-2 rounded-xl"
        >
          بازگشت به خانه
        </button>
      </div>
    );
  }

  const selectedService = barber.data?.services?.find(
    s => s.id === selectedServiceId,
  );

  return (
    <div className="min-h-screen bg-gray-50 font-sans" dir="rtl">
      {step === 1 && (
        <Step1Profile
          barber={barber?.data}
          onStartBooking={() => setStep(2)}
          onShare={() => {
            setShareLink(window.location.href);
            setShowShareModal(true);
          }}
          onImageClick={setSelectedImage}
          onBack={() => router.back()}
        />
      )}
      {step === 2 && (
        <Step2Services
          services={barber.data?.services || []}
          selectedServiceId={selectedServiceId}
          onSelectService={setSelectedServiceId}
          onConfirm={handleConfirmService}
          onBack={() => setStep(1)}
        />
      )}
      {step === 3 && (
        <Step3DateTime
          selectedDate={selectedDate}
          selectedTime={selectedTime}
          availableTimes={availableTimes?.data?.slots || []} // ← آرایه
          timesLoading={timesLoading}
          onSelectDate={setSelectedDate}
          onSelectTime={setSelectedTime}
          onConfirm={handleConfirmDateTime}
          onBack={() => setStep(2)}
          serviceName={selectedService?.name || ''}
        />
      )}
      {step === 4 && selectedService && (
        <Step4Payment
          barber={barber?.data}
          service={selectedService}
          selectedDate={selectedDate!}
          selectedTime={selectedTime!}
          paymentMethod={paymentMethod}
          onPaymentMethodChange={setPaymentMethod}
          onPay={handlePayment}
          onBack={() => setStep(3)}
          isSubmitting={
            createBookingMutation.isPending || payBookingMutation.isPending
          }
        />
      )}

      <LightboxModal
        image={selectedImage}
        onClose={() => setSelectedImage(null)}
      />
      <ShareModal
        open={showShareModal}
        onClose={() => setShowShareModal(false)}
        link={shareLink}
        shopName={barber.data?.shopName}
      />
    </div>
  );
}
