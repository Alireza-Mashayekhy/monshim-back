'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useRef } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import * as z from 'zod';

import FormProvider from '@/components/form/form-provider';
import RHFSelect from '@/components/form/rhf-select';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { getApiErrorMessage } from '@/lib/api-error';
import type { UserResponse } from '@/services/features/auth/types';
import {
  useCityList,
  useProvinceList,
} from '@/services/features/locations/hooks';
import { useEditUser } from '@/services/features/users/hooks';

interface AddressModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: UserResponse | null;
}

const schema = z.object({
  provinceId: z.string().trim().nonempty('انتخاب استان اجباری است'),
  cityId: z.string().trim().nonempty('انتخاب شهر اجباری است'),
});

type FormData = z.infer<typeof schema>;

export function AddressModal({ open, onOpenChange, user }: AddressModalProps) {
  const methods = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      provinceId: user?.provinceId ? String(user.provinceId) : '',
      cityId: user?.cityId ? String(user.cityId) : '',
    },
  });

  const editUserMutation = useEditUser();

  const { reset } = methods;

  useEffect(() => {
    if (open) {
      reset({
        provinceId: user?.provinceId ? String(user.provinceId) : '',
        cityId: user?.cityId ? String(user.cityId) : '',
      });
    }
  }, [open, user, reset]);

  const selectedProvinceId = useWatch({
    control: methods.control,
    name: 'provinceId',
  });

  const { data: provinces } = useProvinceList();
  const { data: cities } = useCityList(parseInt(selectedProvinceId));

  const previousProvince = useRef(selectedProvinceId);
  useEffect(() => {
    if (previousProvince.current !== selectedProvinceId) {
      methods.setValue('cityId', '', { shouldValidate: true });
      previousProvince.current = selectedProvinceId;
    }
  }, [selectedProvinceId, methods]);

  const provinceOptions = provinces?.data?.map((p: any) => ({
    value: p.id.toString(),
    text: p.name,
  }));

  const cityOptions = cities?.data?.map((c: any) => ({
    value: c.id.toString(),
    text: c.name,
  }));

  const onSubmit = async (data: FormData) => {
    const province = provinces?.data?.find(
      (p: any) => String(p.id) === String(data.provinceId),
    );
    const city = cities?.data?.find(
      (c: any) => String(c.id) === String(data.cityId),
    );

    if (!province || !city) {
      toast.error('استان و شهر معتبر انتخاب کنید.');
      return;
    }

    try {
      await editUserMutation.mutateAsync({
        provinceId: Number(data.provinceId),
        cityId: Number(data.cityId),
      });
      toast.success('آدرس شما به‌روزرسانی شد.');
      onOpenChange(false);
    } catch (error) {
      toast.error(
        getApiErrorMessage(error, 'ذخیره آدرس انجام نشد. دوباره تلاش کنید.'),
      );
    }
  };

  const handleClose = () => {
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm rounded-3xl p-6">
        <DialogHeader className="flex flex-row justify-between items-center">
          <DialogTitle className="font-bold text-lg text-gray-800">
            تغییر آدرس
          </DialogTitle>
        </DialogHeader>

        <FormProvider
          methods={methods}
          onSubmit={onSubmit}
          className="space-y-4"
        >
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
              selectedProvinceId
                ? 'انتخاب شهر...'
                : 'ابتدا استان را انتخاب کنید'
            }
            disabled={!selectedProvinceId}
          />

          <Button
            type="submit"
            className="w-full"
            loading={editUserMutation.isPending}
          >
            ذخیره آدرس
          </Button>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}
