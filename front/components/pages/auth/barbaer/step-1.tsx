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
import { useHydrated } from '@/hooks/use-hydrated';
import {
  getNationalCodeError,
  normalizeNationalCode,
  sanitizeNationalCodeInput,
} from '@/lib/national-code';
import { normalizePhone, phoneSchema } from '@/lib/phone';
import { useBarberSignupStore } from '@/store/useBarberSignupStore';

interface Step1Props {
  onSubmit: (data: Record<string, unknown>) => void;
}

export default function BarbaerStep1({ onSubmit }: Step1Props) {
  const { fullName, phone, nationalCode, birthDate } = useBarberSignupStore();
  // تا کامل‌شدن هیدریشن، فرم قفل است (توضیح در `FormProvider`).
  const hydrated = useHydrated();

  const schema = z.object({
    fullName: z.string().trim().nonempty('نام و نام خانوادگی اجباری است.'),
    phone: phoneSchema,
    nationalCode: z
      .string()
      .transform(sanitizeNationalCodeInput)
      .superRefine((val, ctx) => {
        const error = getNationalCodeError(val);
        if (error) ctx.addIssue({ code: 'custom', message: error });
      }),
    birthDate: z.string().optional(),
  });

  type Step1FormValues = z.infer<typeof schema>;

  const methods = useForm<Step1FormValues>({
    defaultValues: {
      fullName: fullName || '',
      phone: phone || '',
      nationalCode: sanitizeNationalCodeInput(nationalCode),
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
    <FormProvider methods={methods} onSubmit={onFormSubmit} lockUntilHydrated>
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
            inputMode="numeric"
            autoComplete="off"
            dir="ltr"
            sanitize={sanitizeNationalCodeInput}
            startIcon={<IdCard className="w-4 h-4" />}
          />
          <PersianDatePicker
            name="birthDate"
            label="تاریخ تولد"
            placeholder="انتخاب تاریخ تولد"
            portal
          />
        </div>

        <StepFooter
          primary={
            <Button
              type="submit"
              loading={methods.formState.isSubmitting}
              disabled={!hydrated}
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
