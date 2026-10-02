// components/dashboard/financial/CardModal.tsx
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight, CreditCard, Info, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
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
import { Skeleton } from '@/components/ui/skeleton';
import {
  useAddCard,
  useBankCards,
  useDeleteCard,
} from '@/services/features/wallet/hooks';
import { BankCard } from '@/services/features/wallet/types';

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

const formatCardNumber = (num: string) => num.replace(/(\d{4})(?=\d)/g, '$1 ');

function OwnerMismatchNotice() {
  return (
    <p className="flex items-start gap-1.5 rounded-xl border border-amber-200 bg-amber-50 p-2.5 text-[11px] font-medium leading-5 text-amber-700">
      <Info size={14} className="mt-0.5 shrink-0" />
      در صورت مغایرت صاحب کارت با اکانت آرایشگر، پول پرداخت نمی‌شود.
    </p>
  );
}

export function CardDrawer({ open, onOpenChange }: CardDrawerProps) {
  const [view, setView] = useState<'list' | 'add'>('list');

  const { data: cards, isLoading: cardsLoading } = useBankCards();
  const addCard = useAddCard();
  const deleteCard = useDeleteCard();

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
        setView('list');
      },
    });
  };

  const handleClose = () => {
    reset();
    setView('list');
    onOpenChange(false);
  };

  const handleDelete = (card: BankCard) => {
    if (!window.confirm(`کارت ${card.bankName} حذف شود؟`)) return;
    deleteCard.mutate(card.id);
  };

  const cardList = cards?.data ?? [];

  return (
    <Drawer open={open} onOpenChange={handleClose}>
      <DrawerContent>
        <DrawerHeader className="relative">
          {view === 'add' && (
            <button
              type="button"
              onClick={() => setView('list')}
              className="absolute right-4 top-4 rounded-lg p-1.5 text-gray-500 hover:bg-gray-100"
              aria-label="بازگشت"
            >
              <ArrowRight size={18} />
            </button>
          )}
          <DrawerTitle className="text-center">
            {view === 'list' ? 'کارت‌های بانکی' : 'افزودن کارت بانکی'}
          </DrawerTitle>
          <DrawerDescription className="text-center text-sm">
            {view === 'list'
              ? 'کارت‌های ثبت‌شده برای تسویه وجه'
              : 'کارت بانکی خود را برای برداشت وجه اضافه کنید'}{' '}
          </DrawerDescription>
        </DrawerHeader>

        {view === 'list' ? (
          <div className="space-y-3 px-4 pb-4">
            {cardsLoading ? (
              [1, 2].map(i => (
                <Skeleton key={i} className="h-20 w-full rounded-2xl" />
              ))
            ) : cardList.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 py-6 text-center text-sm text-gray-400">
                هنوز کارتی ثبت نکرده‌اید
              </p>
            ) : (
              cardList.map(card => (
                <div
                  key={card.id}
                  className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-gray-50 p-3"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-2/60 text-primary">
                    <CreditCard size={18} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-gray-800">
                      {card.bankName}
                      {card.isDefault && (
                        <span className="mr-2 rounded-md bg-primary-2 px-1.5 py-0.5 text-[10px] text-primary">
                          پیش‌فرض
                        </span>
                      )}
                    </p>
                    <p
                      dir="ltr"
                      className="mt-1 text-right font-mono text-sm tracking-wider text-gray-600"
                    >
                      {formatCardNumber(card.cardNumber)}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-gray-400">
                      {card.ownerName}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDelete(card)}
                    disabled={deleteCard.isPending}
                    className="rounded-lg p-2 text-red-500 transition-colors hover:bg-red-50 disabled:opacity-50"
                    aria-label="حذف کارت"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))
            )}

            <Button className="w-full gap-2" onClick={() => setView('add')}>
              <Plus size={16} /> افزودن کارت
            </Button>
            <OwnerMismatchNotice />
          </div>
        ) : (
          <FormProvider
            methods={methods}
            onSubmit={handleSubmit(onSubmit)}
            className="px-4 pb-4 space-y-4"
          >
            <RHFInput
              name="bankName"
              label="نام بانک"
              placeholder="مثلاً ملی"
            />
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
            <Button
              type="submit"
              className="w-full"
              disabled={addCard.isPending}
            >
              {addCard.isPending ? 'در حال ثبت...' : 'افزودن کارت'}
            </Button>
            <OwnerMismatchNotice />
          </FormProvider>
        )}
      </DrawerContent>
    </Drawer>
  );
}
