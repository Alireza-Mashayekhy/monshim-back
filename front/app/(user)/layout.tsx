import { Metadata } from 'next';

import UserLayoutClient from '@/components/layout/public/client';
import SessionHydration from '@/components/shared/session-hydration';
import AuthProvider from '@/providers/auth.provider';

export const metadata: Metadata = {
  title: {
    default: 'منشیم | رزرو آنلاین آرایشگاه',
    template: '%s | منشیم',
  },
  description: 'سامانه رزرو آنلاین آرایشگاه منشیم',
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
};

interface UserLayoutProps {
  children: React.ReactNode;
  showNav?: boolean;
}

export default function UserLayout({
  children,
  showNav = true,
}: UserLayoutProps) {
  return (
    <SessionHydration>
      <AuthProvider>
        <UserLayoutClient showNav={showNav}>{children}</UserLayoutClient>
      </AuthProvider>
    </SessionHydration>
  );
}
