export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  durationDays: number;
  description: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSubscriptionPlanDto {
  name: string;
  price: number;
  durationDays: number;
  description?: string | null;
  isActive?: boolean;
  sortOrder?: number;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface UpdateSubscriptionPlanDto extends Partial<CreateSubscriptionPlanDto> {}

export type UserSubscriptionStatus = 'ACTIVE' | 'EXPIRED';

export interface UserSubscription {
  id: string;
  userId: number;
  subscriptionPlanId: string;
  price: number;
  status: UserSubscriptionStatus;
  startDate: string;
  endDate: string;
  createdAt: string;
  updatedAt: string;
  subscriptionPlan: SubscriptionPlan;
}
