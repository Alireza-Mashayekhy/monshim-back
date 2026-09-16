import { api } from '@/services/api/client';
import { endpoints } from '@/services/api/endpoints';
import { ApiListResponse, ApiSingleResponse } from '@/services/api/types';

import {
  CreateSubscriptionPlanDto,
  SubscriptionPlan,
  UpdateSubscriptionPlanDto,
  UserSubscription,
} from './types';

// Admin
export async function getSubscriptionPlans() {
  const { data } = await api.get<ApiListResponse<SubscriptionPlan>>(
    endpoints.subscription.list,
  );

  return data;
}

export async function getActiveSubscriptionPlans() {
  const { data } = await api.get<ApiListResponse<SubscriptionPlan>>(
    endpoints.userSubscription.active,
  );

  return data;
}

export async function getSubscriptionPlan(id: string) {
  const { data } = await api.get<ApiSingleResponse<SubscriptionPlan>>(
    endpoints.subscription.detail(id),
  );

  return data;
}

export async function createSubscriptionPlan(dto: CreateSubscriptionPlanDto) {
  const { data } = await api.post<ApiSingleResponse<SubscriptionPlan>>(
    endpoints.subscription.create,
    dto,
  );

  return data;
}

export async function updateSubscriptionPlan(
  id: string,
  dto: UpdateSubscriptionPlanDto,
) {
  const { data } = await api.patch<ApiSingleResponse<SubscriptionPlan>>(
    endpoints.subscription.update(id),
    dto,
  );

  return data;
}

export async function deleteSubscriptionPlan(id: string) {
  const { data } = await api.delete(endpoints.subscription.delete(id));

  return data;
}

export async function toggleSubscriptionPlan(id: string) {
  const { data } = await api.patch<ApiSingleResponse<SubscriptionPlan>>(
    endpoints.subscription.toggleActive(id),
  );

  return data;
}

// User Subscription

export async function getCurrentUserSubscription() {
  const { data } = await api.get<ApiSingleResponse<UserSubscription | null>>(
    endpoints.userSubscription.current,
  );

  return data;
}

export async function getUserSubscriptions() {
  const { data } = await api.get<ApiListResponse<UserSubscription>>(
    endpoints.userSubscription.list,
  );

  return data;
}

export async function createUserSubscription(subscriptionPlanId: string) {
  const { data } = await api.post<ApiSingleResponse<UserSubscription>>(
    endpoints.userSubscription.create,
    {
      subscriptionPlanId,
    },
  );

  return data;
}
