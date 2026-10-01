'use client';

import {
  CalendarCheck2,
  Scissors,
  Search,
  Star,
  UserRound,
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import {
  AppointmentsShot,
  BookingShot,
} from '@/components/marketing/product-ui/shots';
import { Button } from '@/components/ui/button';

const HERO_STATS = [
  { value: '+۲٬۶۰۰', label: 'سالن و آرایشگاه فعال' },
  { value: '+۳۵٬۰۰', label: 'نوبت ثبت‌شده' },
  { value: '۴.۹ از ۵', label: 'رضایت کاربران منشیم' },
] as const;

type Audience = 'barber' | 'customer';

/**
 * قهرمان صفحه اصلی با تفکیک صریح دو مخاطب منشیم.
 *
 * منشیم دو کاربر کاملاً متفاوت دارد (مشتری و آرایشگر) و مهم‌ترین تغییر UX
 * صفحه اصلی این است که کاربر در همان ثانیهٔ اول بگوید «من کدامم» و مسیر،
 * تیتر و CTA مخصوص خودش را ببیند؛ دیگر دو جریان در یک جمله مخلوط نمی‌شوند.
 *
 * نکتهٔ سئو: H1 ثابت و کلیدواژه‌دار می‌ماند («رزرو آنلاین آرایشگاه» و
 * «مدیریت آرایشگاه») تا با تعویض نقش، عنوان صفحه عوض نشود؛ آنچه عوض می‌شود
 * توضیح و دکمه‌ها هستند.
 */
const AUDIENCES: Record<
  Audience,
  {
    label: string;
    icon: typeof Scissors;
    tagline: string;
    primary: { href: string; label: string; title: string };
    secondary: { href: string; label: string; title: string };
  }
> = {
  barber: {
    label: 'من آرایشگر هستم',
    icon: Scissors,
    tagline:
      'مدیریت سالن، بدون دردسر. نوبت‌ها، مشتری‌ها و درآمدت همه در یک پنل؛ مشتری‌ها ۲۴ ساعته آنلاین رزرو می‌کنند و تو فقط تأیید می‌کنی.',
    primary: {
      href: '/barbaer-signup',
      label: 'شروع رایگان برای آرایشگاه',
      title: 'ثبت‌نام رایگان نرم افزار مدیریت آرایشگاه منشیم',
    },
    secondary: {
      href: '/barber-management',
      label: 'امکانات مدیریت سالن',
      title: 'نرم افزار مدیریت آرایشگاه منشیم',
    },
  },
  customer: {
    label: 'من مشتری هستم',
    icon: UserRound,
    tagline:
      'آرایشگاه نزدیکت را پیدا کن، قیمت خدمات و ساعت‌های خالی را ببین و بدون تماس تلفنی نوبتت را رزرو کن. دیدن آرایشگاه‌ها نیازی به ثبت‌نام ندارد.',
    primary: {
      href: '/explore',
      label: 'پیدا کردن آرایشگاه',
      title: 'جست‌وجو و رزرو آنلاین آرایشگاه در منشیم',
    },
    secondary: {
      href: '/online-barber-booking',
      label: 'رزرو آنلاین چطور کار می‌کند؟',
      title: 'رزرو آنلاین آرایشگاه و نوبت دهی اینترنتی در منشیم',
    },
  },
};

export default function HomeHero() {
  const [audience, setAudience] = useState<Audience>('barber');
  const active = AUDIENCES[audience];

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-primary-2/70 to-background">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-32 -top-32 size-96 rounded-full bg-primary-2 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-40 -right-32 size-96 rounded-full bg-primary-2/70 blur-3xl"
      />

      <div className="custom-container relative grid items-center gap-10 py-10 lg:grid-cols-2 lg:gap-8 lg:py-16">
        <div className="text-center order-1 lg:text-start">
          <h1 className="text-[1.7rem] font-black leading-[1.7] text-foreground sm:text-4xl sm:leading-[1.6] lg:text-[2.5rem] lg:leading-[1.6]">
            <span className="text-primary">رزرو آنلاین آرایشگاه</span> و{' '}
            <span className="text-primary">مدیریت آرایشگاه</span>، هر دو در
            منشیم
          </h1>

          {/* انتخاب مخاطب — همان بالای Hero */}
          <div
            role="group"
            aria-label="شما کدام هستید؟"
            className="mx-auto mt-6 grid w-full max-w-md grid-cols-2 gap-1 rounded-2xl bg-white/80 p-1.5 shadow-sm ring-1 ring-primary-100/70 backdrop-blur lg:mx-0"
          >
            {(Object.keys(AUDIENCES) as Audience[]).map(key => {
              const item = AUDIENCES[key];
              const selected = audience === key;
              return (
                <button
                  key={key}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setAudience(key)}
                  className={`flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-bold transition-all cursor-pointer ${
                    selected
                      ? 'bg-primary text-white shadow-md shadow-primary/20'
                      : 'text-foreground/70 hover:bg-primary-2 hover:text-primary'
                  }`}
                >
                  <item.icon className="size-4" aria-hidden="true" />
                  {item.label}
                </button>
              );
            })}
          </div>

          <p className="mx-auto mt-5 max-w-xl leading-8 text-muted-foreground lg:mx-0">
            {active.tagline}
          </p>

          <div className="mt-7 flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start">
            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link href={active.primary.href} title={active.primary.title}>
                {audience === 'customer' ? (
                  <Search className="size-4" aria-hidden="true" />
                ) : null}
                {active.primary.label}
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="w-full border-primary-300 bg-white sm:w-auto"
            >
              <Link href={active.secondary.href} title={active.secondary.title}>
                {audience === 'barber' ? (
                  <CalendarCheck2 className="size-4" aria-hidden="true" />
                ) : null}
                {active.secondary.label}
              </Link>
            </Button>
          </div>

          <dl className="mt-9 grid max-w-md grid-cols-3 gap-4 max-lg:mx-auto">
            {HERO_STATS.map(stat => (
              <div key={stat.label} className="text-center lg:text-start">
                <dd className="text-xl font-black text-primary sm:text-2xl">
                  {stat.value}
                </dd>
                <dt className="mt-1 text-[11px] leading-5 text-muted-foreground sm:text-xs">
                  {stat.label}
                </dt>
              </div>
            ))}
          </dl>

          <p className="mt-5 flex items-center justify-center gap-2 text-xs text-muted-foreground lg:justify-start">
            <span aria-hidden="true" className="flex text-amber-400">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="size-3.5 fill-current" />
              ))}
            </span>
            امتیاز کاربران منشیم در صفحات آرایشگاه‌ها
          </p>
        </div>

        {/* به‌جای عکس مفهومی، خودِ رابط کاربری محصول */}
        <div className="relative order-2">
          {audience === 'barber' ? (
            <AppointmentsShot className="mx-auto max-w-lg lg:max-w-none" />
          ) : (
            <BookingShot className="mx-auto w-[17.5rem] lg:w-[19rem]" />
          )}
        </div>
      </div>
    </section>
  );
}
