/** Shared public site identity and canonical URL configuration. */
export const siteConfig = {
  url: 'https://monshiim.ir',
  name: 'منشیم',
  nameEn: 'Monshim',
  description:
    'منشیم (Monshim) پلتفرم رزرو آنلاین آرایشگاه و نرم‌افزار مدیریت آرایشگاه است؛ نوبت‌دهی، مدیریت مشتریان و گزارش مالی سالن را در یک سامانه در اختیار شما می‌گذارد.',
  locale: 'fa_IR',
  routes: {
    home: '/',
    providerManagement: '/provider-management',
    onlineBooking: '/online-provider-booking',
    pricing: '/pricing',
    explore: '/panel/explore',
    privacy: '/privacy',
    terms: '/terms',
    login: '/login',
    register: '/register',
    providerSignup: '/provider-signup',
    publicProvider: (id: number | string) => `/provider/${id}`,
  },
  /** مسیرهای داخل پنل کاربر (نیازمند ورود) */
  panel: {
    home: '/panel/home',
    explore: '/panel/explore',
    appointments: '/panel/appointments',
    profile: '/panel/profile',
    support: '/panel/support',
    provider: (id: number | string) => `/panel/provider/${id}`,
  },
} as const;

export type SiteRoute = Exclude<
  keyof typeof siteConfig.routes,
  'publicProvider'
>;
