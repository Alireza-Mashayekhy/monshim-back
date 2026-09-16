import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import {
  addClubCustomer,
  createClubGroup,
  createManualBooking,
  deleteClubGroup,
  getClubCustomers,
  getClubGroups,
  removeClubCustomer,
  updateClubCustomer,
} from './api';
import {
  ClubCustomerQuery,
  CreateClubCustomerDto,
  CreateCustomerGroupDto,
  CreateManualBookingDto,
  UpdateClubCustomerDto,
} from './types';

export const clubKeys = {
  groups: ['club-groups'] as const,
  customers: (params: ClubCustomerQuery) => ['club-customers', params] as const,
  allCustomers: ['club-customers'] as const,
};

/* ─────────────────────────  گروه‌ها  ───────────────────────── */

export const useClubGroups = () => {
  return useQuery({
    queryKey: clubKeys.groups,
    queryFn: getClubGroups,
    staleTime: 5 * 60 * 1000,
  });
};

export const useCreateClubGroup = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateCustomerGroupDto) => createClubGroup(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clubKeys.groups });
      toast.success('گروه با موفقیت ایجاد شد.');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'خطا در ایجاد گروه');
    },
  });
};

export const useDeleteClubGroup = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteClubGroup(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clubKeys.groups });
      queryClient.invalidateQueries({ queryKey: clubKeys.allCustomers });
      toast.success('گروه با موفقیت حذف شد.');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'خطا در حذف گروه');
    },
  });
};

/* ─────────────────────────  مشتریان  ───────────────────────── */

export const useClubCustomers = (params: ClubCustomerQuery) => {
  return useQuery({
    queryKey: clubKeys.customers(params),
    queryFn: () => getClubCustomers(params),
    staleTime: 30 * 1000,
  });
};

export const useAddClubCustomer = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateClubCustomerDto) => addClubCustomer(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clubKeys.allCustomers });
      queryClient.invalidateQueries({ queryKey: clubKeys.groups });
      toast.success('مشتری با موفقیت افزوده شد.');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'خطا در افزودن مشتری');
    },
  });
};

export const useUpdateClubCustomer = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateClubCustomerDto }) =>
      updateClubCustomer(id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clubKeys.allCustomers });
      queryClient.invalidateQueries({ queryKey: clubKeys.groups });
      toast.success('اطلاعات مشتری با موفقیت ویرایش شد.');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'خطا در ویرایش مشتری');
    },
  });
};

export const useRemoveClubCustomer = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => removeClubCustomer(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clubKeys.allCustomers });
      queryClient.invalidateQueries({ queryKey: clubKeys.groups });
      toast.success('مشتری با موفقیت حذف شد.');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'خطا در حذف مشتری');
    },
  });
};

/* ───────────────────  ثبت نوبت دستی  ─────────────────── */

export const useCreateManualBooking = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateManualBookingDto) => createManualBooking(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['barber-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
      toast.success('نوبت با موفقیت ثبت شد.');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'خطا در ثبت نوبت');
    },
  });
};
