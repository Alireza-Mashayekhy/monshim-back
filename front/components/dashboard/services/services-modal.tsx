// components/dashboard/services/services-modal.tsx
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import * as z from 'zod';

import FormProvider from '@/components/form/form-provider';
import RHFInput from '@/components/form/rhf-input';
import RHFNumberInput from '@/components/form/rhf-number-input';
import RHFSelect from '@/components/form/rhf-select';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { unformatNumberInput } from '@/lib/utils';
import {
  useCreateService,
  useUpdateService,
} from '@/services/features/services/hooks';

interface ServiceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingService?: any; // Service | null
}

const schema = z.object({
  name: z.string().min(1, 'نام خدمت الزامی است'),
  price: z.string().min(1, 'قیمت الزامی است'),
  depositPrice: z.string().optional(),
  duration: z.string().min(1, 'مدت زمان الزامی است'),
});

type FormData = z.infer<typeof schema>;

const durationOptions = [
  { value: '15', label: '۱۵ دقیقه' },
  { value: '30', label: '۳۰ دقیقه' },
  { value: '45', label: '۴۵ دقیقه' },
  { value: '60', label: '۱ ساعت' },
  { value: '90', label: '۱.۵ ساعت' },
  { value: '120', label: '۲ ساعت' },
];

export function ServiceModal({
  open,
  onOpenChange,
  editingService,
}: ServiceModalProps) {
  const createMutation = useCreateService();
  const updateMutation = useUpdateService();

  const methods = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      price: '',
      depositPrice: '',
      duration: '30',
    },
  });

  const { reset } = methods;

  useEffect(() => {
    if (editingService) {
      reset({
        name: editingService.name,
        price: editingService.price?.toString() ?? '',
        depositPrice: editingService.depositPrice?.toString() ?? '',
        duration: editingService.durationMinutes?.toString() ?? '30',
      });
    } else {
      reset({
        name: '',
        price: '',
        depositPrice: '',
        duration: '30',
      });
    }
  }, [editingService, reset, open]);

  const onSubmit = (data: FormData) => {
    const price = unformatNumberInput(data.price);

    const depositPrice = data.depositPrice
      ? unformatNumberInput(data.depositPrice)
      : null;

    if (depositPrice !== null && depositPrice > price) {
      methods.setError('depositPrice', {
        type: 'manual',
        message: 'بیعانه نمی‌تواند بیشتر از مبلغ کل باشد.',
      });

      return;
    }

    const dto = {
      name: data.name,
      price,
      depositPrice,
      durationMinutes: parseInt(data.duration),
      isActive: true,
    };

    if (editingService) {
      updateMutation.mutate(
        { id: editingService.id, dto },
        {
          onSuccess: () => onOpenChange(false),
        },
      );
    } else {
      createMutation.mutate(dto, {
        onSuccess: () => onOpenChange(false),
      });
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-3xl p-6">
        <DialogHeader className="flex flex-row justify-between items-center">
          <DialogTitle className="font-bold text-lg text-gray-800">
            {editingService ? 'ویرایش خدمت' : 'افزودن خدمت جدید'}
          </DialogTitle>
        </DialogHeader>

        <FormProvider
          methods={methods}
          onSubmit={onSubmit}
          className="space-y-4"
        >
          <RHFInput
            name="name"
            label="نام خدمت"
            placeholder="مثلاً کوتاهی مو"
          />
          <RHFNumberInput
            name="price"
            label="مبلغ کل (تومان)"
            outputType="string"
            placeholder="مثلاً ۱۵۰۰۰۰"
            allowDecimal={false}
            max={9999999999}
          />
          <RHFNumberInput
            name="depositPrice"
            label="بیعانه (اختیاری)"
            outputType="string"
            placeholder="مثلاً ۱۵۰۰۰۰"
            allowDecimal={false}
            max={9999999999}
          />
          <RHFSelect
            name="duration"
            label="مدت زمان"
            items={durationOptions}
            placeholder="انتخاب مدت زمان"
          />
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading
              ? 'در حال ذخیره...'
              : editingService
                ? 'ویرایش'
                : 'افزودن'}
          </Button>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}
