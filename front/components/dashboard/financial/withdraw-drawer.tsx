// components/dashboard/financial/WithdrawModal.tsx
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';

import FormProvider from '@/components/form/form-provider';
import RHFNumberInput from '@/components/form/rhf-number-input';
import RHFSelect from '@/components/form/rhf-select';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Skeleton } from '@/components/ui/skeleton';
import { formatPrice } from '@/lib/utils';
import { useBankCards, useWithdraw } from '@/services/features/wallet/hooks';

const schema = z.object({
  amount: z
    .string()
    .min(1, 'مبلغ الزامی است')
    .refine(val => parseFloat(val.replace(/,/g, '')) >= 1, {
      message: 'حداقل مبلغ برداشت ۱ تومان است',
    }),
  cardId: z.string().min(1, 'انتخاب کارت الزامی است'),
});

type FormData = z.infer<typeof schema>;

interface WithdrawDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  balance: number;
}

export function WithdrawDrawer({
  open,
  onOpenChange,
  balance,
}: WithdrawDrawerProps) {
  const withdraw = useWithdraw();
  const { data: cards, isLoading: cardsLoading } = useBankCards();

  const methods = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      amount: '',
      cardId: '',
    },
  });

  const { reset, watch, handleSubmit, setValue } = methods;
  const amountValue = watch('amount');
  const parsedAmount = parseFloat(amountValue?.replace(/,/g, '') || '0');

  const handleFillFullAmount = () => {
    if (balance > 0) {
      // کل موجودی را بدون اعشار در اینپوت بگذار (RHFNumberInput خودش فرمت می‌کند)
      setValue('amount', String(Math.floor(balance)), {
        shouldValidate: true,
        shouldDirty: true,
      });
    }
  };

  const onSubmit = (data: FormData) => {
    withdraw.mutate(
      {
        amount: parsedAmount,
        cardId: data.cardId,
      },
      {
        onSuccess: () => {
          reset();
          onOpenChange(false);
        },
      },
    );
  };

  const handleClose = () => {
    reset();
    onOpenChange(false);
  };

  return (
    <Drawer open={open} onOpenChange={handleClose}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle className="text-center">درخواست برداشت</DrawerTitle>
          <DrawerDescription className="text-center text-sm">
            مبلغ مورد نظر را برای برداشت مشخص کنید
          </DrawerDescription>
        </DrawerHeader>

        <FormProvider
          methods={methods}
          onSubmit={handleSubmit(onSubmit)}
          className="px-4 pb-4 space-y-4"
        >
          <RHFNumberInput
            name="amount"
            label="مبلغ (تومان)"
            placeholder="مثلاً ۵۰۰٬۰۰۰"
            outputType="string"
            min={1}
            max={9999999999}
          />

          <div className="flex items-center justify-between gap-2 rounded-xl bg-gray-50 border border-gray-100 px-3 py-2.5">
            <span className="text-xs text-gray-500">
              موجودی: <span className="font-bold text-gray-800">{formatPrice(balance)} تومان</span>
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-xs shrink-0"
              onClick={handleFillFullAmount}
              disabled={balance <= 0}
            >
              کل مبلغ
            </Button>
          </div>

          {parsedAmount > balance && (
            <p className="text-red-500 text-xs text-center">
              مبلغ بیشتر از موجودی است
            </p>
          )}

          {cardsLoading ? (
            <Skeleton className="h-12 w-full" />
          ) : (
            <RHFSelect
              name="cardId"
              label="کارت مقصد"
              items={
                cards?.data?.map(c => ({
                  value: c.id,
                  label: `${c.bankName} - ${c.cardNumber.slice(-4)}`,
                })) || []
              }
              placeholder="انتخاب کارت..."
            />
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={
              withdraw.isPending ||
              parsedAmount > balance ||
              parsedAmount < 1
            }
          >
            {withdraw.isPending ? 'در حال ثبت...' : 'ثبت درخواست برداشت'}
          </Button>
        </FormProvider>
      </DrawerContent>
    </Drawer>
  );
}
