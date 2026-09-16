import DesktopSidebar from './desktop-sidebar';
import MobileNavigation from './mobile-navigation';

interface Props {
  children: React.ReactNode;
}

export default function AppShell({ children }: Props) {
  return (
    <div className="min-h-screen bg-slate-50">
      <DesktopSidebar />

      <div className="lg:mr-60">
        <MobileNavigation />

        <main className="p-2 lg:p-5 pb-24 lg:pb-8">{children}</main>
      </div>
    </div>
  );
}
