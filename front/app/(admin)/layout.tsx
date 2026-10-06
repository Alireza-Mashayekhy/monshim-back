import { Metadata } from 'next';

import AdminSidebar from '@/components/layout/admin/sidebar';
import SessionHydration from '@/components/shared/session-hydration';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import AuthProvider from '@/providers/auth.provider';
import QueryProvider from '@/providers/query-provider';

export const metadata: Metadata = {
  title: {
    default: 'پنل مدیریت',
    template: '%s | منشیم',
  },
  description: 'پنل مدیریت سامانه منشیم',
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
};

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <QueryProvider>
      <AuthProvider>
        <SessionHydration>
          <SidebarProvider>
            <AdminSidebar />

            <SidebarInset className="bg-border">
              <main className="p-4">{children}</main>
            </SidebarInset>
          </SidebarProvider>
        </SessionHydration>
      </AuthProvider>
    </QueryProvider>
  );
}
