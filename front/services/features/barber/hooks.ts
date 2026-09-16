import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { toast } from 'sonner';

import {
  barberList,
  getBarberById,
  getMyBarberProfile,
  getMyReferralCode,
  getMyReferrals,
  getWorkHours,
  updateBarberProfile,
  updateWorkHours,
  uploadProfileImage,
} from './api';
import { UpdateBarberProfile, WorkHours } from './types';

export const useBarberList = (params: {
  cityId?: number;
  search?: string;
  limit?: number;
}) => {
  return useInfiniteQuery({
    queryKey: ['barbers', params],
    queryFn: ({ pageParam = 1 }) =>
      barberList({
        page: pageParam,
        limit: params.limit || 10,
        cityId: params.cityId,
        search: params.search,
      }),
    getNextPageParam: lastPage => {
      const { page, totalPages } = lastPage.pagination;
      return page < totalPages ? page + 1 : undefined;
    },
    initialPageParam: 1,
    staleTime: 2 * 60 * 1000, // 2 دقیقه
  });
};

export const useHomeBarberList = (params: {
  cityId?: number;
  search?: string;
  limit?: number;
}) => {
  return useQuery({
    queryKey: ['homeBarbers', params],
    queryFn: () =>
      barberList({
        page: 1,
        limit: params.limit || 10,
        cityId: params.cityId,
        search: params.search,
      }),
    staleTime: 2 * 60 * 1000,
    enabled: true,
  });
};

export const useBarber = (id: number) => {
  return useQuery({
    queryKey: ['barber', id],
    queryFn: () => getBarberById(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
};

export const useMyBarberProfile = () => {
  return useQuery({
    queryKey: ['my-barber-profile'],
    queryFn: getMyBarberProfile,
    staleTime: 5 * 60 * 1000,
  });
};

export const useUpdateBarberProfile = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: UpdateBarberProfile) => updateBarberProfile(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-barber-profile'] });
      toast.success('پروفایل با موفقیت به‌روزرسانی شد.');
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || 'خطا در به‌روزرسانی پروفایل',
      );
    },
  });
};

export const useUploadProfileImage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => uploadProfileImage(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-barber-profile'] });
      toast.success('عکس پروفایل با موفقیت آپلود شد.');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'خطا در آپلود عکس');
    },
  });
};

// services/features/barber/hooks.ts
export const useWorkHours = () => {
  return useQuery({
    queryKey: ['work-hours'],
    queryFn: getWorkHours,
    staleTime: 5 * 60 * 1000,
  });
};

export const useUpdateWorkHours = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (hours: { hours: WorkHours[] }) => updateWorkHours(hours),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-hours'] });
      toast.success('ساعات کاری با موفقیت به‌روز شد.');
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || 'خطا در به‌روزرسانی ساعات کاری',
      );
    },
  });
};

export const useMyReferralCode = () => {
  return useQuery({
    queryKey: ['my-referral-code'],
    queryFn: getMyReferralCode,
    staleTime: 10 * 60 * 1000, // ۱۰ دقیقه
  });
};

export const useMyReferrals = () => {
  return useQuery({
    queryKey: ['my-referrals'],
    queryFn: getMyReferrals,
    staleTime: 2 * 60 * 1000, // ۲ دقیقه
  });
};
