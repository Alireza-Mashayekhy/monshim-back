'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import * as z from 'zod';

import FormProvider from '@/components/form/form-provider';
import RHFInput from '@/components/form/rhf-input';
import RHFSelect from '@/components/form/rhf-select';
import RHFTextArea from '@/components/form/rhf-textarea';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import {
  useMyBarberProfile,
  useUpdateBarberProfile,
} from '@/services/features/barber/hooks';
import {
  useCityList,
  useProvinceList,
} from '@/services/features/locations/hooks';

const schema = z.object({
  salonName: z.string().min(1, 'نام فروشگاه الزامی است'),
  provinceId: z.string().nullable(),
  cityId: z.string().nullable(),
  address: z.string().min(1, 'آدرس الزامی است'),
  bio: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface SalonInfoDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SalonInfoDrawer({ open, onOpenChange }: SalonInfoDrawerProps) {
  const { data: profile } = useMyBarberProfile();
  const updateMutation = useUpdateBarberProfile();

  const methods = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      salonName: '',
      provinceId: null,
      cityId: null,
      address: '',
      bio: '',
    },
  });

  const { control, reset, setValue, handleSubmit } = methods;
  const watchedProvinceId = useWatch({ control, name: 'provinceId' });

  const { data: provinces } = useProvinceList();
  const selectedProvince = watchedProvinceId
    ? Number(watchedProvinceId)
    : (profile?.data?.provinceId ?? null);
  const { data: cities } = useCityList(selectedProvince || null);

  useEffect(() => {
    if (profile?.data) {
      reset({
        salonName: profile.data.salonName || '',
        provinceId: profile.data.provinceId
          ? String(profile.data.provinceId)
          : null,
        cityId: profile.data.cityId ? String(profile.data.cityId) : null,
        address: profile.data.address || '',
        bio: profile.data.bio || '',
      });
    }
  }, [profile?.data, reset, open]);

  const onSubmit = (data: FormData) => {
    const trimmedBio = data.bio?.trim();
    const payload = {
      salonName: data.salonName.trim(),
      provinceId: data.provinceId ? parseInt(data.provinceId, 10) : null,
      cityId: data.cityId ? parseInt(data.cityId, 10) : null,
      address: data.address.trim(),
      bio: trimmedBio ? trimmedBio : null,
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
          <DrawerTitle className="text-center">ویرایش اطلاعات سالن</DrawerTitle>
          <DrawerDescription className="text-center text-sm">
            اطلاعات فروشگاه و موقعیت مکانی خود را ویرایش کنید
          </DrawerDescription>
        </DrawerHeader>

        <FormProvider
          methods={methods}
          onSubmit={handleSubmit(onSubmit)}
          className="px-4 pb-4 space-y-4"
        >
          <RHFInput name="salonName" label="نام فروشگاه" isRequired />

          <div className="grid grid-cols-2 gap-4">
            <RHFSelect
              name="provinceId"
              label="استان"
              items={provinces?.data?.map(p => ({
                value: p.id.toString(),
                text: p.name,
              }))}
              placeholder="انتخاب استان..."
              onValueChange={() => {
                setValue('cityId', null, { shouldDirty: true });
              }}
            />
            <RHFSelect
              name="cityId"
              label="شهر"
              items={cities?.data?.map(c => ({
                value: c.id.toString(),
                text: c.name,
              }))}
              placeholder="انتخاب شهر..."
              disabled={!watchedProvinceId}
            />
          </div>

          <RHFTextArea name="address" label="آدرس" rows={3} required />
          <RHFTextArea
            name="bio"
            label="بیوگرافی"
            rows={4}
            placeholder="درباره خود و فروشگاهتان..."
          />

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'در حال ذخیره...' : 'ذخیره تغییرات'}
          </Button>
        </FormProvider>
      </DrawerContent>
    </Drawer>
  );
}
