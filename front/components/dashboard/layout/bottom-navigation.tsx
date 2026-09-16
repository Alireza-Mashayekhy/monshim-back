'use client';

import { MoreHorizontal } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cn } from '@/lib/utils';

import { dashboardRoutes } from './routes';

interface Props {
  onMoreClick: () => void;
}

const mobileRoutes = [
  dashboardRoutes[0], // داشبورد
  dashboardRoutes[1], // نوبت‌ها
  dashboardRoutes[2], // خدمات
  dashboardRoutes[4], // پروفایل
];

export default function BottomNavigation({ onMoreClick }: Props) {
  const pathname = usePathname();

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-50 px-3 pb-3">
      <div className="h-[68px] rounded-2xl bg-white/95 backdrop-blur-xl border shadow-[0_8px_30px_rgba(0,0,0,0.08)]">
        <div className="grid grid-cols-5 h-full">
          {mobileRoutes.map(item => {
            const Icon = item.icon;

            const active =
              item.href === '/dashboard'
                ? pathname === item.href
                : pathname === item.href ||
                  pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center justify-center gap-1"
              >
                <div
                  className={cn(
                    'rounded-xl flex items-center justify-center transition-all',
                    active ? 'bg-primary/10' : 'bg-transparent',
                  )}
                >
                  <Icon
                    size={20}
                    strokeWidth={active ? 2.4 : 2}
                    className={cn(active ? 'text-primary' : 'text-slate-400')}
                  />
                </div>

                <span
                  className={cn(
                    'text-[10px] font-medium',
                    active ? 'text-primary' : 'text-slate-400',
                  )}
                >
                  {item.title}
                </span>
              </Link>
            );
          })}

          <button
            type="button"
            onClick={onMoreClick}
            className="flex flex-col items-center justify-center gap-1"
          >
            <div className="rounded-xl flex items-center justify-center">
              <MoreHorizontal size={21} className="text-slate-400" />
            </div>

            <span className="text-[10px] font-medium text-slate-400">
              بیشتر
            </span>
          </button>
        </div>
      </div>
    </nav>
  );
}
