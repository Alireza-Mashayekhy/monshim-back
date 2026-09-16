import AdminSidebar from '@/components/layout/admin/sidebar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <SidebarProvider>
      <AdminSidebar />

      <SidebarInset className="bg-border">
        <main className="p-4">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
