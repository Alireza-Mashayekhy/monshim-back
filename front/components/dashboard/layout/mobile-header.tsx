'use client';

import { Bell, Menu } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/auth.store';

export default function MobileHeader() {
  const { user } = useAuthStore();

  return (
    <header className="lg:hidden sticky top-0 z-50 bg-white border-b h-16 px-4 flex items-center justify-between">
      <Button variant="ghost" size="icon">
        <Menu />
      </Button>

      <div className="text-center">
        <p className="text-xs text-slate-500">سلام 👋</p>

        <h2 className="font-bold">{user?.fullName}</h2>
      </div>

      <Button variant="ghost" size="icon">
        <Bell />
      </Button>
    </header>
  );
}
