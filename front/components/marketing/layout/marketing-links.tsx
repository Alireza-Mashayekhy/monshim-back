import { siteConfig } from '@/lib/site-config';

export interface NavLink {
  href: string;
  label: string;
  title: string;
  hint?: string;
}

/**
 * لینک‌های ناوبری صفحات لندینگ — با انکرتکست حاوی کلمات کلیدی هدف
 * (نام لینک و ویژگی title آن هر دو برای سئو اهمیت دارند).
 */
export const NAV_LINKS: NavLink[] = [
  {
    href: siteConfig.routes.onlineBooking,
    label: 'برای مشتریان',
    title: 'رزرو آنلاین آرایشگاه و نوبت دهی اینترنتی در منشیم',
    hint: 'پیدا کردن آرایشگاه و رزرو آنلاین',
  },
  {
    href: siteConfig.routes.barberManagement,
    label: 'برای آرایشگران',
    title: 'نرم افزار مدیریت آرایشگاه منشیم',
    hint: 'مدیریت سالن، نوبت‌ها و درآمد',
  },
  {
    href: '/#features',
    label: 'امکانات',
    title: 'امکانات نرم افزار مدیریت آرایشگاه و رزرو آنلاین منشیم',
    hint: 'تقویم، مشتریان، مالی و پیامک',
  },
  {
    href: siteConfig.routes.pricing,
    label: 'تعرفه‌ها',
    title: 'تعرفه و قیمت پلن‌های منشیم',
    hint: 'قیمت پلن‌های اشتراک',
  },
];

export const SEO_LINKS: NavLink[] = [
  {
    href: siteConfig.routes.home,
    label: 'منشیم',
    title: 'منشیم | سامانه رزرو آنلاین آرایشگاه',
  },
  {
    href: siteConfig.routes.barberManagement,
    label: 'نرم افزار مدیریت آرایشگاه',
    title: 'نرم افزار مدیریت آرایشگاه منشیم',
  },
  {
    href: siteConfig.routes.onlineBooking,
    label: 'رزرو آنلاین آرایشگاه',
    title: 'رزرو آنلاین آرایشگاه و نوبت دهی اینترنتی در منشیم',
  },
  {
    href: siteConfig.routes.pricing,
    label: 'تعرفه‌ها',
    title: 'تعرفه و قیمت پلن‌های منشیم',
  },
];
