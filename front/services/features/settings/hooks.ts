import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import {
  getPaymentConfig,
  getPublicSettings,
  getSiteSettings,
  updateSiteSettings,
} from './api';

export function useSiteSettings() {
  return useQuery({
    queryKey: ['adminSettings'],
    queryFn: getSiteSettings,
    staleTime: 5 * 60 * 1000,
  });
}

export function usePublicSettings() {
  return useQuery({
    queryKey: ['publicSettings'],
    queryFn: getPublicSettings,
    staleTime: 5 * 60 * 1000,
  });
}

export function usePaymentConfig() {
  return useQuery({
    queryKey: ['paymentConfig'],
    queryFn: getPaymentConfig,
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpdateSiteSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateSiteSettings,

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['adminSettings'],
      });

      toast.success('تنظیمات با موفقیت ذخیره شد');
    },

    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'خطا در ذخیره تنظیمات');
    },
  });
}
