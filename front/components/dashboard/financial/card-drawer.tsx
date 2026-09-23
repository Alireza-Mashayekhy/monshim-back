// components/dashboard/financial/CardModal.tsx
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';

import FormProvider from '@/components/form/form-provider';
import RHFInput from '@/components/form/rhf-input';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
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

interface CardDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CardDrawer({ open, onOpenChange }: CardDrawerProps) {
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
    <Drawer open={open} onOpenChange={handleClose}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle className="text-center">افزودن کارت بانکی</DrawerTitle>
          <DrawerDescription className="text-center text-sm">
            کارت بانکی خود را برای برداشت وجه اضافه کنید
          </DrawerDescription>
        </DrawerHeader>

        <FormProvider
          methods={methods}
          onSubmit={handleSubmit(onSubmit)}
          className="px-4 pb-4 space-y-4"
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
      </DrawerContent>
    </Drawer>
  );
}
