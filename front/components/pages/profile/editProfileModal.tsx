// components/profile/EditProfileModal.tsx
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import * as z from 'zod';

import FormProvider from '@/components/form/form-provider';
import { PersianDatePicker } from '@/components/form/persian-date-picker';
import RHFInput from '@/components/form/rhf-input';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { isoToJalali, jalaliToIso } from '@/lib/date-utils';
import { UserResponse } from '@/services/features/auth/types';
import { useEditUser } from '@/services/features/users/hooks';

interface EditProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: { data: UserResponse | null };
}

const schema = z.object({
  fullName: z.string().min(1, 'نام و نام خانوادگی اجباری است'),
  birthDate: z.string().optional().nullable(),
});

type FormData = z.infer<typeof schema>;

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  open,
  onOpenChange,
  user,
}) => {
  const methods = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      fullName: user?.data?.fullName || '',
      birthDate: null,
    },
  });

  const editUserMutation = useEditUser();

  const { reset } = methods;

  // هر بار که user یا open تغییر می‌کند، فرم را با مقادیر جدید reset کن
  useEffect(() => {
    if (open && user) {
      // تبدیل تاریخ میلادی به شمسی برای نمایش در فرم
      reset({
        fullName: user.data?.fullName || '',
        birthDate: isoToJalali(user.data?.birthDate) || null,
      });
    }
  }, [open, user, reset]);

  const onSubmit = async (data: FormData) => {
    try {
      // تبدیل تاریخ شمسی به میلادی برای ارسال به سرور
      await editUserMutation.mutateAsync({
        fullName: data.fullName,
        birthDate: jalaliToIso(data.birthDate),
      });
      toast.success('اطلاعات پروفایل بروزرسانی شد.');
      onOpenChange(false);
    } catch {
      toast.error('مشکلی پیش آمده است.');
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
            ویرایش پروفایل
          </DialogTitle>
        </DialogHeader>

        <FormProvider
          methods={methods}
          onSubmit={onSubmit}
          className="space-y-4"
        >
          <RHFInput
            name="fullName"
            label="نام و نام خانوادگی"
            placeholder="نام خود را وارد کنید"
          />

          <PersianDatePicker name="birthDate" label="تاریخ تولد" />

          <div>
            <label className="text-xs font-bold text-gray-500 mb-1 block">
              شماره موبایل (غیرقابل تغییر)
            </label>
            <Input value={user?.data?.phone || ''} disabled />
          </div>

          <Button type="submit" className="w-full">
            ذخیره تغییرات
          </Button>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
};
