import DesktopSidebar from '@/components/dashboard/layout/desktop-sidebar';
import MobileNavigation from '@/components/dashboard/layout/mobile-navigation';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-primary-3">
      <DesktopSidebar />

      <div className="lg:mr-60">
        <MobileNavigation />

        <main className="p-4 lg:p-5 pb-28 lg:pb-8">{children}</main>
      </div>
    </div>
  );
}
