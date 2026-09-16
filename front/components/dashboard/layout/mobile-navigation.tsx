'use client';

import { Bell, ChevronLeft, LogOut, Menu, UserRound } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';

import BottomNavigation from './bottom-navigation';
import { dashboardRoutes } from './routes';

export default function MobileNavigation() {
  const [open, setOpen] = useState(false);
  const { user } = useAuthStore();

  return (
    <>
      <header className="lg:hidden sticky top-0 z-40 h-16 bg-white/90 backdrop-blur-xl border-b">
        <div className="h-full px-4 flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-xl"
            onClick={() => setOpen(true)}
          >
            <Menu size={22} />
          </Button>

          <div className="flex items-center gap-2">
            <div className="text-right">
              <p className="text-[11px] text-slate-400">سلام 👋</p>

              <p className="text-sm font-bold text-slate-800">
                {user?.fullName}
              </p>
            </div>

            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <UserRound size={19} />
            </div>
          </div>

          <Button variant="ghost" size="icon" className="rounded-xl relative">
            <Bell size={21} />

            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-500 border-2 border-white" />
          </Button>
        </div>
      </header>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="w-[85%] max-w-sm p-0 flex flex-col"
        >
          <SheetHeader className="p-5 border-b text-right">
            <SheetTitle className="text-right">منوی مدیریت</SheetTitle>
          </SheetHeader>

          <div className="p-4">
            <div className="rounded-2xl bg-primary/5 border border-primary/10 p-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-primary text-white flex items-center justify-center">
                  <UserRound size={22} />
                </div>

                <div>
                  <p className="font-bold text-slate-800">{user?.fullName}</p>

                  <p className="text-xs text-slate-500 mt-1">مدیریت سالن</p>
                </div>
              </div>
            </div>

            <nav className="space-y-1.5">
              {dashboardRoutes.map(route => {
                return (
                  <MobileMenuItem
                    key={route.href}
                    {...route}
                    onClick={() => setOpen(false)}
                  />
                );
              })}
            </nav>
          </div>

          <div className="mt-auto p-4 border-t">
            <button
              type="button"
              className="w-full h-12 rounded-xl flex items-center gap-3 px-4 text-red-500 hover:bg-red-50 transition-colors"
            >
              <LogOut size={19} />

              <span className="text-sm font-medium">خروج از حساب</span>
            </button>
          </div>
        </SheetContent>
      </Sheet>

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
  const pathname =
    typeof window !== 'undefined' ? window.location.pathname : '';

  const active =
    href === '/dashboard'
      ? pathname === href
      : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <a
      href={href}
      onClick={onClick}
      className={cn(
        'h-12 rounded-xl flex items-center gap-3 px-3 transition-all',
        active
          ? 'bg-primary text-white shadow-sm'
          : 'text-slate-600 hover:bg-slate-100',
      )}
    >
      <Icon size={19} />

      <span className="text-sm font-medium flex-1">{title}</span>

      <ChevronLeft
        size={16}
        className={cn(active ? 'opacity-80' : 'text-slate-300')}
      />
    </a>
  );
}
