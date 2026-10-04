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
    barberManagement: '/barber-management',
    onlineBooking: '/online-barber-booking',
    pricing: '/pricing',
    explore: '/explore',
    privacy: '/privacy',
    terms: '/terms',
    login: '/login',
    register: '/register',
    barberSignup: '/barbaer-signup',
  },
} as const;

export type SiteRoute = keyof typeof siteConfig.routes;
