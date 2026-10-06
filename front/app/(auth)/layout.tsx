import type { Metadata } from 'next';

import SessionHydration from '@/components/shared/session-hydration';
import AuthProvider from '@/providers/auth.provider';
import QueryProvider from '@/providers/query-provider';

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
};

export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <SessionHydration>
      <AuthProvider>
        <QueryProvider>{children}</QueryProvider>
      </AuthProvider>
    </SessionHydration>
  );
}
