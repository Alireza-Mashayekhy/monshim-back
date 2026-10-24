import {
  CalendarDays,
  Clock,
  Gem,
  Globe,
  LayoutDashboard,
  Scissors,
  UserRound,
  Users,
  Wallet,
} from 'lucide-react';

export const dashboardRoutes = [
  {
    title: 'داشبورد',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'نوبت‌ها',
    href: '/dashboard/appointments',
    icon: CalendarDays,
  },
  {
    title: 'خدمات',
    href: '/dashboard/services',
    icon: Scissors,
  },
  {
    title: 'ساعات رزرو',
    href: '/dashboard/work-hours',
    icon: Clock,
  },
  {
    title: 'پروفایل',
    href: '/dashboard/profile',
    icon: UserRound,
  },
  { icon: Wallet, title: 'امور مالی', href: '/dashboard/financial' },
  { icon: Gem, title: 'اشتراک', href: '/dashboard/subscription' },
  {
    icon: Users,
    title: 'مشتریان',
    href: '/dashboard/club',
  },
  /**
   * صفحهٔ اختصاصی/عمومی آرایشگاه (`/barber/[id]`) — خرید پکیج یا پیشرفت به
   * سمت ۳۰۰ نوبتِ پرداخت‌شده. در انتهای فهرست نگه داشته شده چون منوی موبایل
   * با اندیس به آیتم‌ها اشاره می‌کند.
   */
  {
    icon: Globe,
    title: 'صفحهٔ اختصاصی',
    href: '/dashboard/public-page',
  },
];
