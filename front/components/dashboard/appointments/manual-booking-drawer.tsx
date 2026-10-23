'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import {
  BellRing,
  CalendarClock,
  Check,
  Clock,
  Loader2,
  Lock,
  NotebookPen,
  ReceiptText,
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
import { toast } from 'sonner';
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
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { DEPOSIT_PAYMENT_TIMEOUT_HOURS } from '@/constants/booking';
import { useDebounce } from '@/hooks/use-debounce';
import { jalaliToIso } from '@/lib/date-utils';
import { gregorianToJalali } from '@/lib/jalali';
import { computeOrderPricing } from '@/lib/order-pricing';
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
import { usePaymentConfig } from '@/services/features/settings/hooks';
import { useCurrentUserSubscription } from '@/services/features/subscription/hooks';

import { NOT_APPROVED_MESSAGE, NotApprovedAlert } from './not-approved-alert';

const SMS_CREDIT_COST_PER_TEMPLATE = 2;

const DEFAULT_VALUES: FormValues = {
  customerMode: 'existing',
  existingCustomerId: '',
  fullName: '',
  phone: '',
  serviceIds: [],
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
    fullName: z.string().optional(),
    phone: z.string().optional(),
    serviceIds: z.array(z.string()).min(1, 'حداقل یک خدمت انتخاب کنید'),
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
      if (!data.fullName?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['fullName'],
          message: 'نام و نام خانوادگی الزامی است',
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
  fixedCustomer?: ClubCustomer | null;
}

export function ManualBookingDrawer({
  open,
  onOpenChange,
  fixedCustomer = null,
}: ManualBookingDrawerProps) {
  const [customerSearch, setCustomerSearch] = useState('');
  const [pickedCustomer, setPickedCustomer] = useState<ClubCustomer | null>(
    fixedCustomer,
  );
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
  const watchedServiceIds = useWatch({ control, name: 'serviceIds' });
  const serviceIds = useMemo(
    () => watchedServiceIds ?? [],
    [watchedServiceIds],
  );
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

  const smsEligible =
    !!subscription && smsRemaining >= SMS_CREDIT_COST_PER_TEMPLATE;

  // بدون اشتراک فعال، ارسال لینک بیعانه اجباری است
  const effectiveDepositLink = smsEligible ? sendDepositLink : true;
  const reminderSmsCost = effectiveDepositLink
    ? SMS_CREDIT_COST_PER_TEMPLATE
    : SMS_CREDIT_COST_PER_TEMPLATE * 2;
  const canSendSmsReminder = !!subscription && smsRemaining >= reminderSmsCost;

  const { data: services, isLoading: servicesLoading } = useMyServices();

  const { data: paymentConfig } = usePaymentConfig();
  const commissionPercent = paymentConfig?.commissionPercent ?? 10;

  const selectedServices = useMemo(() => {
    const list = services?.data ?? [];
    return serviceIds
      .map(id => list.find(item => item.id === id))
      .filter((item): item is NonNullable<typeof item> => Boolean(item));
  }, [services?.data, serviceIds]);

  const totalDurationMinutes = useMemo(
    () =>
      selectedServices.reduce(
        (sum, item) => sum + (item.durationMinutes ?? 0),
        0,
      ),
    [selectedServices],
  );

  const invoicePreview = useMemo(() => {
    if (!selectedServices.length) return null;
    const computed = computeOrderPricing(selectedServices, {
      commissionPercent,
    });
    if (computed.depositAmount <= 0) return null;
    return computed;
  }, [selectedServices, commissionPercent]);

  const { data: barberProfile } = useMyBarberProfile();
  const addCustomer = useAddClubCustomer();
  const createManualBooking = useCreateManualBooking();

  const barberId = barberProfile?.data?.id ? String(barberProfile.data.id) : '';
  const isNotApproved = !!barberProfile?.data && !barberProfile.data.isApproved;
  const isoDate = jalaliToIso(jalaliDate) ?? '';

  const {
    data: slotsResponse,
    isLoading: slotsLoading,
    isFetching: slotsFetching,
  } = useAvailableSlots(barberId, isoDate, serviceIds);
  const slots = slotsResponse?.data?.slots ?? [];

  const hasSearchQuery = debouncedSearch.trim().length > 0;

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

  const selectedCustomer = fixedCustomer ?? pickedCustomer;

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

  useEffect(() => {
    if (!open) return;

    reset({
      ...DEFAULT_VALUES,
      existingCustomerId: fixedCustomer?.id ?? '',
    });
  }, [open, fixedCustomer?.id, reset]);

  const serviceIdsKey = serviceIds.join(',');

  // ریست ساعت وقتی خدمات یا تاریخ عوض شد
  useEffect(() => {
    setValue('time', '');
  }, [serviceIdsKey, isoDate, setValue]);

  const toggleService = (id: string) => {
    const next = serviceIds.includes(id)
      ? serviceIds.filter(item => item !== id)
      : [...serviceIds, id];
    setValue('serviceIds', next, { shouldValidate: true });
  };

  const handleSelectCustomer = (customer: ClubCustomer) => {
    setPickedCustomer(customer);
    setValue('existingCustomerId', customer.id, { shouldValidate: true });
    setCustomerSearch('');
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      reset(DEFAULT_VALUES);
      setPickedCustomer(null);
      setCustomerSearch('');
    }

    onOpenChange(next);
  };

  const onSubmit = async (values: FormOutput) => {
    if (isNotApproved) {
      toast.error(NOT_APPROVED_MESSAGE);
      return;
    }

    if (slotsFetching || !slots.includes(values.time)) {
      toast.error('این ساعت دیگر در دسترس نیست؛ لطفاً ساعت دیگری انتخاب کنید.');
      return;
    }

    try {
      let clubCustomerId = values.existingCustomerId;

      if (values.customerMode === 'new') {
        const newCustomer = await addCustomer.mutateAsync({
          fullName: values.fullName!.trim(),
          phone: normalizePhone(values.phone!),
        });
        clubCustomerId = newCustomer.id;
      }

      if (!clubCustomerId) return;

      const deposit = smsEligible ? values.sendDepositLink : true;
      const reminder = canSendSmsReminder ? values.sendSmsReminder : false;

      await createManualBooking.mutateAsync({
        clubCustomerId,
        serviceId: values.serviceIds[0],
        serviceIds: values.serviceIds,
        date: jalaliToIso(values.date) ?? values.date,
        time: values.time,
        barberNote: values.barberNote?.trim() || undefined,
        customerNote: values.customerNote?.trim() || undefined,
        sendDepositLink: deposit,
        sendSmsReminder: reminder,
        reminderHours:
          reminder && values.reminderHours ? values.reminderHours : undefined,
      });

      setPickedCustomer(null);
      setCustomerSearch('');

      onOpenChange(false);
    } catch {
      // خطاها در هوک‌ها مدیریت می‌شوند
    }
  };

  const isSubmitting = addCustomer.isPending || createManualBooking.isPending;

  const handleDepositLinkChange = (enabled: boolean) => {
    setValue('sendDepositLink', enabled);

    if (enabled && sendSmsReminder && !smsEligible) {
      setValue('sendSmsReminder', false);
      setValue('reminderHours', null);
    }

    if (
      !enabled &&
      sendSmsReminder &&
      smsRemaining < SMS_CREDIT_COST_PER_TEMPLATE * 2
    ) {
      setValue('sendSmsReminder', false);
      setValue('reminderHours', null);
      toast.error(
        'برای ارسال پیامک تأیید و یادآوری با هم، حداقل ۴ اعتبار لازم است؛ یادآوری غیرفعال شد.',
      );
    }
  };

  return (
    <Drawer open={open} onOpenChange={handleOpenChange}>
      <DrawerContent dir="rtl">
        {/* هدر */}
        <DrawerHeader className="border-b border-gray-100 p-5 pb-4">
          <DrawerTitle className="flex items-center gap-2.5 text-base">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-2 text-primary">
              <CalendarClock size={18} />
            </div>
            ثبت نوبت دستی
          </DrawerTitle>

          <DrawerDescription className="text-right text-xs leading-5">
            {fixedCustomer
              ? `ثبت نوبت دستی برای ${fixedCustomer.fullName}`
              : 'یک یا چند خدمت را انتخاب کنید؛ در حالت لینک بیعانه یک صورت‌حساب واحد برای مشتری ارسال می‌شود.'}
          </DrawerDescription>
        </DrawerHeader>

        <FormProvider
          methods={methods}
          onSubmit={handleSubmit(onSubmit)}
          className="flex min-h-0 flex-1 flex-col"
        >
          {/* بدنه */}
          <div className="min-h-0 flex-1 space-y-5 overflow-x-hidden overflow-y-auto overscroll-contain touch-pan-y p-5 scrollbar-thin">
            {isNotApproved && (
              <NotApprovedAlert onNavigate={() => handleOpenChange(false)} />
            )}
            {fixedCustomer ? (
              <div className="space-y-2">
                <span className="block text-xs font-black text-gray-700">
                  مشتری
                </span>
                <div className="flex items-center gap-2.5 rounded-2xl border border-primary-2 bg-primary-3 p-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-black text-white">
                    {fixedCustomer.fullName.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-black text-gray-900">
                      {fixedCustomer.fullName}
                    </p>
                    <p
                      className="mt-0.5 text-[11px] font-medium text-gray-400"
                      dir="ltr"
                    >
                      {toPersianDigits(fixedCustomer.phone)}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* تب مشتری */}
                <div className="grid grid-cols-2 gap-1 rounded-2xl bg-gray-100 p-1">
                  <button
                    type="button"
                    onClick={() =>
                      setValue('customerMode', 'existing', {
                        shouldValidate: true,
                      })
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
                      <div className="flex items-center gap-2.5 rounded-2xl border border-primary-2 bg-primary-3 p-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-black text-white">
                          {selectedCustomer.fullName.charAt(0)}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-black text-gray-900">
                            {selectedCustomer.fullName}
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
                          onClick={() => {
                            setPickedCustomer(null);
                            setValue('existingCustomerId', '');
                          }}
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
                          aria-label="حذف انتخاب"
                        >
                          <X size={15} />
                        </button>
                      </div>
                    ) : (
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
                                      onClick={() =>
                                        handleSelectCustomer(customer)
                                      }
                                      className="flex w-full items-center gap-2.5 p-3 text-right transition hover:bg-primary-3"
                                    >
                                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-2 text-[11px] font-black text-primary">
                                        {customer.fullName.charAt(0)}
                                      </div>

                                      <div className="min-w-0 flex-1">
                                        <p className="truncate text-xs font-black text-gray-900">
                                          {customer.fullName}
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
                        نام یا شماره مشتری را بنویسید تا از لیست باشگاه مشتریان
                        پیدا شود.
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3.5 rounded-2xl border border-gray-100 bg-gray-50/60 p-4">
                    <p className="flex items-center gap-1.5 text-xs font-black text-gray-800">
                      <UserRound size={15} className="text-primary" />
                      اطلاعات مشتری جدید
                      <span className="font-medium text-gray-400">
                        (به باشگاه اضافه می‌شود)
                      </span>
                    </p>

                    <RHFInput
                      name="fullName"
                      label="نام و نام خانوادگی"
                      placeholder="علی رضایی"
                    />

                    <RHFPhoneInput
                      name="phone"
                      label="شماره موبایل"
                      placeholder="۰۹۱۲۳۴۵۶۷۸۹"
                    />
                  </div>
                )}
              </>
            )}

            {/* انتخاب یک یا چند خدمت */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-gray-700">
                  خدمات مورد نظر (امکان انتخاب چند خدمت)
                </span>
                {selectedServices.length > 0 && (
                  <span className="rounded-lg bg-primary-2 px-2 py-0.5 text-[10px] font-black text-primary">
                    {toPersianDigits(selectedServices.length)} خدمت •{' '}
                    {toPersianDigits(totalDurationMinutes)} دقیقه
                  </span>
                )}
              </div>

              {servicesLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-14 w-full rounded-xl" />
                  <Skeleton className="h-14 w-full rounded-xl" />
                </div>
              ) : (services?.data?.length ?? 0) === 0 ? (
                <p className="rounded-xl border border-dashed border-gray-200 bg-gray-50/60 p-3 text-center text-[11px] text-gray-400">
                  هنوز خدمتی ثبت نکرده‌اید.
                </p>
              ) : (
                <div className="max-h-60 space-y-2 overflow-y-auto pr-0.5 scrollbar-thin">
                  {services?.data?.map(s => {
                    const checked = serviceIds.includes(s.id);
                    const hasDeposit = Number(s.depositPrice ?? 0) > 0;

                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => toggleService(s.id)}
                        className={cn(
                          'flex w-full items-center justify-between gap-2.5 rounded-2xl border p-3 text-right transition',
                          checked
                            ? 'border-primary bg-primary-3 shadow-2xs'
                            : 'border-gray-200 bg-white hover:border-primary/40',
                        )}
                      >
                        <div className="flex min-w-0 items-center gap-2.5">
                          <span
                            className={cn(
                              'flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition',
                              checked
                                ? 'border-primary bg-primary text-white'
                                : 'border-gray-300 bg-white text-transparent',
                            )}
                          >
                            <Check size={13} strokeWidth={3} />
                          </span>

                          <div className="min-w-0">
                            <p className="truncate text-xs font-black text-gray-900">
                              {s.name}
                            </p>
                            {s.durationMinutes ? (
                              <p className="mt-0.5 flex items-center gap-1 text-[10px] font-medium text-gray-400">
                                <Clock size={10} />
                                {toPersianDigits(s.durationMinutes)} دقیقه
                              </p>
                            ) : null}
                          </div>
                        </div>

                        <div className="shrink-0 text-left">
                          <p className="text-xs font-black text-gray-900">
                            {toPersianDigits(formatPrice(s.price))} تومان
                          </p>
                          {hasDeposit ? (
                            <p className="mt-0.5 text-[10px] font-bold text-primary">
                              بیعانه:{' '}
                              {toPersianDigits(formatPrice(s.depositPrice!))}{' '}
                              تومان
                            </p>
                          ) : (
                            <p className="mt-0.5 text-[10px] font-medium text-gray-400">
                              بدون بیعانه مجزا
                            </p>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {errors.serviceIds && (
                <p className="text-[11px] text-red-600">
                  {errors.serviceIds.message}
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
                  disablePastDates
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
                ساعت شروع
              </span>

              {serviceIds.length === 0 || !isoDate ? (
                <p className="rounded-xl border border-dashed border-gray-200 bg-gray-50/60 p-3 text-center text-[11px] text-gray-400">
                  برای نمایش ساعت‌های خالی، ابتدا خدمات و تاریخ را انتخاب کنید.
                </p>
              ) : slotsLoading ? (
                <div className="grid grid-cols-4 gap-2">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 rounded-lg" />
                  ))}
                </div>
              ) : slots.length === 0 ? (
                <p className="rounded-xl border border-dashed border-gray-200 bg-gray-50/60 p-3 text-center text-[11px] text-gray-400">
                  ساعت خالی متوالی برای مجموع زمان انتخابی در این روز وجود ندارد.
                </p>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {slots.map(slot => (
                    <button
                      key={slot}
                      type="button"
                      disabled={slotsFetching}
                      onClick={() =>
                        setValue('time', slot, { shouldValidate: true })
                      }
                      className={cn(
                        'h-10 rounded-lg border text-xs font-black transition disabled:cursor-wait disabled:opacity-60',
                        time === slot && !slotsFetching
                          ? 'border-primary bg-primary text-white'
                          : 'border-gray-200 bg-white text-gray-600 hover:border-primary/40 hover:text-primary',
                      )}
                    >
                      {toPersianDigits(slot)}
                    </button>
                  ))}
                </div>
              )}

              {slotsFetching && !slotsLoading && (
                <p className="text-[10px] text-gray-400">
                  در حال به‌روزرسانی ساعت‌های خالی...
                </p>
              )}

              {time && !slotsFetching && !slots.includes(time) && (
                <p className="text-[11px] text-amber-700">
                  این ساعت دیگر در دسترس نیست؛ لطفاً ساعت دیگری انتخاب کنید.
                </p>
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
                placeholder="یادداشت برای مشتری (در صورت‌حساب هم نمایش داده می‌شود)..."
                className="rounded-xl text-xs"
              />

              <p className="flex items-center gap-1.5 text-[10px] font-medium text-gray-400">
                <NotebookPen size={12} />
                یادداشت خصوصی فقط در پنل خودت دیده می‌شود.
              </p>
            </div>

            {/* روش ثبت: پلن پیامکی یا لینک بیعانه */}
            <div className="space-y-3 rounded-2xl border border-gray-100 bg-gray-50/60 p-4">
              <div>
                <p className="text-xs font-black text-gray-900">
                  این نوبت چطور ثبت شود؟
                </p>

                <p className="mt-0.5 text-[10px] font-medium text-gray-400">
                  در حالت لینک بیعانه، مشتری ابتدا صفحهٔ صورت‌حساب خدمات و کمیسیون را می‌بیند و سپس وارد درگاه می‌شود.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={!smsEligible || isSubmitting}
                  onClick={() => handleDepositLinkChange(false)}
                  className={cn(
                    'rounded-xl border p-3 text-right transition disabled:cursor-not-allowed disabled:opacity-50',
                    !effectiveDepositLink
                      ? 'border-primary bg-primary-2/60'
                      : 'border-gray-200 bg-white hover:border-primary/40',
                  )}
                >
                  <span className="flex items-center gap-1.5 text-[11px] font-black text-gray-900">
                    <BellRing size={13} />
                    پلن پیامکی
                  </span>

                  <span className="mt-1 block text-[10px] font-medium leading-5 text-gray-500">
                    تأیید با پیامک؛ ۲ اعتبار از پلن کسر می‌شود
                  </span>
                </button>

                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleDepositLinkChange(true)}
                  className={cn(
                    'rounded-xl border p-3 text-right transition disabled:cursor-not-allowed disabled:opacity-50',
                    effectiveDepositLink
                      ? 'border-primary bg-primary-2/60'
                      : 'border-gray-200 bg-white hover:border-primary/40',
                  )}
                >
                  <span className="flex items-center gap-1.5 text-[11px] font-black text-gray-900">
                    <Wallet size={13} />
                    لینک بیعانه
                  </span>

                  <span className="mt-1 block text-[10px] font-medium leading-5 text-gray-500">
                    پیامک رایگان؛ نمایش صورت‌حساب و پرداخت آنلاین
                  </span>
                </button>
              </div>

              {/* پیش‌نمایش دقیق صورت‌حساب */}
              <div className="rounded-xl border border-white bg-white/95 p-3 text-[11px] leading-5 text-gray-700 space-y-2">
                {effectiveDepositLink ? (
                  invoicePreview ? (
                    <div className="space-y-1.5">
                      <p className="flex items-center gap-1 font-black text-gray-900">
                        <ReceiptText size={13} className="text-primary" />
                        پیش‌نمایش صورت‌حساب ارسالی به مشتری:
                      </p>

                      <div className="flex items-center justify-between text-[10px] text-gray-500">
                        <span>مجموع قیمت خدمات:</span>
                        <span className="font-bold text-gray-800">
                          {toPersianDigits(
                            formatPrice(invoicePreview.totalServicePrice),
                          )}{' '}
                          تومان
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-gray-500">
                        <span>جمع بیعانه (واریز به کیف پول شما):</span>
                        <span className="font-bold text-emerald-700">
                          {toPersianDigits(
                            formatPrice(invoicePreview.depositAmount),
                          )}{' '}
                          تومان
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-gray-500">
                        <span>
                          کمیسیون سایت ({toPersianDigits(commissionPercent)}٪
                          بیشترین بیعانه):
                        </span>
                        <span className="font-bold text-primary">
                          {toPersianDigits(
                            formatPrice(invoicePreview.commissionAmount),
                          )}{' '}
                          تومان
                        </span>
                      </div>

                      <div className="flex items-center justify-between border-t border-dashed border-gray-200 pt-1.5 text-[11px] font-black text-gray-900">
                        <span>مبلغ قابل پرداخت در درگاه:</span>
                        <span className="text-primary">
                          {toPersianDigits(
                            formatPrice(invoicePreview.amountToPay),
                          )}{' '}
                          تومان
                        </span>
                      </div>

                      {invoicePreview.remainingInSalon > 0 && (
                        <div className="flex items-center justify-between text-[10px] text-amber-800">
                          <span>باقیمانده دریافتی حضوری در سالن:</span>
                          <span className="font-black">
                            {toPersianDigits(
                              formatPrice(invoicePreview.remainingInSalon),
                            )}{' '}
                            تومان
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-[10px] font-bold text-gray-600">
                      مبلغ پرداختی مشتری = جمع بیعانه‌ها (در نبود بیعانه، مبلغ کل
                      خدمت) + {toPersianDigits(commissionPercent)}٪ بیشترین بیعانه
                    </span>
                  )
                ) : (
                  <span className="text-[10px] font-bold">
                    اعتبار باقیماندهٔ پلن:{' '}
                    <span className="text-primary">
                      {toPersianDigits(smsRemaining)}
                    </span>{' '}
                    — این سفارش{' '}
                    {toPersianDigits(
                      canSendSmsReminder && sendSmsReminder
                        ? SMS_CREDIT_COST_PER_TEMPLATE * 2
                        : SMS_CREDIT_COST_PER_TEMPLATE,
                    )}{' '}
                    اعتبار
                  </span>
                )}
              </div>

              <ul className="space-y-1 text-[10px] font-medium leading-5 text-gray-500">
                {effectiveDepositLink ? (
                  <>
                    <li>
                      • مشتری با کلیک روی لینک پیامک، صورت‌حساب کامل خدمات، سهم
                      بیعانه و کمیسیون را می‌بیند و سپس وارد درگاه می‌شود.
                    </li>
                    <li>
                      • تا {toPersianDigits(DEPOSIT_PAYMENT_TIMEOUT_HOURS)}{' '}
                      ساعت پس از ارسال لینک، اگر پرداخت انجام نشود نوبت خودکار لغو
                      می‌شود.
                    </li>
                  </>
                ) : (
                  <>
                    <li>
                      • پیامک تأیید به مشتری می‌رود و ۲ اعتبار از پلن کسر
                      می‌شود.
                    </li>
                    <li>
                      • نوبت از همان لحظه قطعی است و ساعت رزرو اشغال می‌شود.
                    </li>
                  </>
                )}
              </ul>
            </div>

            <div className="divide-y divide-gray-100 rounded-2xl border border-gray-100 bg-gray-50/60 p-4">
              {smsEligible && (
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
                        {effectiveDepositLink
                          ? `پس از پرداخت بیعانه، قبل از نوبت ارسال می‌شود (۲ اعتبار از ${toPersianDigits(smsRemaining)} اعتبار باقیمانده)`
                          : 'چند ساعت قبل از نوبت می‌رود؛ ۲ اعتبار موقع ثبت کم می‌شود'}
                      </p>
                    </div>
                  </div>

                  <Switch
                    checked={canSendSmsReminder && sendSmsReminder}
                    disabled={!canSendSmsReminder || isSubmitting}
                    onCheckedChange={v => {
                      setValue('sendSmsReminder', v);

                      if (!v) setValue('reminderHours', null);
                    }}
                  />
                </div>
              )}

              {smsEligible && !canSendSmsReminder && !effectiveDepositLink && (
                <p className="pb-2 text-[10px] leading-5 text-amber-700">
                  برای پیامک تأیید و یادآوری با هم، حداقل ۴ اعتبار لازم است؛
                  در صورت تمایل می‌توانید گزینهٔ «لینک بیعانه» را انتخاب کنید تا
                  فقط ۲ اعتبار یادآوری کسر شود.
                </p>
              )}

              {canSendSmsReminder && sendSmsReminder && (
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

              {!smsEligible && (
                <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
                  <Lock size={14} className="mt-0.5 shrink-0 text-amber-500" />

                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-black leading-5 text-amber-700">
                      برای ثبت نوبت بدون لینک بیعانه، اشتراک فعال و حداقل ۲
                      اعتبار پیامک لازم است.{' '}
                    </p>

                    <p className="mt-1 text-[10px] font-medium leading-5 text-amber-600">
                      در غیر این صورت، لینک صورت‌حساب بیعانه برای مشتری ارسال
                      می‌شود و خود پیامک لینک از اعتبار شما کم نمی‌کند.
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
              disabled={
                isSubmitting ||
                isNotApproved ||
                slotsFetching ||
                (!!time && !slots.includes(time))
              }
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  در حال ثبت نوبت...
                </>
              ) : (
                'ثبت نوبت و ارسال'
              )}
            </Button>
          </div>
        </FormProvider>
      </DrawerContent>
    </Drawer>
  );
}
