'use client';

import {
  ArrowLeftRight,
  Banknote,
  Check,
  Headphones,
  MessageSquareText,
  Settings,
  User,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { Separator } from '@/components/ui/separator';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import { cn, toPersianDigits } from '@/lib/utils';
import { usePendingWithdrawalsCount } from '@/services/features/admin-withdrawals/hooks';

const items = [
  {
    link: '/admin/users',
    icon: User,
    name: 'کاربران',
  },
  {
    link: '/admin/wallet',
    icon: ArrowLeftRight,
    name: 'تراکنش‌ها',
  },
  {
    link: '/admin/withdrawals',
    icon: Banknote,
    name: 'درخواست برداشت',
  },
  {
    link: '/admin/approvals',
    icon: Check,
    name: 'تایید آرایشگر',
  },
  {
    link: '/admin/reviews',
    icon: MessageSquareText,
    name: 'نظرات',
  },
  {
    link: '/admin/tickets',
    icon: Headphones,
    name: 'تیکت‌ها',
  },
  {
    link: '/admin/settings',
    icon: Settings,
    name: 'تنظیمات',
  },
];

export default function AdminSidebar() {
  const { state, isMobile, setOpenMobile } = useSidebar();
  const pathname = usePathname();
  const { data: pendingWithdrawals = 0 } = usePendingWithdrawalsCount();
  const showPendingBadge = state !== 'collapsed' || isMobile;

  return (
    <Sidebar
      collapsible="icon"
      dir="rtl"
      side="right"
      bgClassName="bg-white border-l border-sidebar-border"
    >
      <SidebarHeader className="flex flex-row items-center justify-between">
        {(state !== 'collapsed' || isMobile) && (
          <span className="font-semibold">Monshim</span>
        )}
        <SidebarTrigger />
      </SidebarHeader>

      <Separator />

      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu className="gap-2">
            {items.map(item => {
              const isActive = pathname.startsWith(item.link);
              const isWithdrawals = item.link === '/admin/withdrawals';

              return (
                <SidebarMenuItem key={item.name}>
                  <SidebarMenuButton asChild>
                    <Link
                      href={item.link}
                      aria-current={isActive ? 'page' : undefined}
                      onClick={() => {
                        if (isMobile) setOpenMobile(false);
                      }}
                      className={cn(
                        'flex items-center gap-2 border rounded-sm px-2 py-1 transition',
                        isActive
                          ? 'bg-primary/10 border-primary text-primary hover:bg-primary/10! hover:border-primary! hover:text-primary!'
                          : 'hover:bg-muted',
                      )}
                    >
                      <item.icon />
                      <span>{item.name}</span>
                      {isWithdrawals &&
                        pendingWithdrawals > 0 &&
                        showPendingBadge && (
                          <span
                            aria-label={`${pendingWithdrawals} درخواست برداشت در انتظار بررسی`}
                            className={cn(
                              'ms-auto flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold tabular-nums',
                              isActive
                                ? 'bg-primary text-white'
                                : 'bg-amber-100 text-amber-800',
                            )}
                          >
                            {toPersianDigits(pendingWithdrawals)}
                          </span>
                        )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter />
    </Sidebar>
  );
}
