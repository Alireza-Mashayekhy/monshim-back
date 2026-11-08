export interface SubscriptionPlan {
  id: string;
  planKey: string | null;
  name: string;
  smsCount: number;
  price: number;
  durationDays: number;
  description: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateSubscriptionPlanDto {
  price: number;
  smsCount: number;
}

export type UserSubscriptionStatus = 'active' | 'expired' | 'canceled';

export interface UserSubscription {
  id: string;
  userId: number;
  subscriptionPlanId: string;
  price: number;
  smsTotal: number;
  smsUsed: number;
  status: UserSubscriptionStatus;
  startDate: string;
  endDate: string;
  createdAt: string;
  updatedAt: string;
  subscriptionPlan: SubscriptionPlan;
}

export interface SmsUsage {
  id: string;
  userId: number;
  userSubscriptionId: string;
  count: number;
  reason: string;
  createdAt: string;
}
