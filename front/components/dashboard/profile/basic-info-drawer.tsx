'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
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
import { useUpdateBarberProfile } from '@/services/features/barber/hooks';
import { useMyBarberProfile } from '@/services/features/barber/hooks';

const schema = z.object({
  fullName: z.string().min(1, 'نام و نام خانوادگی الزامی است'),
  birthDate: z.string().optional().nullable(),
});

type FormData = z.infer<typeof schema>;

interface BasicInfoDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BasicInfoDrawer({ open, onOpenChange }: BasicInfoDrawerProps) {
  const { data: profile } = useMyBarberProfile();
  const updateMutation = useUpdateBarberProfile();

  const methods = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      fullName: '',
      birthDate: null,
    },
  });

  const { reset, handleSubmit } = methods;

  useEffect(() => {
    if (profile?.data) {
      reset({
        fullName: profile.data.fullName || '',
        birthDate: isoToJalali(profile.data.birthDate) || null,
      });
    }
  }, [profile?.data, reset, open]);

  const onSubmit = (data: FormData) => {
    const payload = {
      fullName: data.fullName,
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
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle className="text-center">ویرایش اطلاعات فردی</DrawerTitle>
          <DrawerDescription className="text-center text-sm">
            نام و نام خانوادگی و تاریخ تولد خود را ویرایش کنید
          </DrawerDescription>
        </DrawerHeader>

        <FormProvider
          methods={methods}
          onSubmit={handleSubmit(onSubmit)}
          className="px-4 pb-4 space-y-4"
        >
          <RHFInput name="fullName" label="نام و نام خانوادگی" isRequired />
          <PersianDatePicker name="birthDate" label="تاریخ تولد" />

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'در حال ذخیره...' : 'ذخیره تغییرات'}
          </Button>
        </FormProvider>
      </DrawerContent>
    </Drawer>
  );
}
