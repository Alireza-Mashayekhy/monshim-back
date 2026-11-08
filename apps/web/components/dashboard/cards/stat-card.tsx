import { ArrowUpLeft, LucideIcon } from 'lucide-react';
import Link from 'next/link';

import AppCard from '@/components/shared/app-card';
import { cn } from '@/lib/utils';

interface Props {
  title: string;
  value: string;
  icon: LucideIcon;
  sub?: string;
  action?: {
    label: string;
    href: string;
  };
  className?: string;
}

export default function StatCard({
  title,
  value,
  icon: Icon,
  sub,
  action,
  className,
}: Props) {
  return (
    <AppCard className={cn('p-4', className)}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-bold text-gray-500 truncate">{title}</p>

        <div className="w-9 h-9 rounded-xl bg-primary-2 text-primary flex items-center justify-center shrink-0">
          <Icon size={18} />
        </div>
      </div>

      <h2 className="mt-3 text-lg sm:text-2xl font-black text-gray-900 leading-none tracking-tight break-words">
        {value}
      </h2>

      {(sub || action) && (
        <div className="mt-2.5 flex items-center justify-between gap-2">
          <span className="text-[11px] text-gray-400 font-medium truncate">
            {sub}
          </span>

          {action && (
            <Link
              href={action.href}
              className="text-[11px] font-black text-primary whitespace-nowrap inline-flex items-center gap-0.5 hover:underline"
            >
              {action.label}
              <ArrowUpLeft size={12} />
            </Link>
          )}
        </div>
      )}
    </AppCard>
  );
}
