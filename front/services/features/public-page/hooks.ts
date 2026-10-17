import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

import { getPublicPageStatus, payPublicPagePackage } from './api';

export const publicPageKeys = {
  all: ['public-page'] as const,
  status: () => [...publicPageKeys.all, 'status'] as const,
};

export function usePublicPageStatus() {
  return useQuery({
    queryKey: publicPageKeys.status(),
    queryFn: getPublicPageStatus,
    staleTime: 60 * 1000,
  });
}

export function usePayPublicPagePackage() {
  return useMutation({
    mutationFn: payPublicPagePackage,
    onSuccess: response => {
      const paymentUrl = response.data?.paymentUrl;
      if (paymentUrl) {
        toast.info('در حال انتقال به درگاه پرداخت زیبال...');
        window.location.href = paymentUrl;
      }
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || 'خطا در شروع پرداخت پکیج صفحه عمومی',
      );
    },
  });
}
