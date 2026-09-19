// components/pages/auth/barbaer/step-4.tsx
'use client';

import { Plus, Scissors, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import FormattedNumberInput from '@/components/form/formatted-number-input';
import StepFooter from '@/components/pages/auth/barbaer/step-footer';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ServiceInput } from '@/store/useBarberSignupStore';
import { useBarberSignupStore } from '@/store/useBarberSignupStore';

const MIN_DEPOSIT = 100_000;

const DEPOSIT_MAX_RATIO = 0.3;

function parseAmount(value: string): number | null {
  const num = Number(String(value ?? '').replace(/,/g, ''));
  return Number.isFinite(num) ? num : null;
}

function getDepositError(service: ServiceInput): string | null {
  const raw = (service.depositPrice ?? '').trim();
  if (!raw) return null;

  const deposit = parseAmount(raw);
  if (deposit === null || deposit <= 0) {
    return 'مبلغ بیعانه را به‌درستی وارد کنید.';
  }
  if (deposit < MIN_DEPOSIT) {
    return 'حداقل مبلغ بیعانه ۱۰۰ هزار تومان است.';
  }

  const price = parseAmount(service.price);
  if (price === null || price <= 0) {
    return 'برای بررسی بیعانه، ابتدا مبلغ کل را وارد کنید.';
  }
  if (deposit > price * DEPOSIT_MAX_RATIO) {
    return 'بیعانه نمی‌تواند بیشتر از ۳۰٪ مبلغ کل باشد.';
  }
  return null;
}

interface Step4Props {
  onSubmit: (data: Record<string, unknown>) => void;
}

export default function BarbaerStep4({ onSubmit }: Step4Props) {
  const { services, prevStep, updateData } = useBarberSignupStore();

  // حذف سرویس
  const removeService = (id: string) => {
    const newServices = services.filter(s => s.id !== id);
    updateData({ services: newServices });
    toast.info('خدمت حذف شد.');
  };

  // ویرایش سرویس
  const updateService = (id: string, field: string, value: string) => {
    const newServices = services.map(s =>
      s.id === id ? { ...s, [field]: value } : s,
    );
    updateData({ services: newServices });
  };

  const depositImpossible = (service: ServiceInput): boolean => {
    const price = parseAmount(service.price);
    return (
      price !== null && price > 0 && price * DEPOSIT_MAX_RATIO < MIN_DEPOSIT
    );
  };

  // افزودن سرویس جدید
  const handleServiceAdd = () => {
    if (services.length >= 10) {
      toast.warning('حداکثر ۱۰ خدمت قابل ثبت است.');
      return;
    }
    const newService = {
      id: Date.now().toString(),
      name: '',
      price: '',
      depositPrice: '',
      duration: '30',
    };
    updateData({ services: [...services, newService] });
  };

  // رفتن به مرحله بعد
  const handleNext = () => {
    // اعتبارسنجی: حداقل یک سرویس با نام و قیمت معتبر
    const invalidServices = services.filter(service => {
      // نام خدمت
      if (!service.name.trim()) return true;

      // مبلغ کل
      if (!service.price.trim()) return true;

      const price = parseAmount(service.price);
      if (price === null || price <= 0) return true;

      // اگر بیعانه وارد شده اعتبارسنجی کن
      if (getDepositError(service)) return true;

      // مدت زمان
      if (
        !Number.isInteger(Number(service.duration)) ||
        Number(service.duration) <= 0
      )
        return true;

      return false;
    });

    if (invalidServices.length > 0) {
      const hasInvalidDeposit = invalidServices.some(
        s => getDepositError(s) !== null,
      );

      if (hasInvalidDeposit) {
        toast.error('مبلغ بیعانه باید بین ۱۰۰ هزار تومان تا ۳۰٪ مبلغ کل باشد.');
      } else {
        toast.error(
          'لطفاً نام، مبلغ کل و مدت زمان همه خدمات را به درستی وارد کنید.',
        );
      }

      return;
    }
    if (services.length === 0) {
      toast.error('حداقل یک خدمت اضافه کنید.');
      return;
    }
    onSubmit({ services });
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center gap-2.5 bg-amber-50/70 border border-amber-200/60 rounded-2xl px-4 py-3">
        <Scissors className="w-4 h-4 text-amber-600 shrink-0" />
        <p className="text-[11px] leading-relaxed text-amber-800 font-medium">
          بیعانه اختیاری است؛ در صورت ثبت، حداقل ۱۰۰ هزار تومان و حداکثر ۳۰٪
          مبلغ کل هر خدمت قابل قبول است.
        </p>
      </div>

      <div className="space-y-4">
        {services.map((service, index) => {
          const depositError = getDepositError(service);
          const impossible = depositImpossible(service);

          return (
            <div
              key={service.id}
              className="bg-gray-50/70 p-4 rounded-2xl border border-gray-200 shadow-sm relative group hover:border-primary-200 transition-colors"
            >
              <button
                onClick={e => {
                  e.stopPropagation();
                  removeService(service.id);
                }}
                className="absolute top-3 left-3 text-gray-400 hover:text-red-500 p-1 hover:bg-red-50 rounded-lg transition-colors z-10 cursor-pointer"
              >
                <Trash2 size={16} />
              </button>
              <h4 className="text-xs font-bold text-gray-500 mb-3 flex items-center gap-2">
                <span className="w-5 h-5 bg-gray-100 rounded-full flex items-center justify-center text-[10px]">
                  {index + 1}
                </span>
                مشخصات خدمت
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <input
                    placeholder="نام خدمت (مثلاً اصلاح مو)"
                    className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 focus:bg-white focus:border-primary-500 outline-none transition-colors"
                    value={service.name}
                    onChange={e =>
                      updateService(service.id, 'name', e.target.value)
                    }
                  />
                </div>
                <div className="space-y-1">
                  <FormattedNumberInput
                    placeholder="مبلغ کل (تومان)"
                    value={service.price}
                    onChange={val => updateService(service.id, 'price', val)}
                    className="rounded-xl px-3 py-2.5 text-sm bg-white border-gray-200"
                  />
                </div>

                <div className="space-y-1">
                  <FormattedNumberInput
                    placeholder="بیعانه (اختیاری)"
                    value={service.depositPrice || ''}
                    onChange={val =>
                      updateService(service.id, 'depositPrice', val)
                    }
                    className={cn(
                      'rounded-xl px-3 py-2.5 text-sm bg-white border-gray-200',
                      depositError && 'border-red-400',
                    )}
                  />
                  {depositError ? (
                    <p className="text-[10px] text-red-500 font-medium">
                      {depositError}
                    </p>
                  ) : impossible ? (
                    <p className="text-[10px] text-gray-400 font-medium leading-relaxed">
                      با این مبلغ کل امکان ثبت بیعانه نیست (بین ۱۰۰ هزار تومان
                      تا ۳۰٪ مبلغ کل).
                    </p>
                  ) : (
                    <p className="text-[10px] text-gray-400 font-medium">
                      بین ۱۰۰ هزار تومان تا ۳۰٪ مبلغ کل
                    </p>
                  )}
                </div>
                <div className="col-span-2">
                  <select
                    className="w-full bg-white border border-gray-200 rounded-xl px-2 py-2.5 text-sm text-gray-900 focus:bg-white focus:border-primary-500 outline-none transition-colors"
                    value={service.duration}
                    onChange={e =>
                      updateService(service.id, 'duration', e.target.value)
                    }
                  >
                    <option value="15">۱۵ دقیقه</option>
                    <option value="30">۳۰ دقیقه</option>
                    <option value="45">۴۵ دقیقه</option>
                    <option value="60">۱ ساعت</option>
                    <option value="90">۱.۵ ساعت</option>
                    <option value="120">۲ ساعت</option>
                  </select>
                </div>
              </div>
            </div>
          );
        })}

        <button
          onClick={handleServiceAdd}
          className="w-full py-3 border-2 border-dashed border-primary-200 text-primary-600 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-primary-3 hover:border-primary-300 transition-all text-sm active:scale-95 cursor-pointer"
        >
          <Plus size={18} />
          افزودن خدمت جدید
        </button>
      </div>

      {/* دکمه‌های پایین */}
      <StepFooter
        onBack={prevStep}
        primary={
          <Button
            type="button"
            onClick={handleNext}
            className="flex-1 h-12 text-base font-bold shadow-md shadow-primary/20 cursor-pointer"
          >
            مرحله بعد
          </Button>
        }
      />
    </div>
  );
}
