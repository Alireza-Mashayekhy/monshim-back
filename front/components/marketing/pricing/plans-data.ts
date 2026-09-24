/**
 * پلن‌های اشتراک منشیم — دقیقاً هماهنگ با منبع حقیقت پروژه:
 * back/src/subscription/constants.ts (قیمت و تعداد پیامک) و
 * front/constants/subscription-plans.ts (نام و توضیح پلن‌ها).
 * تفاوت پلن‌ها فقط در تعداد پیامک ماهانه است؛ همه امکانات در همه پلن‌ها فعال است.
 */
export interface PricingPlan {
  key: string;
  name: string;
  /** توضیح کوتاه پلن — عیناً از constants/subscription-plans.ts */
  description: string;
  /** قیمت ماهانه به تومان — عیناً از back/src/subscription/constants.ts */
  monthlyPrice: number;
  /** سهمیه پیامک ماهانه پلن */
  smsCount: number;
  recommended?: boolean;
  /** برچسب حجم کار — هماهنگ با برچسب‌های پنل کاربری */
  bookingsLabel: string;
}

export const PRICING_PLANS: PricingPlan[] = [
  {
    key: 'starter',
    name: 'پلن آغاز',
    description: 'مناسب سالن‌های تازه‌کار یا سالن‌هایی که رزرو کمی دارند.',
    monthlyPrice: 59000,
    smsCount: 100,
    bookingsLabel: 'مناسب حدود ۲۵ رزرو در ماه',
  },
  {
    key: 'basic',
    name: 'پلن پایه',
    description: 'مناسب سالن‌های کم‌رزرو و متوسط.',
    monthlyPrice: 169000,
    smsCount: 300,
    bookingsLabel: 'مناسب حدود ۷۵ رزرو در ماه',
  },
  {
    key: 'growth',
    name: 'پلن رشد',
    description: 'مناسب سالن‌هایی که تعداد رزرو روزانه بیشتری دارند.',
    monthlyPrice: 379000,
    smsCount: 700,
    bookingsLabel: 'مناسب حدود ۱۷۵ رزرو در ماه',
  },
  {
    key: 'pro',
    name: 'پلن حرفه‌ای',
    description: 'پیشنهاد ما برای سالن‌های فعال.',
    monthlyPrice: 799000,
    smsCount: 1500,
    recommended: true,
    bookingsLabel: 'مناسب حدود ۳۷۵ رزرو در ماه',
  },
  {
    key: 'premium',
    name: 'پلن ویژه',
    description: 'مناسب سالن‌های پرمشتری و چندنفره.',
    monthlyPrice: 1549000,
    smsCount: 3000,
    bookingsLabel: 'مناسب حدود ۷۵۰ رزرو در ماه',
  },
];

/** امکانات مشترک همه پلن‌ها — بر اساس امکانات واقعی پلتفرم */
export const COMMON_PLAN_FEATURES = [
  'نوبت دهی آنلاین ۲۴ ساعته با جلوگیری از تداخل نوبت‌ها',
  'صفحه اختصاصی آرایشگاه با گالری نمونه‌کار',
  'تقویم هوشمند و مدیریت نوبت‌ها (تأیید، لغو، ثبت دستی)',
  'باشگاه مشتریان با گروه‌بندی مشتری‌ها',
  'پرداخت آنلاین نوبت‌ها با درگاه امن و کیف پول',
  'یادآوری پیامکی نوبت و ارسال لینک بیعانه',
] as const;

export const formatToman = (amount: number): string =>
  amount.toLocaleString('fa-IR');
