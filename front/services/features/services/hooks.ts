// services/features/services/hooks.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { createService, deleteService, editService, servicesList } from './api';
import { UpdateServiceDto } from './types';

export const useMyServices = () => {
  return useQuery({
    queryKey: ['my-services'],
    queryFn: servicesList,
    staleTime: 2 * 60 * 1000, // 2 دقیقه
  });
};

export const useCreateService = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createService,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-services'] });
      toast.success('خدمت با موفقیت اضافه شد.');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'خطا در ایجاد خدمت');
    },
  });
};

export const useUpdateService = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: UpdateServiceDto }) =>
      editService(id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-services'] });
      toast.success('خدمت با موفقیت ویرایش شد.');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'خطا در ویرایش خدمت');
    },
  });
};

export const useDeleteService = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteService,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-services'] });
      toast.success('خدمت با موفقیت حذف شد.');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'خطا در حذف خدمت');
    },
  });
};
