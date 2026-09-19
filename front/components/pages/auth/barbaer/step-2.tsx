// components/pages/auth/barbaer/step-2.tsx
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { MapPin, Mars, Venus, VenusAndMars } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import * as z from 'zod';

import FormProvider from '@/components/form/form-provider';
import RHFInput from '@/components/form/rhf-input';
import RHFSelect from '@/components/form/rhf-select';
import RHFTextArea from '@/components/form/rhf-textarea';
import StepFooter from '@/components/pages/auth/barbaer/step-footer';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  useCityList,
  useProvinceList,
} from '@/services/features/locations/hooks';
import { useBarberSignupStore } from '@/store/useBarberSignupStore';

export const ACTIVITY_TYPES = [
  { value: 'women', label: 'بانوان', icon: Venus },
  { value: 'men', label: 'آقایان', icon: Mars },
  { value: 'both', label: 'هردو', icon: VenusAndMars },
] as const;

export type ActivityType = (typeof ACTIVITY_TYPES)[number]['value'];

export function getActivityTypeLabel(value: string): string {
  return ACTIVITY_TYPES.find(t => t.value === value)?.label ?? '—';
}

interface Step2Props {
  onSubmit: (data: Record<string, unknown>) => void;
}

export default function BarbaerStep2({ onSubmit }: Step2Props) {
  const { shopName, activityType, provinceId, cityId, address, prevStep } =
    useBarberSignupStore();

  const schema = z.object({
    shopName: z.string().trim().nonempty('نام آرایشگاه اجباری است'),
    activityType: z.enum(['women', 'men', 'both'], {
      message: 'لطفاً نوع فعالیت سالن را انتخاب کنید.',
    }),
    provinceId: z.string().trim().nonempty('انتخاب استان اجباری است'), // قبول کردن null
    cityId: z.string().trim().nonempty('انتخاب شهر اجباری است'),
    address: z.string().trim().nonempty('آدرس اجباری است'),
  });

  type Step2FormValues = z.infer<typeof schema>;

  // مقدار ذخیره‌شده در استور فقط می‌تواند یکی از گزینه‌های مجاز باشد
  const initialActivityType = ACTIVITY_TYPES.some(t => t.value === activityType)
    ? (activityType as Step2FormValues['activityType'])
    : undefined;

  const methods = useForm<Step2FormValues>({
    defaultValues: {
      shopName: shopName || '',
      activityType: initialActivityType,
      provinceId: provinceId || '',
      cityId: cityId || '',
      address: address || '',
    },
    resolver: zodResolver(schema),
  });

  const selectedProvinceId = useWatch({
    control: methods.control,
    name: 'provinceId',
  });

  // دریافت لیست استان‌ها
  const { data: provinces } = useProvinceList();
  // دریافت لیست شهرها بر اساس استان انتخاب‌شده
  const { data: cities } = useCityList(parseInt(selectedProvinceId));

  const previousProvince = useRef(selectedProvinceId);
  useEffect(() => {
    if (previousProvince.current !== selectedProvinceId) {
      methods.setValue('cityId', '', { shouldValidate: true });
      previousProvince.current = selectedProvinceId;
    }
  }, [selectedProvinceId, methods]);

  const onFormSubmit = (data: any) => {
    const province = provinces?.data?.find(
      (p: any) => String(p.id) === String(data.provinceId),
    );
    const city = cities?.data?.find(
      (c: any) => String(c.id) === String(data.cityId),
    );

    if (!province || !city) {
      toast.error(
        'استان و شهر معتبر انتخاب کنید؛ اگر فهرست بارگذاری نشده، دوباره تلاش کنید.',
      );
      return;
    }

    onSubmit({
      shopName: data.shopName,
      activityType: data.activityType,
      provinceId: data.provinceId,
      provinceName: province?.name || '',
      cityId: data.cityId,
      cityName: city?.name || '',
      address: data.address,
    });
  };

  // تبدیل لیست استان‌ها به فرمت مورد نیاز RHFSelect
  const provinceOptions = provinces?.data?.map((p: any) => ({
    value: p.id.toString(),
    text: p.name,
  }));

  // تبدیل لیست شهرها به فرمت مورد نیاز RHFSelect
  const cityOptions = cities?.data?.map((c: any) => ({
    value: c.id.toString(),
    text: c.name,
  }));

  return (
    <FormProvider methods={methods} onSubmit={onFormSubmit}>
      <div className="space-y-5 animate-fade-in">
        <RHFInput
          name="shopName"
          label="نام آرایشگاه (تابلو)"
          isRequired
          startIcon={<MapPin className="w-4 h-4" />}
        />

        <div className="space-y-2">
          <label className="block text-sm font-semibold text-gray-700">
            نوع فعالیت <span className="text-red-500">*</span>
          </label>
          <Controller
            name="activityType"
            control={methods.control}
            render={({ field, fieldState }) => (
              <div className="space-y-1.5">
                <div className="grid grid-cols-3 gap-2.5">
                  {ACTIVITY_TYPES.map(type => {
                    const Icon = type.icon;
                    const selected = field.value === type.value;
                    return (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => field.onChange(type.value)}
                        className={cn(
                          'flex flex-col items-center justify-center gap-1.5 py-3 rounded-2xl border-2 transition-all cursor-pointer text-xs font-bold',
                          selected
                            ? 'border-primary bg-primary/5 text-primary shadow-xs'
                            : 'border-gray-200 hover:border-gray-300 text-gray-600 bg-gray-50/50',
                        )}
                      >
                        <Icon className="w-5 h-5" />
                        <span>{type.label}</span>
                      </button>
                    );
                  })}
                </div>
                {fieldState.error && (
                  <p className="text-xs text-red-500">
                    {fieldState.error.message}
                  </p>
                )}
              </div>
            )}
          />
        </div>

        <RHFSelect
          name="provinceId"
          label="استان"
          items={provinceOptions}
          placeholder="انتخاب استان..."
        />

        <RHFSelect
          name="cityId"
          label="شهر"
          items={cityOptions}
          placeholder={
            selectedProvinceId ? 'انتخاب شهر...' : 'ابتدا استان را انتخاب کنید'
          }
          disabled={!selectedProvinceId}
        />

        <RHFTextArea
          name="address"
          label="آدرس دقیق"
          placeholder="خیابان، کوچه، پلاک..."
        />
        <StepFooter
          onBack={prevStep}
          primary={
            <Button
              type="submit"
              loading={methods.formState.isSubmitting}
              className="flex-1 h-12 text-base font-bold shadow-md shadow-primary/20 cursor-pointer"
            >
              مرحله بعد
            </Button>
          }
        />
      </div>
    </FormProvider>
  );
}
