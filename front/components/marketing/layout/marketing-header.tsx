'use client';
import { Menu } from 'lucide-react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

import Logo from '@/components/shared/logo';
import { Button } from '@/components/ui/button';

import { NAV_LINKS } from './marketing-links';

/**
 * منوی موبایل فقط بعد از تعامل کاربر لازم است، بنابراین تنبل بارگذاری می‌شود تا
 * Radix Dialog در مسیر critical نباشد.
 */
const MarketingMobileMenu = dynamic(() => import('./marketing-mobile-menu'), {
  ssr: false,
});

export default function MarketingHeader() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const isActive = (href: string) =>
    href !== '/' && pathname.split('#')[0] === href.split('#')[0];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-primary-100/60 bg-background/85 backdrop-blur-xl">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:right-4 focus:top-2 focus:z-[60] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
      >
        پرش به محتوای اصلی
      </a>

      <div className="custom-container flex h-16 items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-6 lg:gap-8">
          <Link href="/" aria-label="منشیم | صفحه اصلی" className="shrink-0">
            <Logo />
          </Link>

          <nav aria-label="منوی اصلی" className="hidden lg:block">
            <ul className="flex items-center gap-1">
              {NAV_LINKS.map(link => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    title={link.title}
                    aria-current={isActive(link.href) ? 'page' : undefined}
                    className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-primary-2 hover:text-primary ${
                      isActive(link.href)
                        ? 'text-primary'
                        : 'text-foreground/80'
                    }`}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link href="/login" title="ورود به حساب کاربری منشیم">
              ورود
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/register" title="ثبت‌نام رایگان در منشیم">
              ثبت‌نام رایگان
            </Link>
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            aria-label="باز کردن منوی منشیم"
            aria-haspopup="dialog"
            aria-expanded={open}
            onClick={() => setOpen(true)}
          >
            <Menu className="size-5" />
          </Button>

          <MarketingMobileMenu open={open} onOpenChange={setOpen} />
        </div>
      </div>
    </header>
  );
}
