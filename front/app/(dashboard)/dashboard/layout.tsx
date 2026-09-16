import AppShell from '@/components/dashboard/layout/app-shell';

export default function Layout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
