import { ArrowUpRight, LucideIcon } from 'lucide-react';

import AppCard from '@/components/shared/app-card';
import { cn } from '@/lib/utils';

interface Props {
  title: string;
  value: string;
  icon: LucideIcon;
  growth?: string;
  className?: string;
}

export default function StatCard({
  title,
  value,
  icon: Icon,
  growth,
  className,
}: Props) {
  return (
    <AppCard className={cn('relative overflow-hidden group', className)}>
      <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-primary-50 transition-transform duration-300 group-hover:scale-125" />

      <div className="relative">
        <div className="flex items-center justify-between">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-100">
            <Icon className="text-primary" size={26} />
          </div>

          {growth && (
            <div className="rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-600">
              <ArrowUpRight size={14} className="inline ml-1" />

              {growth}
            </div>
          )}
        </div>

        <p className="mt-8 text-sm text-slate-500">{title}</p>

        <h2 className="mt-2 text-3xl font-bold tracking-tight">{value}</h2>
      </div>
    </AppCard>
  );
}
