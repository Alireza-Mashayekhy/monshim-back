import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import {
  barberReviewListAdmin,
  deleteBarber,
  getBarberById,
  moderateBarberReview,
  notApprovedBarberList,
  reviewBarber,
  updateBarber,
} from './admin.api';
import {
  ModerateBarberReviewDto,
  ReviewBarberDto,
  UpdateBarberProfile,
} from './types';

export const useBarberList = (params: {
  page?: number;
  search?: string;
  limit?: number;
}) => {
  return useQuery({
    queryKey: ['adminBarbers', params],
    queryFn: () =>
      notApprovedBarberList({
        page: params.page ?? 1,
        limit: params.limit ?? 10,
        search: params.search,
      }),
    staleTime: 2 * 60 * 1000,
  });
};

export const useBarber = (id: string) => {
  return useQuery({
    queryKey: ['adminBarber', id],
    queryFn: () => getBarberById(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
};

export const useUpdateBarberProfile = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: UpdateBarberProfile) => updateBarber(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminBarbers'] });
      toast.success('آرایشگر با موفقیت به‌روزرسانی شد.');
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || 'خطا در به‌روزرسانی آرایشگر',
      );
    },
  });
};

export const useDeleteBarberProfile = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => deleteBarber(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminBarbers'] });
      toast.success('آرایشگر با موفقیت حذف شد.');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'خطا در حذف آرایشگر');
    },
  });
};

export const useReviewBarber = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: ReviewBarberDto }) =>
      reviewBarber(id, dto),

    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['adminBarbers'],
      });

      queryClient.invalidateQueries({
        queryKey: ['adminBarber', variables.id],
      });

      toast.success('وضعیت پروفایل با موفقیت تغییر کرد.');
    },

    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || 'خطا در تغییر وضعیت پروفایل',
      );
    },
  });
};

export const useAdminBarberReviews = (params?: {
  page?: number;
  limit?: number;
  status?: 'pending' | 'approved' | 'rejected';
  search?: string;
}) => {
  return useQuery({
    queryKey: ['adminBarberReviews', params],
    queryFn: () =>
      barberReviewListAdmin({
        page: params?.page ?? 1,
        limit: params?.limit ?? 10,
        status: params?.status,
        search: params?.search,
      }),
    staleTime: 60 * 1000,
  });
};

export const useModerateBarberReview = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: ModerateBarberReviewDto }) =>
      moderateBarberReview(id, dto),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminBarberReviews'] });
      queryClient.invalidateQueries({ queryKey: ['barber-reviews'] });
      queryClient.invalidateQueries({ queryKey: ['my-barber-reviews'] });
      queryClient.invalidateQueries({ queryKey: ['barber'] });
      queryClient.invalidateQueries({ queryKey: ['barbers'] });
      queryClient.invalidateQueries({ queryKey: ['homeBarbers'] });
    },

    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'خطا در بررسی نظر');
    },
  });
};
