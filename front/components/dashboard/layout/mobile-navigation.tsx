'use client';

import { UserRound } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { Drawer, DrawerContent } from '@/components/ui/drawer';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';

import BottomNavigation from './bottom-navigation';
import { dashboardRoutes } from './routes';

export default function MobileNavigation() {
  const [open, setOpen] = useState(false);
  const { user } = useAuthStore();

  return (
    <>
      <header className="lg:hidden sticky top-0 z-40 h-16 bg-primary-3/90 backdrop-blur-xl border-b border-primary/10">
        <div className="h-full px-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-full bg-primary-2 text-primary flex items-center justify-center font-black border-2 border-white shadow-sm ring-1 ring-primary/20 overflow-hidden">
              {user?.fullName?.charAt(0) || <UserRound size={18} />}
            </div>
            <div className="text-right">
              <p className="text-[11px] text-gray-400 font-medium">سلام 👋</p>

              <p className="text-sm font-black text-gray-900 tracking-tight">
                {user?.fullName}
              </p>
            </div>
          </div>
        </div>
      </header>

      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent>
          <div className="grid grid-cols-4 gap-5 px-5 py-10">
            {dashboardRoutes.map(route => {
              return (
                <MobileMenuItem
                  key={route.href}
                  {...route}
                  onClick={() => setOpen(false)}
                />
              );
            })}
          </div>
        </DrawerContent>
      </Drawer>

      <BottomNavigation onMoreClick={() => setOpen(true)} />
    </>
  );
}

interface MobileMenuItemProps {
  title: string;
  href: string;
  icon: React.ElementType;
  onClick: () => void;
}

function MobileMenuItem({
  title,
  href,
  icon: Icon,
  onClick,
}: MobileMenuItemProps) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn('flex flex-col justify-center items-center gap-2')}
    >
      <div className="w-[70%] aspect-square rounded-lg flex items-center justify-center bg-primary text-white">
        <Icon size={24} />
      </div>

      <span className="text-sm font-medium flex-1">{title}</span>
    </Link>
  );
}
