'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';

import FormProvider from '@/components/form/form-provider';
import RHFNumberInput from '@/components/form/rhf-number-input';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useUpdateSubscriptionPlan } from '@/services/features/subscription/hooks';
import { SubscriptionPlan } from '@/services/features/subscription/types';

interface SubscriptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subscription?: SubscriptionPlan | null;
}

type FormValues = {
  price: number;
  smsCount: number;
};

export default function SubscriptionDialog({
  open,
  onOpenChange,
  subscription,
}: SubscriptionDialogProps) {
  const updateMutation = useUpdateSubscriptionPlan();

  const methods = useForm<FormValues>({
    defaultValues: {
      price: 0,
      smsCount: 0,
    },
  });

  const { reset } = methods;

  useEffect(() => {
    if (!open || !subscription) return;

    reset({
      price: Number(subscription.price),
      smsCount: subscription.smsCount ?? 0,
    });
  }, [subscription, open, reset]);

  const onSubmit = (values: FormValues) => {
    if (!subscription) return;

    updateMutation.mutate(
      {
        id: subscription.id,
        dto: {
          price: Number(values.price),
          smsCount: Number(values.smsCount),
        },
      },
      {
        onSuccess: () => {
          onOpenChange(false);
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            ویرایش {subscription ? subscription.name : 'پلن اشتراک'}
          </DialogTitle>

          <DialogDescription>
            پلن‌ها ثابت هستند و فقط قیمت و تعداد پیامک قابل تغییر است.
          </DialogDescription>
        </DialogHeader>

        <FormProvider
          methods={methods}
          onSubmit={onSubmit}
          className="space-y-5"
        >
          <div className="grid grid-cols-1 gap-4">
            <RHFNumberInput
              name="price"
              label="قیمت یک‌ماهه (تومان)"
              placeholder="مثلاً 59000"
              min={0}
              isRequired
            />

            <RHFNumberInput
              name="smsCount"
              label="تعداد پیامک"
              placeholder="مثلاً 100"
              min={0}
              isRequired
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={updateMutation.isPending}
            >
              انصراف
            </Button>

            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'در حال ذخیره...' : 'ذخیره تغییرات'}
            </Button>
          </div>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}
