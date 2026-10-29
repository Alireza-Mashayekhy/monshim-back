import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { revalidatePublicBarberCache } from '@/lib/actions/public-page';

import {
  adminBarberManagementList,
  barberReviewListAdmin,
  deleteBarber,
  getBarberApprovalDetail,
  getBarberById,
  moderateBarberReview,
  notApprovedBarberList,
  reviewBarber,
  setBarberActive,
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

export const useAdminBarberManagementList = (params: {
  page?: number;
  search?: string;
  limit?: number;
}) => {
  return useQuery({
    queryKey: ['adminBarberManagement', params],
    queryFn: () =>
      adminBarberManagementList({
        page: params.page ?? 1,
        limit: params.limit ?? 10,
        search: params.search,
      }),
    staleTime: 60 * 1000,
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

/**
 * جزئیات آرایشگر برای صفحهٔ تایید؛ شناسهٔ ورودی User.id است
 * (همان شناسه‌ای که لیست آرایشگرهای در انتظار تایید برمی‌گرداند).
 */
export const useBarberApprovalDetail = (id: string) => {
  return useQuery({
    queryKey: ['adminBarberApproval', id],
    queryFn: () => getBarberApprovalDetail(id),
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

export const useSetBarberActive = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      setBarberActive(id, isActive),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ['adminBarberManagement'],
      });
      void queryClient.invalidateQueries({ queryKey: ['adminBarbers'] });
      void queryClient.invalidateQueries({ queryKey: ['barbers'] });
      void queryClient.invalidateQueries({ queryKey: ['homeBarbers'] });
      toast.success(
        variables.isActive
          ? 'آرایشگر دوباره فعال شد.'
          : 'آرایشگر غیرفعال شد و از فهرست‌های کاربران پنهان می‌شود.',
      );
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || 'تغییر وضعیت آرایشگر ناموفق بود.',
      );
    },
  });
};

export const useDeleteBarberProfile = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: number; slug?: string | null }) =>
      deleteBarber(id),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ['adminBarberManagement'],
      });
      void queryClient.invalidateQueries({ queryKey: ['adminBarbers'] });
      void queryClient.invalidateQueries({ queryKey: ['barbers'] });
      void queryClient.invalidateQueries({ queryKey: ['homeBarbers'] });
      void revalidatePublicBarberCache({
        userId: variables.id,
        slugs: variables.slug ? [variables.slug] : [],
      });
      toast.success('آرایشگر با موفقیت حذف شد.');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'حذف آرایشگر ناموفق بود.');
    },
  });
};

export const useReviewBarber = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      dto,
    }: {
      id: string;
      dto: ReviewBarberDto;
      /** اسلاگ صفحهٔ عمومی (اختیاری) برای پاک‌سازی دقیق مسیر `/barber/[slug]` */
      slug?: string | null;
    }) => reviewBarber(id, dto),

    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['adminBarbers'],
      });

      queryClient.invalidateQueries({
        queryKey: ['adminBarber', variables.id],
      });

      queryClient.invalidateQueries({
        queryKey: ['adminBarberApproval', variables.id],
      });

      queryClient.invalidateQueries({
        queryKey: ['barber'],
      });

      queryClient.invalidateQueries({
        queryKey: ['barbers'],
      });

      queryClient.invalidateQueries({
        queryKey: ['homeBarbers'],
      });

      queryClient.invalidateQueries({
        queryKey: ['my-barber-profile'],
      });

      // تایید/رد ادمین دیتابیس را همان لحظه تغییر می‌دهد، اما صفحهٔ عمومی
      // آرایشگر با ISR (۳۰۰ ثانیه) کش شده است؛ بدون این فراخوانی، اطلاعات
      // قدیمی (یا برای آرایشگرِ تازه‌تاییدشده، ۴۰۴) تا پایان بازه دیده می‌شد.
      void revalidatePublicBarberCache({
        userId: variables.id,
        slugs: variables.slug ? [variables.slug] : [],
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
      // تایید/رد نظر، امتیاز و تعداد نظرات را در پروفایل عمومی تغییر می‌دهد؛
      // کشِ SSR صفحهٔ عمومی هم باید تازه شود.
      void revalidatePublicBarberCache({});
    },

    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'خطا در بررسی نظر');
    },
  });
};
