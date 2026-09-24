import { CalendarSearch, MapPin, ReceiptText, Star } from 'lucide-react';
import type { Metadata } from 'next';
import Image from 'next/image';

import CtaSection from '@/components/marketing/cta-section';
import FaqSection from '@/components/marketing/faq-section';
import JsonLd from '@/components/marketing/json-ld';
import SectionHeading from '@/components/marketing/section-heading';
import Breadcrumbs from '@/components/marketing/shared/breadcrumbs';
import FeatureRow from '@/components/marketing/shared/feature-row';
import { buildPageMetadata, JSONLD_URLS } from '@/lib/seo';
import { siteConfig } from '@/lib/site-config';

export const metadata: Metadata = buildPageMetadata({
  title: 'رزرو آنلاین آرایشگاه | نوبت دهی اینترنتی',
  description:
    'رزرو آنلاین آرایشگاه مردانه و سالن زیبایی با منشیم؛ روز، ساعت و آرایشگر دلخواه خود را انتخاب کنید و بدون تماس تلفنی نوبت بگیرید. نوبت دهی آرایشگاه ۲۴ ساعته، رایگان و با یادآوری خودکار.',
  path: siteConfig.routes.onlineBooking,
  imageUrl: `${siteConfig.url}/landing/og-booking.png`,
  keywords: [
    'رزرو اینترنتی آرایشگاه',
    'نوبت آرایشگاه آنلاین',
    'رزرو آرایشگاه مردانه',
    'رزرو نوبت آرایشگاه',
    'رزرو سالن زیبایی',
  ],
});

const bookingJsonLd = [
  {
    '@context': 'https://schema.org',
    '@type': 'Service',
    serviceType: 'رزرو آنلاین آرایشگاه و نوبت دهی اینترنتی',
    name: 'رزرو آنلاین آرایشگاه منشیم',
    alternateName: 'Monshim Online Barber Booking',
    url: JSONLD_URLS.booking,
    provider: {
      '@type': 'Organization',
      name: 'منشیم (Monshim)',
      url: JSONLD_URLS.home,
    },
    areaServed: {
      '@type': 'Country',
      name: 'Iran',
    },
    inLanguage: 'fa-IR',
    description:
      'سامانه رزرو آنلاین آرایشگاه و نوبت دهی اینترنتی آرایشگاه مردانه و سالن زیبایی در منشیم؛ انتخاب روز، ساعت و آرایشگر بدون تماس تلفنی.',
    offers: {
      '@type': 'Offer',
      price: 0,
      priceCurrency: 'IRR',
      description: 'رزرو آرایشگاه برای مشتریان رایگان است',
    },
  },
  {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'منشیم',
        item: JSONLD_URLS.home,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'رزرو آنلاین آرایشگاه',
        item: JSONLD_URLS.booking,
      },
    ],
  },
];

/** مراحل رزرو برای مشتریان */
const BOOKING_STEPS = [
  {
    icon: CalendarSearch,
    title: 'آرایشگاه را پیدا کنید',
    description:
      'در صفحه جست‌وجوی منشیم، آرایشگاه‌های نزدیک خود را بر اساس منطقه، امتیاز و خدمات پیدا کنید.',
  },
  {
    icon: ReceiptText,
    title: 'خدمت و ساعت را انتخاب کنید',
    description:
      'لیست خدمات همراه با قیمت را ببینید، روز و ساعت دلخواه را از تقویم انتخاب کنید.',
  },
  {
    icon: Star,
    title: 'نوبتتان را قطعی کنید',
    description:
      'رزرو را تأیید کنید؛ بلافاصله نوبت شما ثبت می‌شود و پیش از موعد هم یادآوری می‌شود.',
  },
] as const;

const BOOKING_FAQS = [
  {
    question: 'رزرو آنلاین آرایشگاه در منشیم چگونه است؟',
    answer:
      'وارد صفحه آرایشگاه موردنظر در منشیم شوید، خدمت را همراه با قیمت و مدت‌زمان انتخاب کنید، روز و ساعت خالی را از تقویم مشخص کنید و رزرو را با پرداخت آنلاین قطعی کنید. کل فرایند کمتر از چند دقیقه طول می‌کشد و نیازی به تماس تلفنی نیست.',
  },
  {
    question: 'آیا رزرو آرایشگاه در منشیم هزینه دارد؟',
    answer:
      'استفاده از منشیم و رزرو برای مشتریان رایگان است؛ فقط هزینه خدمت انتخابی را پرداخت می‌کنید. پرداخت به صورت آنلاین از طریق درگاه پرداخت امن انجام می‌شود و در برخی خدمات ممکن است فقط بیعانه دریافت شود و باقی هزینه در حضور تسویه گردد.',
  },
  {
    question: 'اگر بخواهم نوبتم را لغو کنم چه کار کنم؟',
    answer:
      'از بخش نوبت‌های من در پنل کاربری منشیم می‌توانید نوبت‌های خود را ببینید و نوبت‌های جاری (در انتظار تأیید یا تأیید شده) را تا پیش از زمان رزرو لغو کنید. آرایشگاه هم بلافاصله از لغو نوبت باخبر می‌شود.',
  },
  {
    question: 'چطور مطمئن شوم نوبتم ثبت شده است؟',
    answer:
      'پس از ثبت رزرو، وضعیت نوبت (در انتظار تأیید یا تأیید شده) در پنل کاربری شما قابل مشاهده است و پیش از موعد نوبت نیز پیامک یادآوری برای شما ارسال می‌شود.',
  },
];

export default function OnlineBarberBookingPage() {
  return (
    <>
      <JsonLd data={bookingJsonLd} />

      <Breadcrumbs
        items={[
          { href: '/', label: 'منشیم' },
          { href: '/online-barber-booking', label: 'رزرو آنلاین آرایشگاه' },
        ]}
      />

      <section className="relative overflow-hidden bg-gradient-to-b from-primary-2/70 to-background">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-32 -top-32 size-96 rounded-full bg-primary-2 blur-3xl"
        />
        <div className="custom-container relative grid items-center gap-10 py-12 lg:grid-cols-2 lg:gap-8 lg:py-16">
          <div className="text-center lg:text-start">
            <p className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-primary-200/60 bg-white px-4 py-1.5 text-xs font-bold text-primary shadow-sm">
              <MapPin className="size-3.5" aria-hidden="true" />
              سامانه رزرو آرایشگاه در سراسر ایران
            </p>

            <h1 className="text-[1.6rem] font-black leading-[1.7] text-foreground sm:text-3xl sm:leading-[1.6] lg:text-[2.35rem] lg:leading-[1.6]">
              <span className="text-primary">رزرو آنلاین آرایشگاه</span>؛ بدون
              تماس تلفنی، بدون معطلی
            </h1>

            <p className="mx-auto mt-5 max-w-xl leading-8 text-muted-foreground lg:mx-0">
              با منشیم، نوبت دهی آرایشگاه آنلاین شده است؛ آرایشگاه مردانه یا
              سالن زیبایی موردنظرتان را پیدا کنید، قیمت خدمات را ببینید و در
              کمتر از یک دقیقه روز و ساعت دلخواه را رزرو کنید. رایگان و ۲۴
              ساعته.
            </p>

            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start">
              <a
                href="/explore"
                title="جست‌وجو و رزرو آنلاین آرایشگاه در منشیم"
                className="inline-flex h-10.5 items-center justify-center rounded-lg bg-primary px-5 text-sm font-medium text-white transition-colors hover:bg-primary/80"
              >
                رزرو آرایشگاه نزدیک من
              </a>
              <a
                href="/register"
                title="ثبت رایگان آرایشگاه در سامانه نوبت دهی منشیم"
                className="inline-flex h-10.5 items-center justify-center rounded-lg border border-primary-300 bg-white px-5 text-sm font-medium text-foreground transition-colors hover:bg-primary-2"
              >
                آرایشگاه دارم؛ می‌خواهم آنلاین شوم
              </a>
            </div>
          </div>

          <div className="relative">
            <Image
              src="/landing/hero-booking.png"
              alt="رزرو آنلاین آرایشگاه و نوبت دهی اینترنتی با گوشی موبایل در منشیم"
              width={1400}
              height={768}
              priority
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="h-auto w-full rounded-3xl"
            />
          </div>
        </div>
      </section>

      {/* مراحل رزرو برای مشتری */}
      <section aria-labelledby="booking-steps-heading" className="bg-primary-3">
        <div className="custom-container py-16 lg:py-24">
          <SectionHeading
            id="booking-steps-heading"
            eyebrow="رزرو در ۳ قدم"
            title="نوبت آرایشگاهتان را در چند ثانیه رزرو کنید"
            description="منشیم رزرو آرایشگاه را به ساده‌ترین شکل ممکن کرده؛ سه قدم بیشتر نیست."
          />

          <ol className="mt-12 grid gap-6 md:grid-cols-3">
            {BOOKING_STEPS.map((step, index) => (
              <li
                key={step.title}
                className="relative rounded-3xl border border-primary-100/60 bg-white p-6 shadow-sm"
              >
                <span
                  aria-hidden="true"
                  className="absolute -top-4 right-6 flex size-9 items-center justify-center rounded-full bg-primary text-sm font-black text-white shadow-md"
                >
                  {index + 1}
                </span>
                <step.icon className="mb-4 size-8 text-primary" aria-hidden="true" />
                <h3 className="mb-2 text-base font-extrabold text-foreground">
                  {step.title}
                </h3>
                <p className="text-sm leading-7 text-muted-foreground">
                  {step.description}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ردیف‌های ویژگی */}
      <section aria-label="امکانات رزرو آنلاین آرایشگاه منشیم" className="custom-container">
        <FeatureRow
          eyebrow="آرایشگاه‌ها"
          title="صفحه اختصاصی هر آرایشگاه؛ رزرو با دید باز"
          description="پیش از رزرو، نمونه‌کارها، لیست کامل خدمات با قیمت، آدرس و نظرات مشتریان قبلی را ببینید و با اطمینان انتخاب کنید."
          bullets={[
            'گالری نمونه‌کار هر آرایشگاه',
            'قیمت و مدت‌زمان دقیق هر خدمت',
            'امتیاز آرایشگاه‌ها قبل از انتخاب',
            'آدرس کامل آرایشگاه در صفحه اختصاصی',
          ]}
          imageSrc="/landing/hero-management.png"
          imageAlt="صفحه اختصاصی آرایشگاه برای رزرو آنلاین در سامانه منشیم"
        />

        <FeatureRow
          eyebrow="تقویم و یادآوری"
          reverse
          title="نوبت‌های شما همیشه یادت هست؛ منشیم حواسش هست"
          description="نوبت‌های رزرو شده در پنل کاربری شما جمع می‌شود و پیش از موعد، با پیام یادآوری می‌شود؛ دیگر هیچ نوبتی را فراموش نکنید."
          bullets={[
            'یادآوری خودکار پیش از زمان نوبت',
            'مشاهده وضعیت نوبت (تأیید شده یا در انتظار)',
            'امکان لغو یا جابه‌جایی نوبت به صورت آنلاین',
            'سابقه کامل نوبت‌های گذشته',
          ]}
          imageSrc="/landing/feature-calendar.png"
          imageAlt="یادآوری خودکار نوبت و تقویم رزرو آرایشگاه در منشیم"
        />
      </section>

      <FaqSection
        heading="سوالات متداول رزرو آنلاین آرایشگاه"
        items={BOOKING_FAQS}
      />

      <CtaSection
        title="همین حالا اولین نوبتتان را آنلاین رزرو کنید"
        description="هزاران آرایشگاه و سالن زیبایی در منشیم منتظر شما هستند؛ رزرو آرایشگاه رایگان است و کمتر از یک دقیقه طول می‌کشد."
        secondaryLabel="آرایشگاه دارید؟ تعرفه‌ها را ببینید"
        secondaryTitle="تعرفه پلن‌های نرم افزار مدیریت آرایشگاه منشیم"
      />
    </>
  );
}