import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { toast } from 'sonner';

import type { ApiListResponse, ApiSingleResponse } from '@/services/api/types';

import {
  barberList,
  createBarberReview,
  getBarberById,
  getBarberReviews,
  getMyBarberProfile,
  getMyBarberReview,
  getMyBarberReviews,
  getMyReferralCode,
  getMyReferrals,
  getWorkHours,
  updateBarberPortfolio,
  updateBarberProfile,
  updateWorkHours,
  uploadProfileImage,
} from './api';
import {
  Barber,
  BarberResponse,
  BarberReview,
  CreateBarberReviewDto,
  UpdateBarberPortfolio,
  UpdateBarberProfile,
  WorkHours,
} from './types';

export const useBarberList = (
  params?: {
    cityId?: number;
    provinceId?: number;
    search?: string;
    sort?: string;
    minPrice?: number;
    maxPrice?: number;
    minRating?: number;
    limit?: number;
  },
  initialPage?: ApiListResponse<BarberResponse> | null,
) => {
  return useInfiniteQuery({
    queryKey: ['barbers', params],
    queryFn: ({ pageParam = 1 }) =>
      barberList({
        page: pageParam,
        limit: params?.limit || 10,
        cityId: params?.cityId,
        provinceId: params?.provinceId,
        search: params?.search,
        sort: params?.sort,
        minPrice: params?.minPrice,
        maxPrice: params?.maxPrice,
        minRating: params?.minRating,
      }),
    getNextPageParam: lastPage => {
      const { page, totalPages } = lastPage.pagination;
      return page < totalPages ? page + 1 : undefined;
    },
    initialPageParam: 1,
    initialData: initialPage
      ? { pages: [initialPage], pageParams: [1] }
      : undefined,
    staleTime: 2 * 60 * 1000, // 2 دقیقه
  });
};

export const useHomeBarberList = (params?: {
  cityId?: number;
  provinceId?: number;
  search?: string;
  sort?: string;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  limit?: number;
}) => {
  return useQuery({
    queryKey: ['homeBarbers', params],
    queryFn: () =>
      barberList({
        page: 1,
        limit: params?.limit || 10,
        cityId: params?.cityId,
        provinceId: params?.provinceId,
        search: params?.search,
        sort: params?.sort,
        minPrice: params?.minPrice,
        maxPrice: params?.maxPrice,
        minRating: params?.minRating,
      }),
    staleTime: 2 * 60 * 1000,
    enabled: true,
  });
};

export const useBarber = (id: number, initialBarber?: Barber) => {
  return useQuery({
    queryKey: ['barber', id],
    queryFn: () => getBarberById(id),
    enabled: !!id,
    initialData: initialBarber
      ? ({
          status: 200,
          message: '',
          data: initialBarber,
        } satisfies ApiSingleResponse<Barber>)
      : undefined,
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

export const useUpdateBarberPortfolio = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateBarberPortfolio) => updateBarberPortfolio(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['my-barber-profile'] });
      toast.success('نمونه‌کارها با موفقیت به‌روزرسانی شدند.');
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || 'خطا در به‌روزرسانی نمونه‌کارها',
      );
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

export const useBarberReviews = (
  barberId: number | string,
  params?: { page?: number; limit?: number },
  initialData?: ApiListResponse<BarberReview> | null,
) => {
  return useQuery({
    queryKey: ['barber-reviews', barberId, params],
    queryFn: () => getBarberReviews(barberId, params),
    enabled: barberId !== undefined && barberId !== null && barberId !== '',
    initialData: params?.page === 1 ? (initialData ?? undefined) : undefined,
    staleTime: 60 * 1000,
  });
};

export const useMyBarberReview = (
  barberId: number | string,
  enabled = true,
) => {
  return useQuery({
    queryKey: ['my-barber-review', barberId],
    queryFn: () => getMyBarberReview(barberId),
    enabled:
      enabled && barberId !== undefined && barberId !== null && barberId !== '',
    staleTime: 60 * 1000,
  });
};

export const useMyBarberReviews = () => {
  return useQuery({
    queryKey: ['my-barber-reviews'],
    queryFn: getMyBarberReviews,
    staleTime: 60 * 1000,
  });
};

export const useCreateBarberReview = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      barberId,
      dto,
    }: {
      barberId: number | string;
      dto: CreateBarberReviewDto;
    }) => createBarberReview(barberId, dto),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['barber-reviews'] });
      queryClient.invalidateQueries({
        queryKey: ['my-barber-review', variables.barberId],
      });
      queryClient.invalidateQueries({ queryKey: ['my-barber-reviews'] });
      queryClient.invalidateQueries({ queryKey: ['barber'] });
      queryClient.invalidateQueries({ queryKey: ['barbers'] });
      queryClient.invalidateQueries({ queryKey: ['homeBarbers'] });
      toast.success('نظر شما ثبت شد و پس از تایید ادمین نمایش داده می‌شود.');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'خطا در ثبت نظر');
    },
  });
};
