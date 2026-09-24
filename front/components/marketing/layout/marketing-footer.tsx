import { Headset, Mail } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

import Logo from '@/components/shared/logo';

import { NAV_LINKS } from './marketing-links';

const SOCIAL_LINKS = [
  {
    href: 'https://instagram.com/monshiim',
    label: 'اینستاگرام منشیم',
    iconPath:
      'M12 2.2c3.2 0 3.6 0 4.9.1 1.2.1 1.8.2 2.2.4.6.2 1 .5 1.4.9.4.4.7.8.9 1.4.2.4.4 1 .4 2.2.1 1.3.1 1.7.1 4.9s0 3.6-.1 4.9c-.1 1.2-.2 1.8-.4 2.2-.2.6-.5 1-.9 1.4-.4.4-.8.7-1.4.9-.4.2-1 .4-2.2.4-1.3.1-1.7.1-4.9.1s-3.6 0-4.9-.1c-1.2-.1-1.8-.2-2.2-.4-.6-.2-1-.5-1.4-.9-.4-.4-.7-.8-.9-1.4-.2-.4-.4-1-.4-2.2-.1-1.3-.1-1.7-.1-4.9s0-3.6.1-4.9c.1-1.2.2-1.8.4-2.2.2-.6.5-1 .9-1.4.4-.4.8-.7 1.4-.9.4-.2 1-.4 2.2-.4 1.3-.1 1.7-.1 4.9-.1M12 5.8A6.2 6.2 0 1 0 18.2 12 6.2 6.2 0 0 0 12 5.8m0 10.2A4 4 0 1 1 16 12a4 4 0 0 1-4 4m6.4-11.8a1.44 1.44 0 1 0 1.44 1.44A1.44 1.44 0 0 0 18.4 4.2',
  },
  {
    href: 'https://t.me/monshiim',
    label: 'تلگرام منشیم',
    iconPath:
      'M21.9 4.6 18.9 19c-.2 1-.8 1.2-1.7.8l-4.6-3.4-2.2 2.1c-.2.2-.5.4-.9.4l.3-4.7L18.4 6.8c.4-.3-.1-.5-.6-.2L7.3 13.1l-4.5-1.4c-1-.3-1-1 .2-1.4L20.6 3.2c.8-.3 1.5.2 1.3 1.4',
  },
];

const FEATURE_LINKS = [
  {
    href: '/barber-management#calendar',
    label: 'تقویم هوشمند نوبت‌ها',
    title: 'تقویم هوشمند نوبت دهی آرایشگاه در منشیم',
  },
  {
    href: '/barber-management#customers',
    label: 'باشگاه مشتریان',
    title: 'باشگاه مشتریان و مدیریت مشتریان آرایشگاه',
  },
  {
    href: '/barber-management#finance',
    label: 'گزارش مالی و درآمد',
    title: 'گزارش مالی و درآمد آرایشگاه در منشیم',
  },
  {
    href: '/online-barber-booking',
    label: 'نوبت دهی آنلاین ۲۴ ساعته',
    title: 'نوبت دهی آنلاین و رزرو آرایشگاه ۲۴ ساعته',
  },
];

export default function MarketingFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-primary-100/60 bg-primary-3">
      <div className="custom-container py-12 lg:py-16">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          {/* برند و معرفی کوتاه — شامل کلیدواژه‌های اصلی */}
          <div className="space-y-4">
            <Logo />
            <p className="text-sm leading-7 text-muted-foreground">
              منشیم (Monshim) سامانه رزرو آنلاین آرایشگاه و نرم‌افزار مدیریت
              آرایشگاه است؛ با نوبت دهی آنلاین ۲۴ ساعته، مدیریت مشتریان و
              گزارش‌گیری مالی، آرایشگاه شما را آنلاین و منظم می‌کند.
            </p>
            <ul className="flex items-center gap-2">
              {SOCIAL_LINKS.map(social => (
                <li key={social.href}>
                  <a
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    aria-label={social.label}
                    title={social.label}
                    className="flex size-9 items-center justify-center rounded-full bg-white text-primary shadow-sm transition-colors hover:bg-primary hover:text-white"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      className="size-4"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path d={social.iconPath} />
                    </svg>
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* دسترسی سریع */}
          <nav aria-label="دسترسی سریع صفحات منشیم">
            <h2 className="mb-4 text-sm font-bold text-foreground">
              دسترسی سریع
            </h2>
            <ul className="space-y-3">
              {NAV_LINKS.map(link => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    title={link.title}
                    className="text-sm text-muted-foreground transition-colors hover:text-primary"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href="/register"
                  title="ثبت‌نام رایگان آرایشگاه در منشیم"
                  className="text-sm text-muted-foreground transition-colors hover:text-primary"
                >
                  ثبت‌نام رایگان
                </Link>
              </li>
            </ul>
          </nav>

          {/* امکانات منشیم */}
          <nav aria-label="امکانات نرم افزار مدیریت آرایشگاه منشیم">
            <h2 className="mb-4 text-sm font-bold text-foreground">
              امکانات منشیم
            </h2>
            <ul className="space-y-3">
              {FEATURE_LINKS.map(link => (
                <li key={link.title}>
                  <Link
                    href={link.href}
                    title={link.title}
                    className="text-sm text-muted-foreground transition-colors hover:text-primary"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* تماس با ما */}
          <div>
            <h2 className="mb-4 text-sm font-bold text-foreground">
              تماس با ما
            </h2>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li>
                <a
                  href="mailto:info@monshiim.ir"
                  title="ایمیل پشتیبانی منشیم"
                  className="flex items-center gap-2 transition-colors hover:text-primary"
                >
                  <Mail className="size-4 text-primary" aria-hidden="true" />
                  <span dir="ltr">info@monshiim.ir</span>
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Headset className="size-4 text-primary" aria-hidden="true" />
                پشتیبانی آنلاین از پنل کاربری منشیم
              </li>
            </ul>
            <p className="mt-5 rounded-xl bg-white p-4 text-xs leading-6 text-muted-foreground shadow-sm">
              برای سوالات درباره رزرو آنلاین آرایشگاه و مدیریت سالن، از پنل
              کاربری بخش پشتیبانی آنلاین در خدمت شماست.
            </p>
          </div>
        </div>

        <div className="mt-12 flex flex-col-reverse items-center justify-between gap-4 border-t border-primary-100/60 pt-6 text-xs text-muted-foreground sm:flex-row">
          <p>
            © {year} تمامی حقوق این وب‌سایت متعلق به{' '}
            <Link href="/" className="font-medium text-primary">
              منشیم (Monshim)
            </Link>{' '}
            است.
          </p>
          {/* نماد اعتماد */}
          <a
            referrerPolicy="origin"
            href="https://trustseal.enamad.ir/?id=5928935&Code=if1sOMiUb9rYtjv8U4L54FgbRxK0XhSU"
            target="_blank"
            rel="noopener noreferrer nofollow"
            title="نماد اعتماد الکترونیکی منشیم"
            aria-label="نماد اعتماد الکترونیکی منشیم"
          >
            <Image
              src="/footer/enamad.webp"
              alt="نماد اعتماد الکترونیکی سامانه رزرو آرایشگاه منشیم"
              width={70}
              height={70}
              className="h-16 w-auto rounded-lg bg-white object-contain p-1 shadow-sm"
            />
          </a>
        </div>
      </div>
    </footer>
  );
}
