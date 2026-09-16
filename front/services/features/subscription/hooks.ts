import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import {
  createSubscriptionPlan,
  createUserSubscription,
  deleteSubscriptionPlan,
  getActiveSubscriptionPlans,
  getCurrentUserSubscription,
  getSubscriptionPlans,
  getUserSubscriptions,
  toggleSubscriptionPlan,
  updateSubscriptionPlan,
} from './api';
import { CreateSubscriptionPlanDto, UpdateSubscriptionPlanDto } from './types';

export const subscriptionKeys = {
  all: ['subscriptions'] as const,

  admin: () => [...subscriptionKeys.all, 'admin'] as const,
  adminList: () => [...subscriptionKeys.admin(), 'list'] as const,
  activePlans: () => [...subscriptionKeys.all, 'active-plans'] as const,

  user: () => [...subscriptionKeys.all, 'user'] as const,
  current: () => [...subscriptionKeys.user(), 'current'] as const,
  history: () => [...subscriptionKeys.user(), 'history'] as const,
};

// =========================
// ADMIN
// =========================

export function useSubscriptionPlans() {
  return useQuery({
    queryKey: subscriptionKeys.adminList(),
    queryFn: getSubscriptionPlans,
    staleTime: 2 * 60 * 1000,
  });
}

export function useCreateSubscriptionPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreateSubscriptionPlanDto) => createSubscriptionPlan(dto),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: subscriptionKeys.all,
      });

      toast.success('پلن اشتراک با موفقیت ایجاد شد');
    },

    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'خطا در ایجاد پلن اشتراک');
    },
  });
}

export function useUpdateSubscriptionPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateSubscriptionPlanDto }) =>
      updateSubscriptionPlan(id, dto),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: subscriptionKeys.all,
      });

      toast.success('پلن اشتراک با موفقیت ویرایش شد');
    },

    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'خطا در ویرایش پلن اشتراک');
    },
  });
}

export function useDeleteSubscriptionPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteSubscriptionPlan,

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: subscriptionKeys.all,
      });

      toast.success('پلن اشتراک حذف شد');
    },

    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'خطا در حذف پلن اشتراک');
    },
  });
}

export function useToggleSubscriptionPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: toggleSubscriptionPlan,

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: subscriptionKeys.all,
      });

      toast.success('وضعیت پلن تغییر کرد');
    },

    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'خطا در تغییر وضعیت پلن');
    },
  });
}

// =========================
// USER
// =========================

export function useActiveSubscriptionPlans() {
  return useQuery({
    queryKey: subscriptionKeys.activePlans(),
    queryFn: getActiveSubscriptionPlans,
    staleTime: 2 * 60 * 1000,
  });
}

export function useCurrentUserSubscription() {
  return useQuery({
    queryKey: subscriptionKeys.current(),
    queryFn: getCurrentUserSubscription,
    staleTime: 60 * 1000,
  });
}

export function useUserSubscriptions() {
  return useQuery({
    queryKey: subscriptionKeys.history(),
    queryFn: getUserSubscriptions,
    staleTime: 2 * 60 * 1000,
  });
}

export function useCreateUserSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createUserSubscription,

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: subscriptionKeys.user(),
      });

      toast.success('اشتراک با موفقیت فعال شد');
    },

    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'خطا در فعال‌سازی اشتراک');
    },
  });
}
