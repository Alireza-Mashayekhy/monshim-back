'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, Lock } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import * as z from 'zod';

import FormProvider from '@/components/form/form-provider';
import RHFInput from '@/components/form/rhf-input';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { getApiErrorMessage } from '@/lib/api-error';
import { useChangePassword } from '@/services/features/auth/hooks';

interface ChangePasswordModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const schema = z
  .object({
    currentPassword: z.string().min(1, 'رمز عبور فعلی را وارد کنید'),
    newPassword: z.string().min(6, 'رمز عبور جدید باید حداقل ۶ کاراکتر باشد'),
    confirmPassword: z.string().min(1, 'تکرار رمز عبور اجباری است'),
  })
  .refine(data => data.newPassword === data.confirmPassword, {
    message: 'تکرار رمز عبور با رمز جدید مطابقت ندارد.',
    path: ['confirmPassword'],
  });

type FormData = z.infer<typeof schema>;

export function ChangePasswordModal({
  open,
  onOpenChange,
}: ChangePasswordModalProps) {
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const changePasswordMutation = useChangePassword();

  const methods = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (data: FormData) => {
    try {
      await changePasswordMutation.mutateAsync({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      toast.success('رمز عبور با موفقیت تغییر کرد.');
      methods.reset();
      onOpenChange(false);
    } catch (error) {
      toast.error(
        getApiErrorMessage(
          error,
          'تغییر رمز عبور انجام نشد. دوباره تلاش کنید.',
        ),
      );
    }
  };

  const handleClose = () => {
    methods.reset();
    onOpenChange(false);
  };

  const eyeButton = (show: boolean, toggle: () => void, label: string) => (
    <button
      type="button"
      onClick={toggle}
      className="p-1 text-gray-400 hover:text-gray-600 cursor-pointer transition-colors"
      aria-label={label}
    >
      {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
    </button>
  );

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm rounded-3xl p-6">
        <DialogHeader className="flex flex-row justify-between items-center">
          <DialogTitle className="font-bold text-lg text-gray-800">
            تغییر رمز عبور
          </DialogTitle>
        </DialogHeader>

        <FormProvider
          methods={methods}
          onSubmit={onSubmit}
          className="space-y-4"
        >
          <RHFInput
            name="currentPassword"
            type={showCurrent ? 'text' : 'password'}
            label="رمز عبور فعلی"
            placeholder="رمز فعلی را وارد کنید"
            dir="ltr"
            className="text-left font-mono"
            startIcon={<Lock className="w-4 h-4" />}
            endIcon={eyeButton(
              showCurrent,
              () => setShowCurrent(p => !p),
              'نمایش رمز فعلی',
            )}
          />

          <RHFInput
            name="newPassword"
            type={showNew ? 'text' : 'password'}
            label="رمز عبور جدید"
            placeholder="حداقل ۶ کاراکتر"
            dir="ltr"
            className="text-left font-mono"
            startIcon={<Lock className="w-4 h-4" />}
            endIcon={eyeButton(
              showNew,
              () => setShowNew(p => !p),
              'نمایش رمز جدید',
            )}
          />

          <RHFInput
            name="confirmPassword"
            type={showConfirm ? 'text' : 'password'}
            label="تکرار رمز عبور جدید"
            placeholder="تکرار رمز جدید"
            dir="ltr"
            className="text-left font-mono"
            startIcon={<Lock className="w-4 h-4" />}
            endIcon={eyeButton(
              showConfirm,
              () => setShowConfirm(p => !p),
              'نمایش تکرار رمز',
            )}
          />

          <Button
            type="submit"
            className="w-full"
            loading={changePasswordMutation.isPending}
          >
            تغییر رمز عبور
          </Button>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}
