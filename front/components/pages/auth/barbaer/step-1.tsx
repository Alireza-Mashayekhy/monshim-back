// components/pages/auth/barbaer/step-1.tsx
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Smartphone, User } from 'lucide-react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import * as z from 'zod';

import FormProvider from '@/components/form/form-provider';
import { PersianDatePicker } from '@/components/form/persian-date-picker';
import { RHFImageUploader } from '@/components/form/rhf-image-uploader';
import RHFInput from '@/components/form/rhf-input';
import RHFPhoneInput from '@/components/form/rhf-phone-input';
import StepFooter from '@/components/pages/auth/barbaer/step-footer';
import { Button } from '@/components/ui/button';
import { getImageUploadError, IMAGE_SIZE_ERROR } from '@/lib/image-upload';
import { normalizePhone, phoneSchema } from '@/lib/phone';
import { useBarberSignupStore } from '@/store/useBarberSignupStore';

interface Step1Props {
  onSubmit: (data: Record<string, unknown>) => void;
}

export default function BarbaerStep1({ onSubmit }: Step1Props) {
  const {
    fullName,
    phone,
    image: storedImage,
    birthDate,
  } = useBarberSignupStore();

  const schema = z.object({
    fullName: z.string().trim().nonempty('نام و نام خانوادگی اجباری است.'),
    phone: phoneSchema,
    birthDate: z.string().optional(),
    image: z
      .instanceof(File, { message: 'عکس پروفایل اجباری است' })
      .superRefine((file, ctx) => {
        const message = getImageUploadError(file);
        if (message) ctx.addIssue({ code: 'custom', message });
      })
      .optional() // اختیاری می‌کنیم تا اگر از قبل تصویر وجود دارد، مجبور به آپلود مجدد نباشد
      .or(z.string().nullable()), // اجازه می‌دهیم که base64 هم قبول شود (برای حالت preview)
  });

  const methods = useForm({
    defaultValues: {
      fullName: fullName || '',
      phone: phone || '',
      image: storedImage || undefined,
      birthDate: birthDate || '',
    },
    resolver: zodResolver(schema),
  });

  const {
    setValue,
    formState: { errors },
  } = methods;

  // اگر بخواهیم وقتی استور تغییر کرد، فرم هم به‌روز شود (اختیاری)
  useEffect(() => {
    if (storedImage) {
      setValue('image', storedImage);
    }
  }, [storedImage, setValue]);

  const onFormSubmit = async (data: any) => {
    try {
      let imageBase64 = typeof data.image === 'string' ? data.image : null;
      if (data.image instanceof File) {
        imageBase64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            if (typeof reader.result === 'string') resolve(reader.result);
            else reject(new Error('Failed to read image'));
          };
          reader.onerror = () => reject(reader.error);
          reader.onabort = () => reject(new Error('Image read aborted'));
          reader.readAsDataURL(data.image);
        });
      }
      onSubmit({
        fullName: data.fullName,
        phone: normalizePhone(data.phone),
        image: imageBase64,
        birthDate: data.birthDate || '',
      });
    } catch {
      toast.error(
        'خواندن یا ذخیره اطلاعات انجام نشد. فضای مرورگر و فایل عکس را بررسی کنید.',
      );
    }
  };

  return (
    <FormProvider methods={methods} onSubmit={onFormSubmit}>
      <div className="space-y-5 animate-fade-in">
        <div className="flex flex-col items-center">
          <RHFImageUploader
            name="image"
            setValue={setValue}
            error={errors.image}
            aspectRatio={1}
            defaultValue={storedImage || undefined}
          />
          <p className="text-[11px] text-gray-400 font-medium mt-2">
            {IMAGE_SIZE_ERROR} فرمت: JPEG، PNG، GIF و WebP
          </p>
        </div>

        <div className="space-y-4">
          <RHFInput
            label="نام و نام خانوادگی"
            name="fullName"
            isRequired
            startIcon={<User className="w-4 h-4" />}
          />
          <RHFPhoneInput
            label="شماره موبایل"
            name="phone"
            isRequired
            startIcon={<Smartphone className="w-4 h-4" />}
          />
          <PersianDatePicker
            name="birthDate"
            label="تاریخ تولد"
            placeholder="انتخاب تاریخ تولد"
          />
        </div>

        <StepFooter
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
