'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';

import FormProvider from '@/components/form/form-provider';
import RHFInput from '@/components/form/rhf-input';
import RHFNumberInput from '@/components/form/rhf-number-input';
import RHFSelect from '@/components/form/rhf-select';
import RHFSwitch from '@/components/form/rhf-switch';
import RHFTextArea from '@/components/form/rhf-textarea';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  useCreateSubscriptionPlan,
  useUpdateSubscriptionPlan,
} from '@/services/features/subscription/hooks';
import { SubscriptionPlan } from '@/services/features/subscription/types';

interface SubscriptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subscription?: SubscriptionPlan | null;
}

type FormValues = {
  name: string;
  price: number;
  durationDays: string;
  description: string;
  sortOrder: number;
  isActive: boolean;
};

const durationOptions = [
  {
    value: '30',
    text: '۱ ماهه',
  },
  {
    value: '90',
    text: '۳ ماهه',
  },
  {
    value: '365',
    text: 'سالانه',
  },
];

export default function SubscriptionDialog({
  open,
  onOpenChange,
  subscription,
}: SubscriptionDialogProps) {
  const isEdit = !!subscription;

  const createMutation = useCreateSubscriptionPlan();
  const updateMutation = useUpdateSubscriptionPlan();

  const methods = useForm<FormValues>({
    defaultValues: {
      name: '',
      price: 0,
      durationDays: '30',
      description: '',
      sortOrder: 0,
      isActive: true,
    },
  });

  const { reset, watch, setValue } = methods;

  const isActive = watch('isActive');

  useEffect(() => {
    if (!open) return;

    if (subscription) {
      reset({
        name: subscription.name,
        price: Number(subscription.price),
        durationDays: String(subscription.durationDays),
        description: subscription.description ?? '',
        sortOrder: subscription.sortOrder,
        isActive: subscription.isActive,
      });
    } else {
      reset({
        name: '',
        price: 0,
        durationDays: '30',
        description: '',
        sortOrder: 0,
        isActive: true,
      });
    }
  }, [subscription, open, reset]);

  const onSubmit = (values: FormValues) => {
    const dto = {
      name: values.name.trim(),
      price: Number(values.price),
      durationDays: Number(values.durationDays),
      description: values.description.trim() || null,
      sortOrder: Number(values.sortOrder),
      isActive: values.isActive,
    };

    if (isEdit) {
      updateMutation.mutate(
        {
          id: subscription.id,
          dto,
        },
        {
          onSuccess: () => {
            onOpenChange(false);
          },
        },
      );

      return;
    }

    createMutation.mutate(dto, {
      onSuccess: () => {
        onOpenChange(false);
      },
    });
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'ویرایش پلن اشتراک' : 'افزودن پلن اشتراک'}
          </DialogTitle>
        </DialogHeader>

        <FormProvider
          methods={methods}
          onSubmit={onSubmit}
          className="space-y-5 max-h-[80vh] overflow-auto scrollbar-thin!"
        >
          <RHFInput
            name="name"
            label="نام اشتراک"
            placeholder="مثلاً اشتراک طلایی"
            isRequired
          />

          <div className="grid grid-cols-2 gap-4">
            <RHFNumberInput
              name="price"
              label="قیمت"
              placeholder="مثلاً 500,000"
              min={0}
              isRequired
            />

            <RHFSelect
              name="durationDays"
              label="مدت اشتراک"
              placeholder="انتخاب مدت"
              items={durationOptions}
            />
          </div>

          <RHFTextArea
            name="description"
            label="توضیحات"
            placeholder="توضیحات مربوط به اشتراک..."
          />

          <div className="grid grid-cols-2 gap-4 items-end">
            <RHFNumberInput
              name="sortOrder"
              label="ترتیب نمایش"
              min={0}
              placeholder="0"
            />

            <RHFSwitch
              name="isActive"
              label="فعال"
              className="cursor-pointer mb-2"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              انصراف
            </Button>

            <Button type="submit" disabled={isPending}>
              {isPending
                ? 'در حال ذخیره...'
                : isEdit
                  ? 'ذخیره تغییرات'
                  : 'ایجاد اشتراک'}
            </Button>
          </div>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}
