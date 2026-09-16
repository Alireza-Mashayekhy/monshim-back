'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { CalendarClock, Loader2 } from 'lucide-react';
import { useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import * as z from 'zod';

import FormProvider from '@/components/form/form-provider';
import { PersianDatePicker } from '@/components/form/persian-date-picker';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { jalaliToIso } from '@/lib/date-utils';
import { cn, formatPrice } from '@/lib/utils';
import { useMyBarberProfile } from '@/services/features/barber/hooks';
import { useAvailableSlots } from '@/services/features/booking/hooks';
import { useCreateManualBooking } from '@/services/features/club/hooks';
import type { ClubCustomer } from '@/services/features/club/types';
import { useMyServices } from '@/services/features/services/hooks';

interface ManualBookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: ClubCustomer | null;
}

const schema = z.object({
  serviceId: z.string().min(1, 'انتخاب خدمت الزامی است'),
  date: z.string().min(1, 'انتخاب تاریخ الزامی است'),
  time: z.string().min(1, 'انتخاب ساعت الزامی است'),
  note: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export function ManualBookingDialog({
  open,
  onOpenChange,
  customer,
}: ManualBookingDialogProps) {
  const methods = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { serviceId: '', date: '', time: '', note: '' },
  });

  const { control, reset, setValue } = methods;
  const serviceId = useWatch({ control, name: 'serviceId' });
  const jalaliDate = useWatch({ control, name: 'date' });
  const time = useWatch({ control, name: 'time' });

  const { data: services, isLoading: servicesLoading } = useMyServices();
  const { data: barberProfile } = useMyBarberProfile();
  const createManualBooking = useCreateManualBooking();

  const barberId = barberProfile?.data?.id ? String(barberProfile.data.id) : '';
  const isoDate = jalaliToIso(jalaliDate) ?? '';

  const { data: slotsResponse, isLoading: slotsLoading } = useAvailableSlots(
    barberId,
    isoDate,
    serviceId,
  );

  const slots = slotsResponse?.data?.slots ?? [];

  // با تغییر خدمت یا تاریخ، ساعت انتخاب‌شده پاک شود
  useEffect(() => {
    setValue('time', '');
  }, [serviceId, isoDate, setValue]);

  // ریست فرم هنگام باز شدن برای مشتری جدید
  useEffect(() => {
    if (open) {
      reset({ serviceId: '', date: '', time: '', note: '' });
    }
  }, [open, customer?.id, reset]);

  const handleSlotSelect = (slot: string) => {
    setValue('time', slot, { shouldValidate: true });
  };

  const onSubmit = async (values: FormValues) => {
    if (!customer) return;

    try {
      await createManualBooking.mutateAsync({
        clubCustomerId: customer.id,
        serviceId: values.serviceId,
        date: jalaliToIso(values.date) ?? values.date,
        time: values.time,
        note: values.note?.trim() || undefined,
      });
      onOpenChange(false);
    } catch {
      // خطا در هوک نمایش داده می‌شود
    }
  };

  const customerName = customer
    ? `${customer.firstName} ${customer.lastName}`
    : '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-3xl max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock size={18} className="text-primary-600" />
            ثبت نوبت دستی
          </DialogTitle>
          <DialogDescription>
            {customerName
              ? `ثبت نوبت برای «${customerName}»`
              : 'ثبت نوبت برای مشتری باشگاه'}
          </DialogDescription>
        </DialogHeader>

        <FormProvider
          methods={methods}
          onSubmit={onSubmit}
          className="space-y-4"
        >
          {/* خدمت */}
          <div className="space-y-2">
            <span className="block text-sm font-medium text-gray-700">
              خدمت
            </span>
            {servicesLoading ? (
              <Skeleton className="h-9 w-full" />
            ) : (
              <Select
                value={serviceId}
                onValueChange={value =>
                  setValue('serviceId', value, { shouldValidate: true })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="انتخاب خدمت" />
                </SelectTrigger>
                <SelectContent>
                  {services?.data?.map(service => (
                    <SelectItem key={service.id} value={service.id}>
                      {service.name} — {formatPrice(service.price)} تومان
                      {service.durationMinutes
                        ? ` (${service.durationMinutes} دقیقه)`
                        : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {methods.formState.errors.serviceId && (
              <p className="text-xs text-red-600">
                {methods.formState.errors.serviceId.message}
              </p>
            )}
          </div>

          {/* تاریخ */}
          <div className="space-y-2">
            <PersianDatePicker
              name="date"
              label="تاریخ نوبت"
              placeholder="انتخاب تاریخ"
              required
            />
            {methods.formState.errors.date && (
              <p className="text-xs text-red-600">
                {methods.formState.errors.date.message}
              </p>
            )}
          </div>

          {/* ساعت‌های خالی */}
          <div className="space-y-2">
            <span className="block text-sm font-medium text-gray-700">
              ساعت
            </span>

            {!serviceId || !isoDate ? (
              <p className="text-xs text-gray-400">
                برای نمایش زمان‌های خالی، ابتدا خدمت و تاریخ را انتخاب کنید.
              </p>
            ) : slotsLoading ? (
              <div className="grid grid-cols-4 gap-2">
                {Array.from({ length: 8 }).map((_, index) => (
                  <Skeleton key={index} className="h-9 rounded-lg" />
                ))}
              </div>
            ) : slots.length === 0 ? (
              <p className="text-xs text-gray-400">
                زمان خالی برای این روز وجود ندارد.
              </p>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {slots.map(slot => (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => handleSlotSelect(slot)}
                    className={cn(
                      'h-9 rounded-lg border text-xs font-medium transition-colors',
                      time === slot
                        ? 'bg-primary-600 border-primary-600 text-white'
                        : 'bg-white border-gray-200 text-gray-600 hover:border-primary-300 hover:text-primary-700',
                    )}
                  >
                    {slot}
                  </button>
                ))}
              </div>
            )}
            {methods.formState.errors.time && (
              <p className="text-xs text-red-600">
                {methods.formState.errors.time.message}
              </p>
            )}
          </div>

          {/* یادداشت */}
          <div className="space-y-2">
            <span className="block text-sm font-medium text-gray-700">
              یادداشت (اختیاری)
            </span>
            <Textarea
              {...methods.register('note')}
              rows={3}
              placeholder="توضیحی برای این نوبت..."
              className="rounded-xl"
            />
          </div>

          <div className="flex gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
              disabled={createManualBooking.isPending}
            >
              انصراف
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={createManualBooking.isPending}
            >
              {createManualBooking.isPending ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                'ثبت نوبت'
              )}
            </Button>
          </div>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}
