import {
  Crown,
  type LucideIcon,
  Rocket,
  Sparkles,
  Star,
  Zap,
} from 'lucide-react';

export interface SubscriptionPlanDisplay {
  planKey: string;
  name: string;
  bookingsLabel: string;
  description: string;
  recommended?: boolean;
}

export const SUBSCRIPTION_PLAN_DISPLAY: Record<
  string,
  SubscriptionPlanDisplay
> = {
  starter: {
    planKey: 'starter',
    name: 'پلن آغاز',
    bookingsLabel: 'مناسب حدود ۰ تا ۲۵ رزرو',
    description: 'مناسب سالن‌های تازه‌کار یا سالن‌هایی که رزرو کمی دارند.',
  },
  basic: {
    planKey: 'basic',
    name: 'پلن پایه',
    bookingsLabel: 'مناسب حدود ۷۰ تا ۷۵ رزرو',
    description: 'مناسب سالن‌های کم‌رزرو و متوسط.',
  },
  growth: {
    planKey: 'growth',
    name: 'پلن رشد',
    bookingsLabel: 'مناسب حدود ۱۷۰ تا ۱۷۵ رزرو',
    description: 'مناسب سالن‌هایی که تعداد رزرو روزانه بیشتری دارند.',
  },
  pro: {
    planKey: 'pro',
    name: 'پلن حرفه‌ای',
    bookingsLabel: 'مناسب حدود ۳۷۵ رزرو',
    description: 'پیشنهاد ما برای سالن‌های فعال.',
    recommended: true,
  },
  premium: {
    planKey: 'premium',
    name: 'پلن ویژه',
    bookingsLabel: 'مناسب حدود ۷۵۰ رزرو',
    description: 'مناسب سالن‌های پرمشتری و چندنفره.',
  },
};

export const SUBSCRIPTION_PLAN_ICONS: Record<string, LucideIcon> = {
  starter: Sparkles,
  basic: Zap,
  growth: Rocket,
  pro: Crown,
  premium: Star,
};

export const DEFAULT_PLAN_ICON = Sparkles;
