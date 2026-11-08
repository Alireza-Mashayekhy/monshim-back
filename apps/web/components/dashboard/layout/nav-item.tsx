'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cn } from '@/lib/utils';

interface Props {
  title: string;
  href: string;
  icon: React.ElementType;
}

export default function NavItem({ title, href, icon: Icon }: Props) {
  const pathname = usePathname();

  const active =
    pathname === href || (href !== '/dashboard' && pathname.startsWith(href));

  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-3 rounded-2xl px-4 py-3 transition-all duration-200',
        active ? 'bg-primary text-white' : 'hover:bg-primary-50 text-slate-600',
      )}
    >
      <Icon size={20} />

      <span>{title}</span>
    </Link>
  );
}
