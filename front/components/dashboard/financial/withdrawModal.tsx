// components/dashboard/financial/WithdrawModal.tsx
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import * as z from 'zod';

import FormProvider from '@/components/form/form-provider';
import RHFNumberInput from '@/components/form/rhf-number-input';
import RHFSelect from '@/components/form/rhf-select';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { formatPrice } from '@/lib/utils';
import { useBankCards, useWithdraw } from '@/services/features/wallet/hooks';

const schema = z.object({
  amount: z
    .string()
    .min(1, 'مبلغ الزامی است')
    .refine(val => parseFloat(val.replace(/,/g, '')) >= 200000, {
      message: 'حداقل مبلغ برداشت ۲۰۰,۰۰۰ تومان است',
    }),
  cardId: z.string().min(1, 'انتخاب کارت الزامی است'),
});

type FormData = z.infer<typeof schema>;

interface WithdrawModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  balance: number;
}

export function WithdrawModal({
  open,
  onOpenChange,
  balance,
}: WithdrawModalProps) {
  const withdraw = useWithdraw();
  const { data: cards, isLoading: cardsLoading } = useBankCards();

  const methods = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      amount: '',
      cardId: '',
    },
  });

  const { reset, watch } = methods;
  const amountValue = watch('amount');
  const parsedAmount = parseFloat(amountValue?.replace(/,/g, '') || '0');

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
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md rounded-3xl p-6">
        <DialogHeader className="flex flex-row justify-between items-center">
          <DialogTitle className="font-bold text-lg text-gray-800">
            درخواست برداشت
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
          <RHFNumberInput
            name="amount"
            label="مبلغ (تومان)"
            placeholder="مثلاً ۵۰۰٬۰۰۰"
            outputType="string"
            min={200000}
            max={9999999999}
          />

          <div className="text-sm text-gray-500">
            موجودی قابل برداشت: {formatPrice(balance)} تومان
            {parsedAmount > balance && (
              <p className="text-red-500 text-xs mt-1">
                مبلغ بیشتر از موجودی است
              </p>
            )}
          </div>

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
              parsedAmount < 200000
            }
          >
            {withdraw.isPending ? 'در حال ثبت...' : 'ثبت درخواست برداشت'}
          </Button>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}
