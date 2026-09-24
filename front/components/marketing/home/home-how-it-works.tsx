import { Scissors, UserRound } from 'lucide-react';
import Link from 'next/link';

import SectionHeading from '@/components/marketing/section-heading';

interface Step {
  title: string;
  description: string;
}

interface PersonaColumn {
  icon: typeof Scissors;
  title: string;
  cta: { href: string; label: string; title: string };
  steps: Step[];
}

/** مراحل واقعی کار با منشیم — مطابق جریان‌های پیاده‌سازی‌شده پلتفرم */
const COLUMNS: PersonaColumn[] = [
  {
    icon: Scissors,
    title: 'من آرایشگر هستم',
    cta: {
      href: '/register',
      label: 'ثبت‌نام آرایشگاه',
      title: 'ثبت‌نام نوبت دهی آنلاین آرایشگاه در منشیم',
    },
    steps: [
      {
        title: 'ثبت‌نام کنید',
        description:
          'حساب آرایشگاه خود را بسازید و خدمات، قیمت‌ها و ساعات کاری را وارد کنید.',
      },
      {
        title: 'لینک رزرو را به اشتراک بگذارید',
        description:
          'لینک اختصاصی صفحه آرایشگاه را در اینستاگرام، واتساپ و بیو قرار دهید.',
      },
      {
        title: 'نوبت‌ها را مدیریت کنید',
        description:
          'رزروهای آنلاین را تأیید یا لغو کنید و نوبت‌های حضوری و تلفنی را دستی ثبت کنید.',
      },
      {
        title: 'یادآوری پیامکی بفرستید',
        description:
          'پیامک یادآوری نوبت، از ۱ تا ۲۴ ساعت قبل به انتخاب شما ارسال می‌شود.',
      },
      {
        title: 'درآمد را برداشت کنید',
        description:
          'پرداخت‌های نوبت‌ها در کیف پول شما می‌نشیند و با تسویه وجه به کارت‌تان منتقل می‌شود.',
      },
    ],
  },
  {
    icon: UserRound,
    title: 'من مشتری هستم',
    cta: {
      href: '/online-barber-booking',
      label: 'رزرو آنلاین آرایشگاه',
      title: 'رزرو اینترنتی آرایشگاه در منشیم',
    },
    steps: [
      {
        title: 'آرایشگر را پیدا کنید',
        description:
          'آرایشگرها را بر اساس شهر، قیمت و بالاترین امتیاز جست‌وجو و فیلتر کنید.',
      },
      {
        title: 'خدمات را انتخاب کنید',
        description: 'قیمت و مدت‌زمان دقیق هر خدمت را قبل از رزرو ببینید.',
      },
      {
        title: 'روز و ساعت خالی را انتخاب کنید',
        description:
          'از تقویم، ساعت‌های آزاد آرایشگر را ببینید و زمان دلخواه را انتخاب کنید.',
      },
      {
        title: 'پرداخت آنلاین کنید',
        description: 'نوبت خود را از طریق درگاه پرداخت امن، قطعی کنید.',
      },
      {
        title: 'یادآوری دریافت کنید',
        description: 'پیش از موعد نوبت، پیامک یادآوری برای شما ارسال می‌شود.',
      },
    ],
  },
];

/**
 * بخش «چگونه کار می‌کند؟» — دو ستون موازی مراحل برای آرایشگر و مشتری؛
 * مطابق طرح لندینگ منشیم.
 */
export default function HomeHowItWorks() {
  return (
    <section aria-labelledby="home-steps-heading">
      <div className="custom-container py-16 lg:py-24">
        <SectionHeading
          id="home-steps-heading"
          title="چگونه کار می‌کند؟"
          description="از ثبت‌نام تا راه‌اندازی نوبت دهی آرایشگاه شما فقط چند دقیقه فاصله است؛ بدون قرارداد پیچیده و بدون نیاز به دانش فنی."
        />

        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          {COLUMNS.map(column => (
            <article
              key={column.title}
              className="rounded-4xl border border-primary-100/60 bg-white p-7 shadow-sm lg:p-8"
            >
              <div className="mb-6 flex items-center gap-3">
                <span className="flex size-11 items-center justify-center rounded-2xl bg-primary-2 text-primary">
                  <column.icon className="size-5" aria-hidden="true" />
                </span>
                <h3 className="text-lg font-extrabold text-foreground">
                  {column.title}
                </h3>
              </div>

              <ol className="space-y-5">
                {column.steps.map((step, index) => (
                  <li key={step.title} className="flex items-start gap-3.5">
                    <span
                      aria-hidden="true"
                      className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary-2 text-xs font-black text-primary"
                    >
                      {index + 1}
                    </span>
                    <span>
                      <span className="block text-sm font-extrabold text-foreground">
                        {step.title}
                      </span>
                      <span className="mt-1 block text-xs leading-6 text-muted-foreground">
                        {step.description}
                      </span>
                    </span>
                  </li>
                ))}
              </ol>

              <Link
                href={column.cta.href}
                title={column.cta.title}
                className="mt-7 inline-flex rounded-lg bg-primary-2 px-4 py-2.5 text-sm font-bold text-primary transition-colors hover:bg-primary hover:text-white"
              >
                {column.cta.label}
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
