'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { IdCard, Smartphone, User } from 'lucide-react';
import { useForm } from 'react-hook-form';
import * as z from 'zod';

import FormProvider from '@/components/form/form-provider';
import { PersianDatePicker } from '@/components/form/persian-date-picker';
import RHFInput from '@/components/form/rhf-input';
import RHFPhoneInput from '@/components/form/rhf-phone-input';
import StepFooter from '@/components/pages/auth/barbaer/step-footer';
import { Button } from '@/components/ui/button';
import {
  isValidIranianNationalCode,
  normalizeNationalCode,
} from '@/lib/national-code';
import { normalizePhone, phoneSchema } from '@/lib/phone';
import { useBarberSignupStore } from '@/store/useBarberSignupStore';

interface Step1Props {
  onSubmit: (data: Record<string, unknown>) => void;
}

export default function BarbaerStep1({ onSubmit }: Step1Props) {
  const { fullName, phone, nationalCode, birthDate } = useBarberSignupStore();

  const schema = z.object({
    fullName: z.string().trim().nonempty('نام و نام خانوادگی اجباری است.'),
    phone: phoneSchema,
    nationalCode: z
      .string()
      .trim()
      .nonempty('کد ملی اجباری است.')
      .transform(normalizeNationalCode)
      .refine(val => isValidIranianNationalCode(val), {
        message: 'کد ملی وارد شده معتبر نیست (باید ۱۰ رقم باشد)',
      }),
    birthDate: z.string().optional(),
  });

  type Step1FormValues = z.infer<typeof schema>;

  const methods = useForm<Step1FormValues>({
    defaultValues: {
      fullName: fullName || '',
      phone: phone || '',
      nationalCode: nationalCode || '',
      birthDate: birthDate || '',
    },
    resolver: zodResolver(schema),
  });

  const onFormSubmit = (data: Step1FormValues) => {
    onSubmit({
      fullName: data.fullName,
      phone: normalizePhone(data.phone),
      nationalCode: normalizeNationalCode(data.nationalCode),
      birthDate: data.birthDate || '',
    });
  };

  return (
    <FormProvider methods={methods} onSubmit={onFormSubmit}>
      <div className="space-y-5 animate-fade-in">
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
          <RHFInput
            label="کد ملی"
            name="nationalCode"
            placeholder="مثلاً ۰۰۱۰۳۲۱۲۶۸"
            isRequired
            maxLength={10}
            dir="ltr"
            startIcon={<IdCard className="w-4 h-4" />}
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

