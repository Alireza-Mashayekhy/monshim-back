'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import Logo from '@/components/shared/logo';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

import { NAV_LINKS } from './marketing-links';

/**
 * منوی موبایلِ هدر مارکتینگ.
 *
 * این بخش به‌صورت تنبل (lazy) بارگذاری می‌شود چون تنها زمانی که کاربر روی دکمهٔ
 * همبرگری بزند به آن نیاز داریم؛ با این کار کد Radix Dialog از باندل اولیهٔ
 * صفحات مارکتینگ خارج می‌شود و روی زمان hydrate و LCP اثر مثبت دارد.
 * دکمهٔ باز کردن منو در هدرِ اصلی (server-rendered) باقی می‌ماند تا در اولین
 * رندر هم روی موبایل قابل مشاهده باشد.
 */
export default function MarketingMobileMenu({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href !== '/' && pathname.split('#')[0] === href.split('#')[0];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
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
                  onClick={() => onOpenChange(false)}
                  className="block rounded-xl px-3 py-3 transition-colors hover:bg-primary-2"
                >
                  <span
                    className={`block text-sm font-bold ${
                      isActive(link.href) ? 'text-primary' : 'text-foreground'
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
              <Link href="/login" onClick={() => onOpenChange(false)}>
                ورود
              </Link>
            </Button>
            <Button asChild className="w-full">
              <Link href="/register" onClick={() => onOpenChange(false)}>
                ثبت‌نام رایگان
              </Link>
            </Button>
          </div>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
