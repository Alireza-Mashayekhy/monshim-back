import { Metadata } from 'next';

import UserLayoutClient from '@/components/layout/public/client';

export const metadata: Metadata = {
  title: {
    default: 'منشیم | رزرو آنلاین آرایشگاه',
    template: '%s | منشیم',
  },
  description: 'سامانه رزرو آنلاین آرایشگاه منشیم',
};

interface UserLayoutProps {
  children: React.ReactNode;
  showNav?: boolean;
}

export default function UserLayout({
  children,
  showNav = true,
}: UserLayoutProps) {
  return <UserLayoutClient showNav={showNav}>{children}</UserLayoutClient>;
}
