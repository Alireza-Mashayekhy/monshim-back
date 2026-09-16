interface DashboardShellProps {
  children: React.ReactNode;
}

export default function DashboardShell({ children }: DashboardShellProps) {
  return <div className="space-y-2 lg:space-y-5">{children}</div>;
}
