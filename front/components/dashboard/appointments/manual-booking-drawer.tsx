'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import {
  BellRing,
  CalendarClock,
  Check,
  Loader2,
  Lock,
  NotebookPen,
  Search,
  UserPlus,
  UserRound,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import * as z from 'zod';

import FormProvider from '@/components/form/form-provider';
import { PersianDatePicker } from '@/components/form/persian-date-picker';
import RHFInput from '@/components/form/rhf-input';
import RHFPhoneInput from '@/components/form/rhf-phone-input';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useDebounce } from '@/hooks/use-debounce';
import { jalaliToIso } from '@/lib/date-utils';
import { gregorianToJalali } from '@/lib/jalali';
import { normalizePhone } from '@/lib/phone';
import { cn, formatPrice, toPersianDigits } from '@/lib/utils';
import { useMyBarberProfile } from '@/services/features/barber/hooks';
import { useAvailableSlots } from '@/services/features/booking/hooks';
import { getClubCustomers } from '@/services/features/club/api';
import {
  useAddClubCustomer,
  useCreateManualBooking,
} from '@/services/features/club/hooks';
import type {
  ClubCustomer,
  ClubCustomerQuery,
} from '@/services/features/club/types';
import { useMyServices } from '@/services/features/services/hooks';
import { useCurrentUserSubscription } from '@/services/features/subscription/hooks';

const DEFAULT_VALUES: FormValues = {
  customerMode: 'existing',
  existingCustomerId: '',
  firstName: '',
  lastName: '',
  phone: '',
  serviceId: '',
  date: '',
  time: '',
  barberNote: '',
  customerNote: '',
  sendDepositLink: false,
  sendSmsReminder: false,
  reminderHours: null,
};

/** گزینه‌های «چند ساعت قبل» برای پیامک یادآوری */
const REMINDER_HOUR_CHOICES = [
  { value: 1, label: '۱ ساعت قبل' },
  { value: 2, label: '۲ ساعت قبل' },
  { value: 4, label: '۴ ساعت قبل' },
  { value: 6, label: '۶ ساعت قبل' },
  { value: 12, label: '۱۲ ساعت قبل' },
  { value: 24, label: '۱ روز قبل' },
];

const schema = z
  .object({
    customerMode: z.enum(['existing', 'new']),
    existingCustomerId: z.string().optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    phone: z.string().optional(),
    serviceId: z.string().min(1, 'انتخاب خدمت الزامی است'),
    date: z.string().min(1, 'انتخاب تاریخ الزامی است'),
    time: z.string().min(1, 'انتخاب ساعت الزامی است'),
    barberNote: z.string().optional(),
    customerNote: z.string().optional(),
    sendDepositLink: z.boolean(),
    sendSmsReminder: z.boolean(),
    reminderHours: z.number().nullable().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.customerMode === 'existing') {
      if (!data.existingCustomerId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['existingCustomerId'],
          message: 'انتخاب مشتری الزامی است',
        });
      }
    } else {
      if (!data.firstName?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['firstName'],
          message: 'نام الزامی است',
        });
      }
      if (!data.lastName?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['lastName'],
          message: 'نام خانوادگی الزامی است',
        });
      }
      if (!data.phone?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['phone'],
          message: 'شماره موبایل الزامی است',
        });
      } else if (!/^09\d{9}$/.test(normalizePhone(data.phone))) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['phone'],
          message: 'شماره موبایل معتبر نیست',
        });
      }
    }

    if (data.sendSmsReminder && !data.reminderHours) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['reminderHours'],
        message: 'زمان ارسال یادآوری را انتخاب کنید',
      });
    }
  });

function dateToJalaliString(d: Date): string {
  const { jy, jm, jd } = gregorianToJalali(d);

  return `${jy}/${String(jm).padStart(2, '0')}/${String(jd).padStart(2, '0')}`;
}

type FormValues = z.input<typeof schema>;

type FormOutput = z.output<typeof schema>;

interface ManualBookingDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ManualBookingDrawer({
  open,
  onOpenChange,
}: ManualBookingDrawerProps) {
  const [customerSearch, setCustomerSearch] = useState('');
  const debouncedSearch = useDebounce(customerSearch, 400);

  const methods = useForm<FormValues, any, FormOutput>({
    resolver: zodResolver(schema),
    defaultValues: DEFAULT_VALUES,
  });

  const {
    control,
    reset,
    setValue,
    handleSubmit,
    formState: { errors },
  } = methods;

  const customerMode = useWatch({ control, name: 'customerMode' });
  const existingCustomerId = useWatch({ control, name: 'existingCustomerId' });
  const serviceId = useWatch({ control, name: 'serviceId' });
  const jalaliDate = useWatch({ control, name: 'date' });
  const time = useWatch({ control, name: 'time' });
  const sendDepositLink = useWatch({ control, name: 'sendDepositLink' });
  const sendSmsReminder = useWatch({ control, name: 'sendSmsReminder' });
  const reminderHours = useWatch({ control, name: 'reminderHours' });

  // وضعیت اشتراک آرایشگر (برای قوانین پیامک یادآوری)
  const { data: subscriptionData } = useCurrentUserSubscription();

  const subscription = subscriptionData?.data;

  const smsRemaining = subscription
    ? Math.max(0, subscription.smsTotal - subscription.smsUsed)
    : 0;

  const smsEligible = !!subscription && smsRemaining > 0;

  // بدون اشتراک فعال، ارسال لینک بیعانه اجباری است
  const effectiveDepositLink = smsEligible ? sendDepositLink : true;

  const { data: services, isLoading: servicesLoading } = useMyServices();
  const { data: barberProfile } = useMyBarberProfile();
  const addCustomer = useAddClubCustomer();
  const createManualBooking = useCreateManualBooking();

  const barberId = barberProfile?.data?.id ? String(barberProfile.data.id) : '';
  const isoDate = jalaliToIso(jalaliDate) ?? '';

  const { data: slotsResponse, isLoading: slotsLoading } = useAvailableSlots(
    barberId,
    isoDate,
    serviceId ? [serviceId] : [],
  );
  const slots = slotsResponse?.data?.slots ?? [];

  const hasSearchQuery = debouncedSearch.trim().length > 0;

  // جستجوی مشتریان — فقط موقع تایپ درخواست می‌زنیم (بدون لیست پیش‌فرض شلوغ)
  const clubQuery = useMemo<ClubCustomerQuery>(
    () => ({
      page: 1,
      limit: 6,
      ...(hasSearchQuery ? { search: debouncedSearch.trim() } : {}),
    }),
    [debouncedSearch, hasSearchQuery],
  );

  const {
    data: customersData,
    isLoading: customersLoading,
    isFetching: customersFetching,
  } = useQuery({
    queryKey: ['club-customers', 'manual-booking-search', clubQuery],
    queryFn: () => getClubCustomers(clubQuery),
    enabled: open && hasSearchQuery,
    staleTime: 30 * 1000,
  });

  const customerResults = useMemo<ClubCustomer[]>(
    () => customersData?.data ?? [],
    [customersData],
  );

  const selectedCustomer = useMemo(
    () => customerResults.find(c => c.id === existingCustomerId) ?? null,
    [customerResults, existingCustomerId],
  );

  // تاریخ‌های سریع امروز / فردا
  const quickDates = useMemo(() => {
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);

    return [
      {
        label: 'امروز',
        jalali: dateToJalaliString(today),
      },
      {
        label: 'فردا',
        jalali: dateToJalaliString(tomorrow),
      },
    ];
  }, []);

  // ریست ساعت وقتی خدمت یا تاریخ عوض شد
  useEffect(() => {
    setValue('time', '');
  }, [serviceId, isoDate, setValue]);

  const handleSelectCustomer = (customer: ClubCustomer) => {
    setValue('existingCustomerId', customer.id, { shouldValidate: true });
    setCustomerSearch('');
  };

  // ریست فرم موقع بسته شدن (فروم همیشه تمیز باز می‌شود)
  const handleOpenChange = (next: boolean) => {
    if (!next) {
      reset(DEFAULT_VALUES);
      setCustomerSearch('');
    }

    onOpenChange(next);
  };

  const onSubmit = async (values: FormOutput) => {
    try {
      let clubCustomerId = values.existingCustomerId;

      if (values.customerMode === 'new') {
        const newCustomer = await addCustomer.mutateAsync({
          firstName: values.firstName!.trim(),
          lastName: values.lastName!.trim(),
          phone: normalizePhone(values.phone!),
        });
        clubCustomerId = newCustomer.id;
      }

      if (!clubCustomerId) return;

      // قوانین: بدون اشتراک فعال، لینک بیعانه الزامی و یادآوری غیرفعال است
      const deposit = smsEligible ? values.sendDepositLink : true;
      const reminder = smsEligible ? values.sendSmsReminder : false;

      await createManualBooking.mutateAsync({
        clubCustomerId,
        serviceId: values.serviceId,
        date: jalaliToIso(values.date) ?? values.date,
        time: values.time,
        barberNote: values.barberNote?.trim() || undefined,
        customerNote: values.customerNote?.trim() || undefined,
        sendDepositLink: deposit,
        sendSmsReminder: reminder,
        reminderHours:
          reminder && values.reminderHours ? values.reminderHours : undefined,
      });

      onOpenChange(false);
    } catch {
      // خطاها در هوک‌ها مدیریت می‌شوند
    }
  };

  const isSubmitting = addCustomer.isPending || createManualBooking.isPending;

  return (
    <Drawer open={open} onOpenChange={handleOpenChange}>
      <DrawerContent
        dir="rtl"
        className="mx-auto flex h-[92dvh] w-full max-w-lg flex-col gap-0 rounded-t-[28px] p-0 sm:inset-x-auto sm:inset-y-0 sm:left-0 sm:right-auto sm:h-full sm:max-h-full sm:w-[440px] sm:max-w-[440px] sm:translate-y-0 sm:rounded-none sm:border-e"
      >
        {/* هدر */}
        <DrawerHeader className="border-b border-gray-100 p-5 pb-4">
          <DrawerTitle className="flex items-center gap-2.5 text-base">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-2 text-primary">
              <CalendarClock size={18} />
            </div>
            ثبت نوبت دستی
          </DrawerTitle>

          <DrawerDescription className="text-right text-xs leading-5">
            نوبت را برای مشتری قبلی انتخاب کنید یا مشتری جدید بسازید؛ مشتری جدید
            به باشگاه مشتریان اضافه می‌شود.
          </DrawerDescription>
        </DrawerHeader>

        <FormProvider
          methods={methods}
          onSubmit={handleSubmit(onSubmit)}
          className="flex min-h-0 flex-1 flex-col"
        >
          {/* بدنه */}
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5 scrollbar-thin">
            {/* تب مشتری */}
            <div className="grid grid-cols-2 gap-1 rounded-2xl bg-gray-100 p-1">
              <button
                type="button"
                onClick={() =>
                  setValue('customerMode', 'existing', { shouldValidate: true })
                }
                className={cn(
                  'flex h-10 items-center justify-center gap-1.5 rounded-xl text-xs font-bold transition',
                  customerMode === 'existing'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700',
                )}
              >
                <Users size={15} />
                مشتری قبلی
              </button>

              <button
                type="button"
                onClick={() =>
                  setValue('customerMode', 'new', { shouldValidate: true })
                }
                className={cn(
                  'flex h-10 items-center justify-center gap-1.5 rounded-xl text-xs font-bold transition',
                  customerMode === 'new'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700',
                )}
              >
                <UserPlus size={15} />
                مشتری جدید
              </button>
            </div>

            {/* مشتری قبلی: جستجو با نتایج بازشو */}
            {customerMode === 'existing' ? (
              <div className="space-y-2">
                {selectedCustomer ? (
                  // مشتری انتخاب‌شده
                  <div className="flex items-center gap-2.5 rounded-2xl border border-primary-2 bg-primary-3 p-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-black text-white">
                      {selectedCustomer.firstName.charAt(0)}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-black text-gray-900">
                        {selectedCustomer.firstName} {selectedCustomer.lastName}
                      </p>

                      <p
                        className="mt-0.5 text-[11px] font-medium text-gray-400"
                        dir="ltr"
                      >
                        {toPersianDigits(selectedCustomer.phone)}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setValue('existingCustomerId', '')}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
                      aria-label="حذف انتخاب"
                    >
                      <X size={15} />
                    </button>
                  </div>
                ) : (
                  // جستجو
                  <div className="relative">
                    <Search
                      size={16}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                    />

                    <Input
                      value={customerSearch}
                      onChange={e => setCustomerSearch(e.target.value)}
                      placeholder="جستجوی نام یا شماره مشتری..."
                      className="h-11 rounded-xl pr-10"
                    />

                    {/* نتایج بازشو — فقط موقع جستجو */}
                    {hasSearchQuery && (
                      <div className="absolute inset-x-0 top-full z-20 mt-2 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.12)]">
                        {customersLoading || customersFetching ? (
                          <div className="flex items-center justify-center gap-2 p-4 text-xs text-gray-400">
                            <Loader2 size={14} className="animate-spin" />
                            در حال جستجو...
                          </div>
                        ) : customerResults.length === 0 ? (
                          <div className="p-4 text-center">
                            <p className="text-xs font-bold text-gray-500">
                              مشتری‌ای پیدا نشد
                            </p>

                            <button
                              type="button"
                              onClick={() =>
                                setValue('customerMode', 'new', {
                                  shouldValidate: true,
                                })
                              }
                              className="mt-2 inline-flex items-center gap-1 text-[11px] font-black text-primary hover:underline"
                            >
                              <UserPlus size={13} />
                              افزودن به‌عنوان مشتری جدید
                            </button>
                          </div>
                        ) : (
                          <ul className="max-h-56 divide-y divide-gray-50 overflow-y-auto scrollbar-thin">
                            {customerResults.map(customer => (
                              <li key={customer.id}>
                                <button
                                  type="button"
                                  onClick={() => handleSelectCustomer(customer)}
                                  className="flex w-full items-center gap-2.5 p-3 text-right transition hover:bg-primary-3"
                                >
                                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-2 text-[11px] font-black text-primary">
                                    {customer.firstName.charAt(0)}
                                  </div>

                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-xs font-black text-gray-900">
                                      {customer.firstName} {customer.lastName}
                                    </p>

                                    <p
                                      className="mt-0.5 text-[10px] font-medium text-gray-400"
                                      dir="ltr"
                                    >
                                      {toPersianDigits(customer.phone)}
                                    </p>
                                  </div>

                                  <Check
                                    size={15}
                                    className="shrink-0 text-primary"
                                  />
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {errors.existingCustomerId && (
                  <p className="text-[11px] text-red-600">
                    {errors.existingCustomerId.message}
                  </p>
                )}

                {!selectedCustomer && !hasSearchQuery && (
                  <p className="text-[11px] leading-5 text-gray-400">
                    نام یا شماره مشتری را بنویسید تا از لیست باشگاه مشتریان پیدا
                    شود.
                  </p>
                )}
              </div>
            ) : (
              // مشتری جدید
              <div className="space-y-3.5 rounded-2xl border border-gray-100 bg-gray-50/60 p-4">
                <p className="flex items-center gap-1.5 text-xs font-black text-gray-800">
                  <UserRound size={15} className="text-primary" />
                  اطلاعات مشتری جدید
                  <span className="font-medium text-gray-400">
                    (به باشگاه اضافه می‌شود)
                  </span>
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <RHFInput name="firstName" label="نام" placeholder="علی" />

                  <RHFInput
                    name="lastName"
                    label="نام خانوادگی"
                    placeholder="رضایی"
                  />
                </div>

                <RHFPhoneInput
                  name="phone"
                  label="شماره موبایل"
                  placeholder="۰۹۱۲۳۴۵۶۷۸۹"
                />
              </div>
            )}

            {/* خدمت */}
            <div className="space-y-2">
              <span className="block text-xs font-black text-gray-700">
                خدمت
              </span>

              {servicesLoading ? (
                <Skeleton className="h-11 w-full rounded-xl" />
              ) : (
                <Select
                  value={serviceId}
                  onValueChange={v =>
                    setValue('serviceId', v, { shouldValidate: true })
                  }
                >
                  <SelectTrigger className="h-11 w-full rounded-xl">
                    <SelectValue placeholder="انتخاب خدمت" />
                  </SelectTrigger>

                  <SelectContent>
                    {services?.data?.map(s => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name} — {formatPrice(s.price)} تومان
                        {s.durationMinutes
                          ? ` (${toPersianDigits(s.durationMinutes)} دقیقه)`
                          : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {errors.serviceId && (
                <p className="text-[11px] text-red-600">
                  {errors.serviceId.message}
                </p>
              )}
            </div>

            {/* تاریخ */}
            <div className="space-y-2">
              <span className="block text-xs font-black text-gray-700">
                تاریخ
              </span>

              <div className="flex items-start gap-2">
                <PersianDatePicker
                  name="date"
                  placeholder="انتخاب تاریخ"
                  className="flex-1"
                />

                <div className="flex shrink-0 gap-1.5 pt-0.5">
                  {quickDates.map(day => (
                    <button
                      key={day.label}
                      type="button"
                      onClick={() =>
                        setValue('date', day.jalali, { shouldValidate: true })
                      }
                      className={cn(
                        'h-11 rounded-xl border px-3 text-[11px] font-black transition',
                        jalaliDate === day.jalali
                          ? 'border-primary bg-primary-2 text-primary'
                          : 'border-gray-200 bg-white text-gray-500 hover:border-primary/40 hover:text-primary',
                      )}
                    >
                      {day.label}
                    </button>
                  ))}
                </div>
              </div>

              {errors.date && (
                <p className="text-[11px] text-red-600">
                  {errors.date.message}
                </p>
              )}
            </div>

            {/* ساعت */}
            <div className="space-y-2">
              <span className="block text-xs font-black text-gray-700">
                ساعت
              </span>

              {!serviceId || !isoDate ? (
                <p className="rounded-xl border border-dashed border-gray-200 bg-gray-50/60 p-3 text-center text-[11px] text-gray-400">
                  برای نمایش ساعت‌های خالی، ابتدا خدمت و تاریخ را انتخاب کنید.
                </p>
              ) : slotsLoading ? (
                <div className="grid grid-cols-4 gap-2">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 rounded-lg" />
                  ))}
                </div>
              ) : slots.length === 0 ? (
                <p className="rounded-xl border border-dashed border-gray-200 bg-gray-50/60 p-3 text-center text-[11px] text-gray-400">
                  ساعت خالی برای این روز وجود ندارد.
                </p>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {slots.map(slot => (
                    <button
                      key={slot}
                      type="button"
                      onClick={() =>
                        setValue('time', slot, { shouldValidate: true })
                      }
                      className={cn(
                        'h-10 rounded-lg border text-xs font-black transition',
                        time === slot
                          ? 'border-primary bg-primary text-white'
                          : 'border-gray-200 bg-white text-gray-600 hover:border-primary/40 hover:text-primary',
                      )}
                    >
                      {toPersianDigits(slot)}
                    </button>
                  ))}
                </div>
              )}

              {errors.time && (
                <p className="text-[11px] text-red-600">
                  {errors.time.message}
                </p>
              )}
            </div>

            {/* یادداشت‌ها */}
            <div className="space-y-2.5">
              <Textarea
                {...methods.register('barberNote')}
                rows={2}
                placeholder="یادداشت برای خودم (خصوصی) — مثلاً رنگ مورد استفاده..."
                className="rounded-xl text-xs"
              />

              <Textarea
                {...methods.register('customerNote')}
                rows={2}
                placeholder="یادداشت برای مشتری — مثلاً موهایت کوتاه نشود..."
                className="rounded-xl text-xs"
              />

              <p className="flex items-center gap-1.5 text-[10px] font-medium text-gray-400">
                <NotebookPen size={12} />
                یادداشت خصوصی فقط در پنل خودت دیده می‌شود.
              </p>
            </div>

            {/* لینک بیعانه + پیامک یادآوری */}
            <div className="divide-y divide-gray-100 rounded-2xl border border-gray-100 bg-gray-50/60 p-4">
              {/* ارسال لینک بیعانه */}
              <div className="flex items-center justify-between gap-3 pb-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-2/60 text-primary">
                    <Wallet size={15} />
                  </div>

                  <div className="min-w-0">
                    <p className="text-xs font-black text-gray-900">
                      ارسال لینک بیعانه
                    </p>

                    <p className="mt-0.5 text-[10px] font-medium text-gray-400">
                      لینک پرداخت بیعانه برای مشتری ارسال می‌شود
                    </p>
                  </div>
                </div>

                <Switch
                  checked={effectiveDepositLink}
                  disabled={!smsEligible || isSubmitting}
                  onCheckedChange={v => setValue('sendDepositLink', v)}
                />
              </div>

              {/* پیامک یادآوری */}
              <div className="flex items-center justify-between gap-3 py-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-2/60 text-primary">
                    <BellRing size={15} />
                  </div>

                  <div className="min-w-0">
                    <p className="text-xs font-black text-gray-900">
                      پیامک یادآوری
                    </p>

                    <p className="mt-0.5 text-[10px] font-medium text-gray-400">
                      چند ساعت قبل از نوبت به مشتری پیامک می‌شود
                    </p>
                  </div>
                </div>

                <Switch
                  checked={smsEligible && sendSmsReminder}
                  disabled={!smsEligible || isSubmitting}
                  onCheckedChange={v => {
                    setValue('sendSmsReminder', v);

                    if (!v) setValue('reminderHours', null);
                  }}
                />
              </div>

              {/* انتخاب ساعت یادآوری */}
              {smsEligible && sendSmsReminder && (
                <div className="space-y-2.5 py-3">
                  <p className="text-[11px] font-black text-gray-600">
                    یادآوری چند ساعت قبل ارسال شود؟
                  </p>

                  <div className="grid grid-cols-3 gap-2">
                    {REMINDER_HOUR_CHOICES.map(choice => (
                      <button
                        key={choice.value}
                        type="button"
                        onClick={() =>
                          setValue('reminderHours', choice.value, {
                            shouldValidate: true,
                          })
                        }
                        className={cn(
                          'h-9 rounded-lg border text-[11px] font-black transition',
                          reminderHours === choice.value
                            ? 'border-primary bg-primary-2 text-primary'
                            : 'border-gray-200 bg-white text-gray-500 hover:border-primary/40 hover:text-primary',
                        )}
                      >
                        {choice.label}
                      </button>
                    ))}
                  </div>

                  {errors.reminderHours && (
                    <p className="text-[11px] text-red-600">
                      {errors.reminderHours.message}
                    </p>
                  )}
                </div>
              )}

              {/* هشدار بدون اشتراک */}
              {!smsEligible && (
                <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
                  <Lock size={14} className="mt-0.5 shrink-0 text-amber-500" />

                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-black leading-5 text-amber-700">
                      برای ارسال پیامک یادآوری به اشتراک فعال و اعتبار پیامک
                      نیاز داری.
                    </p>

                    <p className="mt-1 text-[10px] font-medium leading-5 text-amber-600">
                      به همین دلیل ارسال لینک بیعانه برای این نوبت الزامی شد.
                    </p>

                    <Link
                      href="/dashboard/subscription"
                      onClick={() => handleOpenChange(false)}
                      className="mt-1.5 inline-block text-[10px] font-black text-amber-800 underline underline-offset-2"
                    >
                      مشاهده و خرید پلن اشتراک
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* فوتر */}
          <div className="border-t border-gray-100 bg-white p-4">
            <Button
              type="submit"
              className="h-11 w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  در حال ثبت نوبت...
                </>
              ) : (
                'ثبت نوبت'
              )}
            </Button>
          </div>
        </FormProvider>
      </DrawerContent>
    </Drawer>
  );
}
