export const PLAN_DURATION_DAYS = 30;

export interface SubscriptionPlanDefinition {
  planKey: string;
  name: string;
  smsCount: number;
  price: number;
  durationDays: number;
  description: string;
  sortOrder: number;
}

export const SUBSCRIPTION_PLANS: SubscriptionPlanDefinition[] = [
  {
    planKey: 'starter',
    name: 'پلن آغاز',
    smsCount: 100,
    price: 59000,
    durationDays: PLAN_DURATION_DAYS,
    description: 'مناسب سالن‌های تازه‌کار یا سالن‌هایی که رزرو کمی دارند.',
    sortOrder: 1,
  },
  {
    planKey: 'basic',
    name: 'پلن پایه',
    smsCount: 300,
    price: 169000,
    durationDays: PLAN_DURATION_DAYS,
    description: 'مناسب سالن‌های کم‌رزرو و متوسط.',
    sortOrder: 2,
  },
  {
    planKey: 'growth',
    name: 'پلن رشد',
    smsCount: 700,
    price: 379000,
    durationDays: PLAN_DURATION_DAYS,
    description: 'مناسب سالن‌هایی که تعداد رزرو روزانه بیشتری دارند.',
    sortOrder: 3,
  },
  {
    planKey: 'pro',
    name: 'پلن حرفه‌ای',
    smsCount: 1500,
    price: 799000,
    durationDays: PLAN_DURATION_DAYS,
    description: 'پیشنهاد ما برای سالن‌های فعال.',
    sortOrder: 4,
  },
  {
    planKey: 'premium',
    name: 'پلن ویژه',
    smsCount: 3000,
    price: 1549000,
    durationDays: PLAN_DURATION_DAYS,
    description: 'مناسب سالن‌های پرمشتری و چندنفره.',
    sortOrder: 5,
  },
];
