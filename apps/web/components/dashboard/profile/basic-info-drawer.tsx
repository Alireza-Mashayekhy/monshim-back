'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import * as z from 'zod';

import FormProvider from '@/components/form/form-provider';
import { PersianDatePicker } from '@/components/form/persian-date-picker';
import RHFInput from '@/components/form/rhf-input';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { isoToJalali, jalaliToIso } from '@/lib/date-utils';
import {
  getNationalCodeError,
  normalizeNationalCode,
  sanitizeNationalCodeInput,
} from '@/lib/national-code';
import { useUpdateBarberProfile } from '@/services/features/barber/hooks';
import { useMyBarberProfile } from '@/services/features/barber/hooks';

const schema = z.object({
  fullName: z.string().min(1, 'نام و نام خانوادگی الزامی است'),
  nationalCode: z
    .string()
    .optional()
    .nullable()
    .transform(val => sanitizeNationalCodeInput(val))
    .superRefine((val, ctx) => {
      // خالی گذاشتن کد ملی در این فرم مجاز است
      if (!val) return;
      const error = getNationalCodeError(val);
      if (error) ctx.addIssue({ code: 'custom', message: error });
    }),
  birthDate: z.string().optional().nullable(),
});

type FormInput = z.input<typeof schema>;
type FormOutput = z.output<typeof schema>;

interface BasicInfoDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BasicInfoDrawer({ open, onOpenChange }: BasicInfoDrawerProps) {
  const [contentEl, setContentEl] = useState<HTMLDivElement | null>(null);
  const { data: profile } = useMyBarberProfile();
  const updateMutation = useUpdateBarberProfile();

  const methods = useForm<FormInput, any, FormOutput>({
    resolver: zodResolver(schema),
    defaultValues: {
      fullName: '',
      nationalCode: '',
      birthDate: null,
    },
  });

  const { reset, handleSubmit } = methods;

  useEffect(() => {
    if (profile?.data) {
      reset({
        fullName: profile.data.fullName || '',
        nationalCode: sanitizeNationalCodeInput(profile.data.nationalCode),
        birthDate: isoToJalali(profile.data.birthDate) || null,
      });
    }
  }, [profile?.data, reset, open]);

  const onSubmit = (data: FormOutput) => {
    const payload = {
      fullName: data.fullName,
      nationalCode: data.nationalCode
        ? normalizeNationalCode(data.nationalCode)
        : null,
      birthDate: jalaliToIso(data.birthDate),
    };
    updateMutation.mutate(payload, {
      onSuccess: () => onOpenChange(false),
    });
  };

  const handleClose = () => {
    reset();
    onOpenChange(false);
  };

  const isLoading = updateMutation.isPending;

  return (
    <Drawer open={open} onOpenChange={handleClose}>
      <DrawerContent ref={setContentEl}>
        <DrawerHeader>
          <DrawerTitle className="text-center">ویرایش اطلاعات فردی</DrawerTitle>
          <DrawerDescription className="text-center text-sm">
            نام و نام خانوادگی، کد ملی و تاریخ تولد خود را ویرایش کنید
          </DrawerDescription>
        </DrawerHeader>

        <FormProvider
          methods={methods}
          onSubmit={handleSubmit(onSubmit)}
          className="px-4 pb-4 space-y-4"
        >
          <RHFInput name="fullName" label="نام و نام خانوادگی" isRequired />
          <RHFInput
            name="nationalCode"
            label="کد ملی"
            placeholder="مثلاً ۰۰۱۰۳۲۱۲۶۸"
            inputMode="numeric"
            autoComplete="off"
            dir="ltr"
            sanitize={sanitizeNationalCodeInput}
            helperText="کد ملی برای احراز هویت بانکی و تسویه حساب الزامی است"
          />
          <PersianDatePicker
            name="birthDate"
            label="تاریخ تولد"
            portalTarget={contentEl}
          />

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'در حال ذخیره...' : 'ذخیره تغییرات'}
          </Button>
        </FormProvider>
      </DrawerContent>
    </Drawer>
  );
}
