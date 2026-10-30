import { Metadata } from 'next';

import AdminSidebar from '@/components/layout/admin/sidebar';
import SessionHydration from '@/components/shared/session-hydration';
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { TooltipProvider } from '@/components/ui/tooltip';
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
      {/* ترتیب مهم است: SessionHydration باید بالاتر از AuthProvider باشد. */}
      <SessionHydration>
        <AuthProvider>
          <TooltipProvider>
            <SidebarProvider>
              <AdminSidebar />

              <SidebarInset className="min-w-0 bg-primary-3">
                <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between border-b bg-white/95 px-3 backdrop-blur-sm md:hidden">
                  <div className="flex items-center gap-2">
                    <SidebarTrigger aria-label="باز کردن منو" />
                    <span className="text-sm font-bold">پنل مدیریت</span>
                  </div>
                  <span className="text-sm font-semibold text-muted-foreground">
                    Monshim
                  </span>
                </header>

                <div className="min-w-0 flex-1 p-3 sm:p-4 md:p-5">
                  {children}
                </div>
              </SidebarInset>
            </SidebarProvider>
          </TooltipProvider>
        </AuthProvider>
      </SessionHydration>
    </QueryProvider>
  );
}
