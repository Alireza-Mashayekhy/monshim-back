import { ArrowLeft, Scissors, UserRound } from 'lucide-react';
import Link from 'next/link';

import SectionHeading from '@/components/marketing/section-heading';

const PERSONAS = [
  {
    icon: UserRound,
    title: 'من مشتری هستم',
    dark: false,
    description:
      'می‌خواهم بدون تماس تلفنی، قیمت خدمات را ببینم و روز و ساعت دلخواهم را آنلاین رزرو کنم؛ یادآوری پیامکی هم پیش از موعد نوبتم می‌رسد.',
    link: {
      href: '/online-barber-booking',
      label: 'رزرو آنلاین آرایشگاه',
      title: 'رزرو اینترنتی آرایشگاه در منشیم',
    },
  },
  {
    icon: Scissors,
    title: 'من آرایشگر هستم',
    dark: true,
    description:
      'می‌خواهم نوبت‌ها را آنلاین و بدون تداخل بگیرم، مشتریانم را مدیریت کنم و پرداخت‌ها را در کیف پولم ببینم.',
    link: {
      href: '/barber-management',
      label: 'نرم افزار مدیریت آرایشگاه',
      title: 'صفحه نرم افزار مدیریت آرایشگاه منشیم',
    },
  },
] as const;

/**
 * بخش «منشیم برای شما چه کاری انجام می‌دهد؟» — دو کارت مخاطب هدف:
 * مشتری‌ها و آرایشگرها؛ هر کارت به لندینگ مرتبط لینک می‌شود (لینک‌سازی داخلی سئو).
 */
export default function HomePersonas() {
  return (
    <section aria-labelledby="home-personas-heading">
      <div className="custom-container py-16 lg:py-24">
        <SectionHeading
          id="home-personas-heading"
          title="منشیم برای شما چه کاری انجام می‌دهد؟"
          description="منشیم یک پلتفرم دو سر است؛ هم برای مشتری‌هایی که دنبال رزرو آرایشگاه هستند و هم برای آرایشگرهایی که به دنبال مدیریت هوشمند سالن‌شان."
        />

        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {PERSONAS.map(persona => (
            <article
              key={persona.title}
              className={`flex flex-col items-start rounded-4xl p-8 shadow-sm lg:p-10 ${
                persona.dark
                  ? 'bg-gradient-to-bl from-primary to-teal-700 text-white shadow-lg shadow-primary/20'
                  : 'border border-primary-100/60 bg-primary-2/50'
              }`}
            >
              <span
                className={`mb-5 flex size-12 items-center justify-center rounded-2xl ${
                  persona.dark
                    ? 'bg-white/15 text-white'
                    : 'bg-white text-primary shadow-sm'
                }`}
              >
                <persona.icon className="size-6" aria-hidden="true" />
              </span>

              <h3
                className={`mb-3 text-xl font-extrabold ${
                  persona.dark ? 'text-white' : 'text-foreground'
                }`}
              >
                {persona.title}
              </h3>
              <p
                className={`mb-7 leading-8 ${
                  persona.dark ? 'text-white/85' : 'text-muted-foreground'
                }`}
              >
                {persona.description}
              </p>

              <Link
                href={persona.link.href}
                title={persona.link.title}
                className={`mt-auto inline-flex items-center gap-2 rounded-lg px-1 text-sm font-bold underline-offset-8 hover:underline ${
                  persona.dark ? 'text-white' : 'text-primary'
                }`}
              >
                {persona.link.label}
                <ArrowLeft className="size-4" aria-hidden="true" />
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
