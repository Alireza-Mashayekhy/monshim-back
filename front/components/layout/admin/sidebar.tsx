'use client';

import { Calendar, Check, Headphones, Settings, User } from 'lucide-react';
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
import { cn } from '@/lib/utils';

const items = [
  {
    link: '/admin/users',
    icon: User,
    name: 'کاربران',
  },
  {
    link: '/admin/wallet',
    icon: Calendar,
    name: 'تراکنش ها',
  },
  {
    link: '/admin/approvals',
    icon: Check,
    name: 'تایید آرایشگر',
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
  const { state } = useSidebar();
  const pathname = usePathname();

  return (
    <Sidebar
      collapsible="icon"
      dir="rtl"
      side="right"
      bgClassName="bg-white border-l border-sidebar-border"
    >
      <SidebarHeader className="flex flex-row items-center justify-end">
        {state !== 'collapsed' && <span className="ml-auto">Monshim</span>}
        <SidebarTrigger />
      </SidebarHeader>

      <Separator />

      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu className="gap-2">
            {items.map(item => {
              const isActive = pathname.startsWith(item.link);

              return (
                <SidebarMenuItem key={item.name}>
                  <SidebarMenuButton asChild>
                    <Link
                      href={item.link}
                      className={cn(
                        'flex items-center gap-2 border rounded-sm px-2 py-1 transition',
                        isActive
                          ? 'bg-primary/10 border-primary text-primary hover:bg-primary/10! hover:border-primary! hover:text-primary!'
                          : 'hover:bg-muted',
                      )}
                    >
                      <item.icon />
                      <span>{item.name}</span>
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
