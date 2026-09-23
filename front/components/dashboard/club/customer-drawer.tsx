'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Plus } from 'lucide-react';
import { useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import * as z from 'zod';

import FormProvider from '@/components/form/form-provider';
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
import { normalizePhone, phoneSchema } from '@/lib/phone';
import {
  useAddClubCustomer,
  useClubGroups,
  useCreateClubGroup,
  useUpdateClubCustomer,
} from '@/services/features/club/hooks';
import type { ClubCustomer } from '@/services/features/club/types';

interface CustomerDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** در حالت ویرایش، مشتری انتخاب‌شده */
  customer?: ClubCustomer | null;
}

const NO_GROUP = 'no-group';

const schema = z.object({
  firstName: z
    .string()
    .trim()
    .min(1, 'نام الزامی است')
    .max(80, 'حداکثر ۸۰ کاراکتر'),
  lastName: z
    .string()
    .trim()
    .min(1, 'نام خانوادگی الزامی است')
    .max(80, 'حداکثر ۸۰ کاراکتر'),
  phone: phoneSchema,
  groupId: z.string(),
  newGroupName: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export function CustomerDrawer({
  open,
  onOpenChange,
  customer,
}: CustomerDrawerProps) {
  const isEdit = !!customer;

  const { data: groups } = useClubGroups();
  const addCustomer = useAddClubCustomer();
  const updateCustomer = useUpdateClubCustomer();
  const createGroup = useCreateClubGroup();

  const methods = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName: '',
      lastName: '',
      phone: '',
      groupId: NO_GROUP,
      newGroupName: '',
    },
  });

  const { control, reset, setValue, handleSubmit } = methods;
  const groupId = useWatch({ control, name: 'groupId' });
  const newGroupName = useWatch({ control, name: 'newGroupName' }) ?? '';

  // مقداردهی فرم هنگام باز شدن
  useEffect(() => {
    if (!open) return;

    reset({
      firstName: customer?.firstName ?? '',
      lastName: customer?.lastName ?? '',
      phone: customer?.phone ?? '',
      groupId: customer?.groupId || customer?.group?.id || NO_GROUP,
      newGroupName: '',
    });
  }, [open, customer, reset]);

  const handleCreateGroup = async () => {
    const value = newGroupName.trim();
    if (!value) return;

    try {
      const group = await createGroup.mutateAsync({ name: value });
      if (group?.id) setValue('groupId', group.id);
      setValue('newGroupName', '');
    } catch {
      // خطا در هوک نمایش داده می‌شود
    }
  };

  const onSubmit = async (values: FormValues) => {
    const payload = {
      firstName: values.firstName,
      lastName: values.lastName,
      phone: normalizePhone(values.phone),
      groupId: values.groupId === NO_GROUP ? null : values.groupId,
    };

    try {
      if (isEdit && customer) {
        await updateCustomer.mutateAsync({ id: customer.id, dto: payload });
      } else {
        await addCustomer.mutateAsync(payload);
      }
      onOpenChange(false);
    } catch {
      // خطا در هوک نمایش داده می‌شود
    }
  };

  const pending =
    addCustomer.isPending || updateCustomer.isPending || createGroup.isPending;

  const handleClose = () => {
    reset();
    onOpenChange(false);
  };

  return (
    <Drawer open={open} onOpenChange={handleClose}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle className="text-center">
            {isEdit ? 'ویرایش مشتری' : 'افزودن مشتری جدید'}
          </DrawerTitle>
          <DrawerDescription className="text-center text-sm">
            مشتریانی که به سالن شما مراجعه می‌کنند را اینجا ثبت کنید
          </DrawerDescription>
        </DrawerHeader>

        <FormProvider
          methods={methods}
          onSubmit={handleSubmit(onSubmit)}
          className="px-4 pb-4 space-y-4"
        >
          <div className="grid grid-cols-2 gap-3">
            <RHFInput name="firstName" label="نام" placeholder="مثلاً علی" />
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

          {/* انتخاب گروه */}
          <div className="space-y-2">
            <span className="block text-sm font-medium text-gray-700">
              گروه (اختیاری)
            </span>

            <Select
              value={groupId}
              onValueChange={value => setValue('groupId', value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="انتخاب گروه" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_GROUP}>بدون گروه</SelectItem>
                {groups?.map(group => (
                  <SelectItem key={group.id} value={group.id}>
                    {group.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* ساخت گروه جدید */}
            <div className="flex gap-2">
              <Input
                value={newGroupName}
                onChange={event => setValue('newGroupName', event.target.value)}
                placeholder="نام گروه جدید"
                maxLength={100}
                className="h-9"
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
                    <Plus size={16} />
                    گروه جدید
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={handleClose}
              disabled={pending}
            >
              انصراف
            </Button>
            <Button type="submit" className="flex-1" disabled={pending}>
              {pending ? (
                <Loader2 size={16} className="animate-spin" />
              ) : isEdit ? (
                'ذخیره تغییرات'
              ) : (
                'افزودن مشتری'
              )}
            </Button>
          </div>
        </FormProvider>
      </DrawerContent>
    </Drawer>
  );
}
