// app/(auth)/barber-signup/page.tsx (یا مسیر مناسب)
'use client';

import { ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

import BarbaerStep1 from '@/components/pages/auth/barbaer/step-1';
import BarbaerStep2 from '@/components/pages/auth/barbaer/step-2';
import BarbaerStep3 from '@/components/pages/auth/barbaer/step-3';
import BarbaerStep4 from '@/components/pages/auth/barbaer/step-4';
import BarbaerStep5 from '@/components/pages/auth/barbaer/step-5';
import { useBarberSignupStore } from '@/store/useBarberSignupStore';

export default function BarberSignup() {
  const router = useRouter();
  const { step, updateData, nextStep, prevStep } = useBarberSignupStore();

  const handleStepSubmit = (data: Partial<any>) => {
    updateData(data);
    nextStep();
  };

  const handleBack = () => {
    if (step === 1) {
      router.push('/login');
    } else {
      prevStep();
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans">
      <div className="p-5 border-b sticky top-0 bg-white z-10 flex items-center justify-between shadow-sm">
        <button
          onClick={handleBack}
          className="p-2 -mr-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ArrowRight />
        </button>
        <h1 className="font-bold text-gray-800">ثبت نام آرایشگر</h1>
        <div className="w-8"></div>
      </div>

      <div className="w-full bg-gray-100 h-1.5 dir-ltr">
        <div
          className="bg-primary-600 h-full transition-all duration-300"
          style={{ width: `${(step / 5) * 100}%` }}
        ></div>
      </div>

      <div className="flex-1 p-5 pb-24 max-w-lg mx-auto w-full">
        {step === 1 && <BarbaerStep1 onSubmit={handleStepSubmit} />}
        {step === 2 && <BarbaerStep2 onSubmit={handleStepSubmit} />}
        {step === 3 && <BarbaerStep3 onSubmit={handleStepSubmit} />}
        {step === 4 && <BarbaerStep4 onSubmit={handleStepSubmit} />}
        {step === 5 && <BarbaerStep5 />}
      </div>
    </div>
  );
}
