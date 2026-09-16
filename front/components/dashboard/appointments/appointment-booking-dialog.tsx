'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  CalendarClock,
  Loader2,
  Plus,
  Search,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import * as z from 'zod';

import FormProvider from '@/components/form/form-provider';
import { PersianDatePicker } from '@/components/form/persian-date-picker';
import RHFInput from '@/components/form/rhf-input';
import RHFPhoneInput from '@/components/form/rhf-phone-input';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useDebounce } from '@/hooks/use-debounce';
import { jalaliToIso } from '@/lib/date-utils';
import { normalizePhone } from '@/lib/phone';
import { cn, formatPrice } from '@/lib/utils';
import { useMyBarberProfile } from '@/services/features/barber/hooks';
import { useAvailableSlots } from '@/services/features/booking/hooks';
import {
  useAddClubCustomer,
  useClubCustomers,
  useClubGroups,
  useCreateClubGroup,
  useCreateManualBooking,
} from '@/services/features/club/hooks';
import type { ClubCustomer } from '@/services/features/club/types';
import { useMyServices } from '@/services/features/services/hooks';

const NO_GROUP = 'no-group';

const schema = z
  .object({
    customerMode: z.enum(['existing', 'new']),
    existingCustomerId: z.string().optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    phone: z.string().optional(),
    groupId: z.string().optional(),
    newGroupName: z.string().optional(),
    serviceId: z.string().min(1, 'انتخاب خدمت الزامی است'),
    date: z.string().min(1, 'انتخاب تاریخ الزامی است'),
    time: z.string().min(1, 'انتخاب ساعت الزامی است'),
    note: z.string().optional(),
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
      } else {
        const normalized = normalizePhone(data.phone);
        if (!/^09\d{9}$/.test(normalized)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['phone'],
            message: 'شماره تلفن وارد شده اشتباه است.',
          });
        }
      }
    }
  });

type FormValues = z.infer<typeof schema>;

interface AppointmentBookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AppointmentBookingDialog({
  open,
  onOpenChange,
}: AppointmentBookingDialogProps) {
  const [customerSearch, setCustomerSearch] = useState('');
  const debouncedSearch = useDebounce(customerSearch, 400);

  const methods = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      customerMode: 'existing',
      existingCustomerId: '',
      firstName: '',
      lastName: '',
      phone: '',
      groupId: NO_GROUP,
      newGroupName: '',
      serviceId: '',
      date: '',
      time: '',
      note: '',
    },
  });

  const { control, reset, setValue, handleSubmit, formState } = methods;
  const customerMode = useWatch({ control, name: 'customerMode' });
  const existingCustomerId = useWatch({ control, name: 'existingCustomerId' });
  const groupId = useWatch({ control, name: 'groupId' });
  const newGroupName = useWatch({ control, name: 'newGroupName' }) ?? '';
  const serviceId = useWatch({ control, name: 'serviceId' });
  const jalaliDate = useWatch({ control, name: 'date' });
  const time = useWatch({ control, name: 'time' });

  const { data: services, isLoading: servicesLoading } = useMyServices();
  const { data: barberProfile } = useMyBarberProfile();
  const { data: groups } = useClubGroups();
  const createGroup = useCreateClubGroup();
  const addCustomer = useAddClubCustomer();
  const createManualBooking = useCreateManualBooking();

  const barberId = barberProfile?.data?.id ? String(barberProfile.data.id) : '';
  const isoDate = jalaliToIso(jalaliDate) ?? '';

  const { data: slotsResponse, isLoading: slotsLoading } = useAvailableSlots(
    barberId,
    isoDate,
    serviceId,
  );
  const slots = slotsResponse?.data?.slots ?? [];

  const clubQuery = useMemo(
    () => ({
      page: 1,
      limit: 20,
      ...(debouncedSearch.trim() ? { search: debouncedSearch.trim() } : {}),
    }),
    [debouncedSearch],
  );

  const {
    data: customersData,
    isLoading: customersLoading,
    isFetching: customersFetching,
  } = useClubCustomers(clubQuery);

  const customers: ClubCustomer[] = customersData?.data ?? [];

  const selectedExistingCustomer = useMemo(
    () => customers.find(c => c.id === existingCustomerId) ?? null,
    [customers, existingCustomerId],
  );

  // reset time when service or date changes
  useEffect(() => {
    setValue('time', '');
  }, [serviceId, isoDate, setValue]);

  // reset form when dialog opens
  useEffect(() => {
    if (open) {
      reset({
        customerMode: 'existing',
        existingCustomerId: '',
        firstName: '',
        lastName: '',
        phone: '',
        groupId: NO_GROUP,
        newGroupName: '',
        serviceId: '',
        date: '',
        time: '',
        note: '',
      });
      setCustomerSearch('');
    }
  }, [open, reset]);

  const handleSlotSelect = (slot: string) => {
    setValue('time', slot, { shouldValidate: true });
  };

  const handleCreateGroup = async () => {
    const value = newGroupName.trim();
    if (!value) return;
    try {
      const group = await createGroup.mutateAsync({ name: value });
      if (group?.id) setValue('groupId', group.id);
      setValue('newGroupName', '');
    } catch {
      // handled in hook
    }
  };

  const onSubmit = async (values: FormValues) => {
    try {
      let clubCustomerId = values.existingCustomerId;

      if (values.customerMode === 'new') {
        const payload = {
          firstName: values.firstName!.trim(),
          lastName: values.lastName!.trim(),
          phone: normalizePhone(values.phone!),
          groupId: values.groupId === NO_GROUP ? null : values.groupId || null,
        };
        const newCustomer = await addCustomer.mutateAsync(payload);
        clubCustomerId = newCustomer.id;
      }

      if (!clubCustomerId) return;

      await createManualBooking.mutateAsync({
        clubCustomerId,
        serviceId: values.serviceId,
        date: jalaliToIso(values.date) ?? values.date,
        time: values.time,
        note: values.note?.trim() || undefined,
      });

      onOpenChange(false);
    } catch {
      // errors handled in hooks
    }
  };

  const isSubmitting =
    addCustomer.isPending ||
    createManualBooking.isPending ||
    createGroup.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg rounded-3xl max-h-[92dvh] overflow-y-auto p-0 gap-0">
        <DialogHeader className="p-6 pb-4 border-b sticky top-0 bg-white z-10 rounded-t-3xl">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <CalendarClock size={18} />
            </div>
            ثبت نوبت دستی
          </DialogTitle>
          <DialogDescription className="text-right">
            برای مشتری قبلی یا مشتری جدید نوبت ثبت کنید. مشتری جدید به باشگاه
            مشتریان اضافه می‌شود.
          </DialogDescription>
        </DialogHeader>

        <div className="p-6 space-y-5">
          {/* تب انتخاب مشتری */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 rounded-2xl">
            <button
              type="button"
              onClick={() => setValue('customerMode', 'existing')}
              className={cn(
                'h-10 rounded-xl text-sm font-medium transition flex items-center justify-center gap-1.5',
                customerMode === 'existing'
                  ? 'bg-white shadow text-gray-900'
                  : 'text-gray-500 hover:text-gray-700',
              )}
            >
              <Users size={16} />
              مشتری قبلی
            </button>
            <button
              type="button"
              onClick={() => setValue('customerMode', 'new')}
              className={cn(
                'h-10 rounded-xl text-sm font-medium transition flex items-center justify-center gap-1.5',
                customerMode === 'new'
                  ? 'bg-white shadow text-gray-900'
                  : 'text-gray-500 hover:text-gray-700',
              )}
            >
              <UserPlus size={16} />
              مشتری جدید
            </button>
          </div>

          <FormProvider
            methods={methods}
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-5"
          >
            {/* بخش مشتری */}
            {customerMode === 'existing' ? (
              <div className="space-y-3">
                <div className="space-y-2">
                  <span className="block text-sm font-medium text-gray-700">
                    انتخاب مشتری
                  </span>
                  <div className="relative">
                    <Search
                      size={16}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                    />
                    <Input
                      value={customerSearch}
                      onChange={e => setCustomerSearch(e.target.value)}
                      placeholder="جستجو نام یا موبایل..."
                      className="h-10 pr-9 pl-9 rounded-xl"
                    />
                    {customerSearch && (
                      <button
                        type="button"
                        onClick={() => setCustomerSearch('')}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                  {formState.errors.existingCustomerId && (
                    <p className="text-xs text-red-600">
                      {formState.errors.existingCustomerId.message}
                    </p>
                  )}
                </div>

                <div className="border rounded-2xl bg-gray-50/50 max-h-[220px] overflow-y-auto divide-y">
                  {customersLoading ? (
                    <div className="p-3 space-y-2">
                      {[1, 2, 3].map(i => (
                        <Skeleton key={i} className="h-14 w-full rounded-xl" />
                      ))}
                    </div>
                  ) : customers.length === 0 ? (
                    <div className="py-8 text-center">
                      <div className="w-10 h-10 rounded-full bg-white border flex items-center justify-center mx-auto mb-2">
                        <Users size={16} className="text-gray-400" />
                      </div>
                      <p className="text-sm text-gray-600 font-medium">
                        {debouncedSearch.trim()
                          ? 'مشتری‌ای یافت نشد'
                          : 'هنوز مشتری ندارید'}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {debouncedSearch.trim()
                          ? 'نام یا شماره را تغییر دهید'
                          : 'ابتدا در باشگاه مشتریان، مشتری اضافه کنید یا تب مشتری جدید را انتخاب کنید.'}
                      </p>
                    </div>
                  ) : (
                    customers.map(c => {
                      const isSelected = existingCustomerId === c.id;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() =>
                            setValue('existingCustomerId', c.id, {
                              shouldValidate: true,
                            })
                          }
                          className={cn(
                            'w-full text-right p-3 flex items-center gap-3 hover:bg-white transition',
                            isSelected && 'bg-white',
                          )}
                        >
                          <div
                            className={cn(
                              'w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0',
                              isSelected
                                ? 'bg-primary text-white'
                                : 'bg-primary-50 text-primary-600',
                            )}
                          >
                            {c.firstName?.charAt(0) ?? 'م'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-gray-800 truncate">
                              {c.firstName} {c.lastName}
                            </p>
                            <p
                              className="text-xs text-gray-500 dir-ltr text-right"
                              dir="ltr"
                            >
                              {c.phone}
                              {c.group?.name ? ` • ${c.group.name}` : ''}
                            </p>
                          </div>
                          <div
                            className={cn(
                              'w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0',
                              isSelected
                                ? 'border-primary bg-primary'
                                : 'border-gray-300',
                            )}
                          >
                            {isSelected && (
                              <div className="w-2 h-2 rounded-full bg-white" />
                            )}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>

                {selectedExistingCustomer && (
                  <div className="rounded-xl bg-primary-50 border border-primary-100 p-3 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold">
                      {selectedExistingCustomer.firstName.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-gray-800">
                        {selectedExistingCustomer.firstName}{' '}
                        {selectedExistingCustomer.lastName}
                      </p>
                      <p className="text-xs text-gray-500" dir="ltr">
                        {selectedExistingCustomer.phone}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setValue('existingCustomerId', '')}
                      className="text-xs text-primary hover:underline"
                    >
                      تغییر
                    </button>
                  </div>
                )}

                {customersFetching && !customersLoading && (
                  <p className="text-xs text-gray-400 text-center">
                    در حال بروزرسانی...
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-4 rounded-2xl bg-orange-50/50 border border-orange-100 p-4">
                <p className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
                  <UserPlus size={16} className="text-primary" />
                  اطلاعات مشتری جدید
                  <span className="text-xs font-normal text-gray-500">
                    (به باشگاه اضافه می‌شود)
                  </span>
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <RHFInput
                    name="firstName"
                    label="نام"
                    placeholder="مثلاً علی"
                  />
                  <RHFInput
                    name="lastName"
                    label="نام خانوادگی"
                    placeholder="مثلاً رضایی"
                  />
                </div>

                <RHFPhoneInput
                  name="phone"
                  label="شماره موبایل"
                  placeholder="۰۹۱۲۳۴۵۶۷۸۹"
                />

                <div className="space-y-2">
                  <span className="block text-sm font-medium text-gray-700">
                    گروه (اختیاری)
                  </span>
                  <Select
                    value={groupId}
                    onValueChange={v => setValue('groupId', v)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="انتخاب گروه" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_GROUP}>بدون گروه</SelectItem>
                      {groups?.map(g => (
                        <SelectItem key={g.id} value={g.id}>
                          {g.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <div className="flex gap-2">
                    <Input
                      value={newGroupName}
                      onChange={e => setValue('newGroupName', e.target.value)}
                      placeholder="نام گروه جدید"
                      maxLength={100}
                      className="h-9 flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCreateGroup}
                      disabled={!newGroupName.trim() || createGroup.isPending}
                      className="shrink-0 h-9"
                    >
                      {createGroup.isPending ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <>
                          <Plus size={16} /> گروه
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )}

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
                  onValueChange={v =>
                    setValue('serviceId', v, { shouldValidate: true })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="انتخاب خدمت" />
                  </SelectTrigger>
                  <SelectContent>
                    {services?.data?.map(s => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name} — {formatPrice(s.price)} تومان
                        {s.durationMinutes
                          ? ` (${s.durationMinutes} دقیقه)`
                          : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {formState.errors.serviceId && (
                <p className="text-xs text-red-600">
                  {formState.errors.serviceId.message}
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
              {formState.errors.date && (
                <p className="text-xs text-red-600">
                  {formState.errors.date.message}
                </p>
              )}
            </div>

            {/* ساعت */}
            <div className="space-y-2">
              <span className="block text-sm font-medium text-gray-700">
                ساعت
              </span>
              {!serviceId || !isoDate ? (
                <p className="text-xs text-gray-400 bg-gray-50 border border-dashed rounded-xl p-3 text-center">
                  برای نمایش زمان‌های خالی، ابتدا خدمت و تاریخ را انتخاب کنید.
                </p>
              ) : slotsLoading ? (
                <div className="grid grid-cols-4 gap-2">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <Skeleton key={i} className="h-9 rounded-lg" />
                  ))}
                </div>
              ) : slots.length === 0 ? (
                <p className="text-xs text-gray-400 bg-gray-50 border border-dashed rounded-xl p-3 text-center">
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
                        'h-9 rounded-lg border text-xs font-medium transition',
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
              {formState.errors.time && (
                <p className="text-xs text-red-600">
                  {formState.errors.time.message}
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

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                انصراف
              </Button>
              <Button type="submit" className="flex-1" disabled={isSubmitting}>
                {isSubmitting ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  'ثبت نوبت'
                )}
              </Button>
            </div>
          </FormProvider>
        </div>
      </DialogContent>
    </Dialog>
  );
}
