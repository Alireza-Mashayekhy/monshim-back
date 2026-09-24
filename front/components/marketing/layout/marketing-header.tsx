import Link from 'next/link';

import Logo from '@/components/shared/logo';
import { Button } from '@/components/ui/button';

import { NAV_LINKS } from './marketing-links';

export default function MarketingHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-primary-100/60 bg-background/85 backdrop-blur-xl">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:right-4 focus:top-2 focus:z-[60] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
      >
        پرش به محتوای اصلی
      </a>

      <div className="custom-container flex h-16 items-center justify-between gap-4">
        <div className="flex items-center gap-6 lg:gap-8">
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
                    className="rounded-lg px-3 py-2 text-sm font-medium text-foreground/80 transition-colors hover:bg-primary-2 hover:text-primary"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="hidden sm:inline-flex"
          >
            <Link href="/login" title="ورود به پنل مدیریت آرایشگاه منشیم">
              ورود
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/register" title="ثبت‌نام رایگان آرایشگاه در منشیم">
              ثبت‌نام رایگان
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
