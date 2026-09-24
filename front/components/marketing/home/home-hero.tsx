import { CalendarCheck2, Sparkles, Star } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

import { Button } from '@/components/ui/button';

const HERO_STATS = [
  { value: '۲٬۶۰۰+', label: 'آرایشگاه فعال' },
  { value: '۴.۹', label: 'امتیاز رضایت کاربران' },
  { value: '۳۵۰ هزار+', label: 'نوبت رزرو شده' },
] as const;

/**
 * بخش قهرمان (Hero) صفحه اصلی منشیم — مطابق طرح لندینگ:
 * بج کلیدواژه، H1، توضیح، دو دکمه، آمار و تصویر سالن با بج امتیاز.
 * H1 حاوی کلیدواژه‌های اصلی: رزرو آنلاین آرایشگاه و مدیریت آرایشگاه.
 */
export default function HomeHero() {
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

      <div className="custom-container relative grid items-center gap-10 py-12 lg:grid-cols-2 lg:gap-8 lg:py-20">
        <div className="order-2 text-center lg:order-1 lg:text-start">
          <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary-200/60 bg-white px-4 py-1.5 text-xs font-bold text-primary shadow-sm">
            <Sparkles className="size-3.5" aria-hidden="true" />
            نوبت دهی آنلاین + رزرو آنلاین آرایشگاه
          </p>

          <h1 className="text-[1.7rem] font-black leading-[1.7] text-foreground sm:text-4xl sm:leading-[1.6] lg:text-[2.6rem] lg:leading-[1.6]">
            <span className="text-primary">رزرو آنلاین</span> و مدیریت هوشمند
            آرایشگاه با منشیم
          </h1>

          <p className="mx-auto mt-5 max-w-xl leading-8 text-muted-foreground lg:mx-0">
            منشیم (Monshim) سامانه نوبت دهی آرایشگاه و نرم افزار مدیریت آرایشگاه
            است؛ مشتری‌ها هر ساعت از شبانه‌روز بدون تماس تلفنی رزرو آرایشگاه
            انجام می‌دهند و شما با یک پنل ساده، نوبت‌ها، مشتریان و درآمد سالن را
            مدیریت می‌کنید.
          </p>

          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start">
            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link
                href="/register"
                title="ثبت‌نام رایگان آرایشگاه در سامانه نوبت دهی منشیم"
              >
                ثبت‌نام رایگان
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="w-full border-primary-300 bg-white sm:w-auto"
            >
              <Link
                href="/online-barber-booking"
                title="رزرو آنلاین آرایشگاه و نوبت دهی اینترنتی"
              >
                <CalendarCheck2 className="size-4" aria-hidden="true" />
                رزرو آنلاین آرایشگاه
              </Link>
            </Button>
          </div>

          <dl className="mt-10 grid max-w-md grid-cols-3 gap-4 max-lg:mx-auto">
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
        </div>

        <div className="relative">
          <div className="relative mx-auto max-w-lg lg:max-w-none">
            <Image
              src="/landing/salon-interior.jpg"
              alt="رزرو آنلاین آرایشگاه مردانه و سالن زیبایی با سامانه منشیم"
              width={1024}
              height={1024}
              priority
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="aspect-square h-auto w-full rounded-4xl object-cover shadow-xl shadow-primary/10"
            />

            {/* بج امتیاز شناور روی تصویر */}
            <figure className="absolute bottom-4 right-4 flex items-center gap-3 rounded-2xl bg-white/95 p-3 pl-5 shadow-lg backdrop-blur sm:bottom-6 sm:right-6">
              <span
                aria-hidden="true"
                className="flex size-10 items-center justify-center rounded-xl bg-primary-2"
              >
                <Star className="size-5 fill-amber-400 text-amber-400" />
              </span>
              <figcaption>
                <span className="block text-sm font-black text-foreground">
                  ۴.۹ از ۵
                </span>
                <span className="block text-[11px] text-muted-foreground">
                  امتیاز رضایت کاربران منشیم
                </span>
              </figcaption>
            </figure>
          </div>
        </div>
      </div>
    </section>
  );
}
