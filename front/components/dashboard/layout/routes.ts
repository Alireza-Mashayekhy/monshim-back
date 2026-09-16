import {
  CalendarDays,
  Clock,
  Gem,
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
    title: 'ساعت کاری',
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
    title: 'باشگاه مشتریان',
    href: '/dashboard/club',
  },
];
