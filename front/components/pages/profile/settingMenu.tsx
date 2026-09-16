// components/profile/SettingsMenu.tsx
'use client';

import { Headphones, LogOut, MessageSquare, Share2 } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';

interface SettingsMenuProps {
  onSupport: () => void;
  onShare: () => void;
  onFeedback: () => void;
  onLogout: () => void;
}

export const SettingsMenu: React.FC<SettingsMenuProps> = ({
  onSupport,
  onShare,
  onFeedback,
  onLogout,
}) => {
  const menuItems = [
    {
      icon: Headphones,
      label: 'پشتیبانی آنلاین',
      onClick: onSupport,
      href: '/support',
    },
    {
      icon: Share2,
      label: 'معرفی به دوستان',
      onClick: onShare,
    },
    {
      icon: MessageSquare,
      label: 'ثبت انتقاد و پیشنهاد',
      onClick: onFeedback,
    },
  ];

  return (
    <div className="flex flex-col gap-2">
      {menuItems.map((item, index) => (
        <Button
          key={index}
          size="lg"
          variant="outline"
          className="w-full justify-start p-4 h-10"
          onClick={item.onClick}
          asChild={!!item.href}
        >
          {item.href ? (
            <Link href={item.href}>
              <item.icon size={20} />
              {item.label}
            </Link>
          ) : (
            <>
              <item.icon size={20} />
              {item.label}
            </>
          )}
        </Button>
      ))}

      <Button
        variant="destructive"
        size="lg"
        className="w-full justify-start p-4 h-10"
        onClick={onLogout}
      >
        <div className="flex items-center gap-3">
          <LogOut size={20} />
          <span className="font-bold">خروج از حساب</span>
        </div>
      </Button>
    </div>
  );
};
