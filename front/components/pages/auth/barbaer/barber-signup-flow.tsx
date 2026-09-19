'use client';

import {
  Image as ImageIcon,
  Scissors,
  Store,
  User,
  UserCheck,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

import BarberSignupLayout from '@/components/pages/auth/barbaer/barber-signup-layout';
import BarbaerStep1 from '@/components/pages/auth/barbaer/step-1';
import BarbaerStep2 from '@/components/pages/auth/barbaer/step-2';
import BarbaerStep3 from '@/components/pages/auth/barbaer/step-3';
import BarbaerStep4 from '@/components/pages/auth/barbaer/step-4';
import BarbaerStep5 from '@/components/pages/auth/barbaer/step-5';
import { useBarberSignupStore } from '@/store/useBarberSignupStore';

const STEP_META = [
  {
    title: 'اطلاعات فردی',
    subtitle: 'مشخصات مدیر سالن یا آرایشگر',
    icon: <User className="w-7 h-7" />,
  },
  {
    title: 'اطلاعات سالن',
    subtitle: 'نوع فعالیت، موقعیت و مشخصات محل کار',
    icon: <Store className="w-7 h-7" />,
  },
  {
    title: 'نمونه کارها',
    subtitle:
      'تصاویری از محیط کار یا نمونه کارهای خود اضافه کنید (حداکثر ۵ تصویر، هر تصویر حداکثر ۳ مگابایت)',
    icon: <ImageIcon className="w-7 h-7" />,
  },
  {
    title: 'خدمات و قیمت‌ها',
    subtitle:
      'حداقل یک خدمت اضافه کنید (حداکثر ۱۰ خدمت) — بیعانه بین ۱۰۰ هزار تومان تا ۳۰٪ مبلغ کل',
    icon: <Scissors className="w-7 h-7" />,
  },
  {
    title: 'تایید و ثبت نهایی',
    subtitle:
      'لطفاً اطلاعات زیر را بررسی کنید و در صورت صحت، ثبت‌نام را نهایی کنید.',
    icon: <UserCheck className="w-7 h-7" />,
  },
] as const;

export default function BarberSignupFlow() {
  const router = useRouter();
  const { step, updateData, nextStep, prevStep } = useBarberSignupStore();

  const meta = STEP_META[Math.min(step, STEP_META.length) - 1] ?? STEP_META[0];

  const handleStepSubmit = (data: Record<string, unknown>) => {
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
    <BarberSignupLayout
      step={step}
      title={meta.title}
      subtitle={meta.subtitle}
      icon={meta.icon}
      onBack={handleBack}
    >
      {step === 1 && <BarbaerStep1 onSubmit={handleStepSubmit} />}
      {step === 2 && <BarbaerStep2 onSubmit={handleStepSubmit} />}
      {step === 3 && <BarbaerStep3 onSubmit={handleStepSubmit} />}
      {step === 4 && <BarbaerStep4 onSubmit={handleStepSubmit} />}
      {step === 5 && <BarbaerStep5 />}
    </BarberSignupLayout>
  );
}
