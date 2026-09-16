import { cn } from '@/lib/utils';

interface Props {
  children: React.ReactNode;
  className?: string;
}

export default function AppCard({ children, className }: Props) {
  return (
    <div
      className={cn(
        `rounded-[28px] border bg-white p-5 shadow-[0_4px_20px_rgba(15,23,42,0.04)]`,
        className,
      )}
    >
      {children}
    </div>
  );
}
