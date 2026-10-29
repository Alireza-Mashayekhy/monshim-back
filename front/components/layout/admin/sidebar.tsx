'use client';

import {
  ArrowLeftRight,
  Banknote,
  Check,
  Headphones,
  LogOut,
  MessageSquareText,
  Settings,
  Store,
  User,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { toast } from 'sonner';

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
import { getApiErrorMessage } from '@/lib/api-error';
import { cn, toPersianDigits } from '@/lib/utils';
import { usePendingWithdrawalsCount } from '@/services/features/admin-withdrawals/hooks';
import { useLogout } from '@/services/features/auth/hooks';

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
    link: '/admin/barbers',
    icon: Store,
    name: 'مدیریت آرایشگرها',
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
  const router = useRouter();
  const { data: pendingWithdrawals = 0 } = usePendingWithdrawalsCount();
  const showPendingBadge = state !== 'collapsed' || isMobile;

  const logoutMutation = useLogout();

  const handleLogout = async () => {
    if (logoutMutation.isPending) return;

    if (isMobile) setOpenMobile(false);

    try {
      await logoutMutation.mutateAsync();
      router.replace('/login');
      router.refresh();
    } catch (error) {
      toast.error(
        getApiErrorMessage(error, 'خروج انجام نشد. دوباره تلاش کنید.'),
      );
    }
  };

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

      <SidebarFooter className="p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              type="button"
              onClick={handleLogout}
              disabled={logoutMutation.isPending}
              tooltip="خروج از حساب"
              className="flex items-center gap-2 rounded-sm border border-red-200 px-2 py-1 text-red-600 transition hover:bg-red-50 hover:text-red-700 disabled:opacity-60"
            >
              <LogOut />
              <span>
                {logoutMutation.isPending ? 'در حال خروج...' : 'خروج از حساب'}
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
