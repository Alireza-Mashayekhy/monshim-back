'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, IdCard, Lock, Smartphone, User } from 'lucide-react';
import { useState } from 'react';
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
  const { fullName, phone, nationalCode, birthDate, password } =
    useBarberSignupStore();
  // تا کامل‌شدن هیدریشن، فرم قفل است (توضیح در `FormProvider`).
  const hydrated = useHydrated();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const schema = z
    .object({
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
      password: z.string().min(6, 'رمز عبور باید حداقل ۶ کاراکتر باشد.'),
      confirmPassword: z.string().min(1, 'تکرار رمز عبور اجباری است.'),
    })
    .refine(data => data.password === data.confirmPassword, {
      message: 'تکرار رمز عبور با رمز عبور مطابقت ندارد.',
      path: ['confirmPassword'],
    });

  type Step1FormValues = z.infer<typeof schema>;

  const methods = useForm<Step1FormValues>({
    defaultValues: {
      fullName: fullName || '',
      phone: phone || '',
      nationalCode: sanitizeNationalCodeInput(nationalCode),
      birthDate: birthDate || '',
      password: password || '',
      confirmPassword: password || '',
    },
    resolver: zodResolver(schema),
  });

  const onFormSubmit = (data: Step1FormValues) => {
    onSubmit({
      fullName: data.fullName,
      phone: normalizePhone(data.phone),
      nationalCode: normalizeNationalCode(data.nationalCode),
      birthDate: data.birthDate || '',
      password: data.password,
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
          <RHFInput
            name="password"
            type={showPassword ? 'text' : 'password'}
            label="رمز عبور"
            placeholder="حداقل ۶ کاراکتر"
            isRequired
            dir="ltr"
            className="text-left font-mono"
            autoComplete="new-password"
            startIcon={<Lock className="w-4 h-4" />}
            endIcon={
              <button
                type="button"
                onClick={() => setShowPassword(p => !p)}
                className="p-1 text-gray-400 hover:text-gray-600 cursor-pointer transition-colors"
                aria-label={showPassword ? 'مخفی کردن' : 'نمایش'}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            }
          />
          <RHFInput
            name="confirmPassword"
            type={showConfirmPassword ? 'text' : 'password'}
            label="تکرار رمز عبور"
            placeholder="تکرار رمز عبور"
            isRequired
            dir="ltr"
            className="text-left font-mono"
            autoComplete="new-password"
            startIcon={<Lock className="w-4 h-4" />}
            endIcon={
              <button
                type="button"
                onClick={() => setShowConfirmPassword(p => !p)}
                className="p-1 text-gray-400 hover:text-gray-600 cursor-pointer transition-colors"
                aria-label={showConfirmPassword ? 'مخفی کردن' : 'نمایش'}
              >
                {showConfirmPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            }
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
