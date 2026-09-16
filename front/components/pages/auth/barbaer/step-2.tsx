// components/pages/auth/barbaer/step-2.tsx
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { MapPin } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import * as z from 'zod';

import FormProvider from '@/components/form/form-provider';
import RHFInput from '@/components/form/rhf-input';
import RHFSelect from '@/components/form/rhf-select';
import RHFTextArea from '@/components/form/rhf-textarea';
import { Button } from '@/components/ui/button';
import {
  useCityList,
  useProvinceList,
} from '@/services/features/locations/hooks';
import { useBarberSignupStore } from '@/store/useBarberSignupStore';

interface Step2Props {
  onSubmit: (data: any) => void;
}

export default function BarbaerStep2({ onSubmit }: Step2Props) {
  const { shopName, provinceId, cityId, address, prevStep } =
    useBarberSignupStore();

  const schema = z.object({
    shopName: z.string().trim().nonempty('نام آرایشگاه اجباری است'),
    provinceId: z.string().trim().nonempty('انتخاب استان اجباری است'), // قبول کردن null
    cityId: z.string().trim().nonempty('انتخاب شهر اجباری است'),
    address: z.string().trim().nonempty('آدرس اجباری است'),
  });

  const methods = useForm({
    defaultValues: {
      shopName: shopName || '',
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
    <FormProvider
      methods={methods}
      onSubmit={onFormSubmit}
      className="space-y-6 animate-fade-in"
    >
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-3 text-orange-600 border border-orange-100 shadow-sm">
          <MapPin size={28} />
        </div>
        <h2 className="text-lg font-bold text-gray-800">اطلاعات سالن</h2>
        <p className="text-xs text-gray-500 mt-1">موقعیت و مشخصات محل کار</p>
      </div>

      <div className="space-y-4">
        <RHFInput name="shopName" label="نام آرایشگاه (تابلو)" />

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
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-5 bg-white border-t border-gray-100 z-50">
        <div className="max-w-lg mx-auto flex justify-between">
          <Button type="button" variant="outline" onClick={prevStep}>
            مرحله قبل
          </Button>
          <Button type="submit">مرحله بعد</Button>
        </div>
      </div>
    </FormProvider>
  );
}
