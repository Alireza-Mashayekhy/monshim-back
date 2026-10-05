'use client';
import { Menu } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

import Logo from '@/components/shared/logo';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

import { NAV_LINKS } from './marketing-links';
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
          {/* لوگو خودش یک لینک به صفحه اصلی است؛ این wrapper نباید Link باشد
              وگرنه HTML نامعتبر (<a> داخل <a>) و خطای hydration می‌سازد. */}
          <div className="shrink-0">
            <Logo label="منشیم | صفحه اصلی" />
          </div>

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

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                aria-label="باز کردن منوی منشیم"
              >
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[19rem] p-0">
              <SheetHeader className="border-b border-primary-100/60 px-5 py-4 text-right">
                <SheetTitle className="flex items-center">
                  <Logo />
                </SheetTitle>
                <SheetDescription className="text-xs text-muted-foreground">
                  رزرو آنلاین آرایشگاه و مدیریت سالن
                </SheetDescription>
              </SheetHeader>

              <nav aria-label="منوی موبایل" className="px-3 py-4">
                <ul className="space-y-1">
                  {NAV_LINKS.map(link => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        title={link.title}
                        onClick={() => setOpen(false)}
                        className="block rounded-xl px-3 py-3 transition-colors hover:bg-primary-2"
                      >
                        <span
                          className={`block text-sm font-bold ${
                            isActive(link.href)
                              ? 'text-primary'
                              : 'text-foreground'
                          }`}
                        >
                          {link.label}
                        </span>
                        {link.hint ? (
                          <span className="mt-0.5 block text-[11px] text-muted-foreground">
                            {link.hint}
                          </span>
                        ) : null}
                      </Link>
                    </li>
                  ))}
                </ul>

                <div className="mt-5 grid gap-2 border-t border-primary-100/60 pt-5">
                  <Button asChild variant="outline" className="w-full">
                    <Link href="/login" onClick={() => setOpen(false)}>
                      ورود
                    </Link>
                  </Button>
                  <Button asChild className="w-full">
                    <Link href="/register" onClick={() => setOpen(false)}>
                      ثبت‌نام رایگان
                    </Link>
                  </Button>
                </div>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
