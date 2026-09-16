// components/dashboard/financial/CardModal.tsx
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { X } from 'lucide-react';
import { useForm } from 'react-hook-form';
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
import { useAddCard } from '@/services/features/wallet/hooks';

const schema = z.object({
  bankName: z.string().min(1, 'نام بانک الزامی است'),
  cardNumber: z
    .string()
    .length(16, 'شماره کارت باید ۱۶ رقم باشد')
    .regex(/^\d+$/, 'فقط اعداد مجاز هستند'),
  shebaNumber: z
    .string()
    .optional()
    .refine(
      val => !val || /^IR\d{24}$/.test(val),
      'شماره شبا باید با IR شروع شود و ۲۶ کاراکتر باشد',
    ),
  ownerName: z.string().min(1, 'نام صاحب حساب الزامی است'),
});

type FormData = z.infer<typeof schema>;

interface CardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CardModal({ open, onOpenChange }: CardModalProps) {
  const addCard = useAddCard();

  const methods = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      bankName: '',
      cardNumber: '',
      shebaNumber: '',
      ownerName: '',
    },
  });

  const { reset, handleSubmit } = methods;

  const onSubmit = (data: FormData) => {
    addCard.mutate(data, {
      onSuccess: () => {
        reset();
        onOpenChange(false);
      },
    });
  };

  const handleClose = () => {
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md rounded-3xl p-6">
        <DialogHeader className="flex flex-row justify-between items-center">
          <DialogTitle className="font-bold text-lg text-gray-800">
            افزودن کارت بانکی
          </DialogTitle>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={20} />
          </button>
        </DialogHeader>

        <FormProvider
          methods={methods}
          onSubmit={onSubmit}
          className="space-y-4"
        >
          <RHFInput name="bankName" label="نام بانک" placeholder="مثلاً ملی" />
          <RHFInput
            name="cardNumber"
            label="شماره کارت"
            placeholder="۶۰۳۷۹۹..."
            inputMode="numeric"
            maxLength={16}
            dir="ltr"
          />
          <RHFInput
            name="shebaNumber"
            label="شماره شبا (اختیاری)"
            placeholder="IR..."
          />
          <RHFInput
            name="ownerName"
            label="نام صاحب حساب"
            placeholder="نام و نام خانوادگی"
          />
          <Button type="submit" className="w-full" disabled={addCard.isPending}>
            {addCard.isPending ? 'در حال ثبت...' : 'افزودن کارت'}
          </Button>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}
