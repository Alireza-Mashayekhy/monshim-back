import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import {
  getActiveSubscriptionPlans,
  getCurrentUserSubscription,
  getSmsUsage,
  getSubscriptionPlans,
  getUserSubscriptions,
  updateSubscriptionPlan,
} from './api';
import { UpdateSubscriptionPlanDto } from './types';

export const subscriptionKeys = {
  all: ['subscriptions'] as const,

  admin: () => [...subscriptionKeys.all, 'admin'] as const,
  adminList: () => [...subscriptionKeys.admin(), 'list'] as const,
  activePlans: () => [...subscriptionKeys.all, 'active-plans'] as const,

  user: () => [...subscriptionKeys.all, 'user'] as const,
  current: () => [...subscriptionKeys.user(), 'current'] as const,
  history: () => [...subscriptionKeys.user(), 'history'] as const,
  smsUsage: () => [...subscriptionKeys.user(), 'sms-usage'] as const,
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

export function useSmsUsage() {
  return useQuery({
    queryKey: subscriptionKeys.smsUsage(),
    queryFn: getSmsUsage,
    staleTime: 60 * 1000,
  });
}
