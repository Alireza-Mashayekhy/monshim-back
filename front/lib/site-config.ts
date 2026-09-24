/**
 * پیکربندی سراسری سایت — تنها منبع حقیقت برای دامنه، برند و متادیتای مشترک
 * صفحات لندینگ (home، barber-management، online-barber-booking، pricing).
 *
 * اگر دامنه تغییر کرد فقط همین فایل را ویرایش کنید.
 */
export const siteConfig = {
  /** دامنه اصلی سایت (بدون اسلش انتهایی) */
  url: 'https://monshiim.ir',
  /** نام برند — به فارسی و انگلیسی */
  name: 'منشیم',
  nameEn: 'Monshim',
  /** توضیح کوتاه برند برای تگ‌های متا */
  description:
    'منشیم (Monshim) پلتفرم رزرو آنلاین آرایشگاه و نرم‌افزار مدیریت آرایشگاه است؛ نوبت‌دهی آنلاین، مدیریت مشتریان و گزارش‌گیری مالی را یکجا در اختیار شما می‌گذارد.',
  locale: 'fa_IR',
  twitter: '@monshim',
  keywords: [
    'منشیم',
    'Monshim',
    'رزرو آنلاین آرایشگاه',
    'نوبت دهی آرایشگاه',
    'نوبت دهی آنلاین آرایشگاه',
    'نرم افزار مدیریت آرایشگاه',
    'مدیریت آرایشگاه',
    'رزرو آرایشگاه',
    'رزرو اینترنتی آرایشگاه مردانه',
    'نرم افزار آرایشگاه',
    'سیستم نوبت دهی سالن زیبایی',
    'برنامه مدیریت آرایشگاه',
    'آنلاین بکینگ آرایشگاه',
  ],
  /**
   * مسیرهای عمومی برای سitemap و ناوبری — همان چهار لندینگ اصلی
   */
  routes: {
    home: '/',
    barberManagement: '/barber-management',
    onlineBooking: '/online-barber-booking',
    pricing: '/pricing',
    login: '/login',
    register: '/register',
    barberSignup: '/barbaer-signup',
  },
} as const;

export type SiteRoute = keyof typeof siteConfig.routes;
