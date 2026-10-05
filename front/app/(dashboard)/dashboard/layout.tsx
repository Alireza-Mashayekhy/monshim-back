import { Metadata } from 'next';

import DesktopSidebar from '@/components/dashboard/layout/desktop-sidebar';
import MobileNavigation from '@/components/dashboard/layout/mobile-navigation';
import SessionHydration from '@/components/shared/session-hydration';
import AuthProvider from '@/providers/auth.provider';

export const metadata: Metadata = {
  title: {
    default: 'داشبورد',
    template: '%s | منشیم',
  },
  description: 'داشبورد مدیریت آرایشگاه منشیم',
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <SessionHydration>
      <AuthProvider>
        <div className="min-h-screen bg-primary-3">
          <DesktopSidebar />

          <div className="lg:mr-60">
            <MobileNavigation />

            <main className="p-4 lg:p-5 pb-28 lg:pb-8">{children}</main>
          </div>
        </div>
      </AuthProvider>
    </SessionHydration>
  );
}
