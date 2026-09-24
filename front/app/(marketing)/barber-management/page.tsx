import type { Metadata } from 'next';

import CtaSection from '@/components/marketing/cta-section';
import FaqSection from '@/components/marketing/faq-section';
import JsonLd from '@/components/marketing/json-ld';
import Breadcrumbs from '@/components/marketing/shared/breadcrumbs';
import FeatureRow from '@/components/marketing/shared/feature-row';
import PageHero from '@/components/marketing/shared/page-hero';
import { buildPageMetadata, JSONLD_URLS } from '@/lib/seo';
import { siteConfig } from '@/lib/site-config';

export const metadata: Metadata = buildPageMetadata({
  title: 'نرم افزار مدیریت آرایشگاه | مدیریت حرفه‌ای سالن',
  description:
    'نرم افزار مدیریت آرایشگاه منشیم؛ تقویم نوبت‌ها، پرونده و باشگاه مشتریان، مدیریت مالی و گزارش درآمد آرایشگاه را یکجا داشته باشید. مدیریت آرایشگاه خود را هوشمند و بدون دفتر و کاغذ انجام دهید.',
  path: siteConfig.routes.barberManagement,
  imageUrl: `${siteConfig.url}/landing/og-management.png`,
  keywords: [
    'برنامه مدیریت آرایشگاه',
    'نرم افزار سالن زیبایی',
    'مدیریت نوبت آرایشگاه',
    'سیستم مدیریت سالن',
    'نرم افزار CRM آرایشگاه',
  ],
});

/** داده ساخت‌یافته صفحه نرم افزار مدیریت آرایشگاه */
const managementJsonLd = [
  {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'نرم افزار مدیریت آرایشگاه منشیم',
    alternateName: 'Monshim Barbershop Management Software',
    url: JSONLD_URLS.management,
    applicationCategory: 'BusinessApplication',
    applicationSubCategory: 'Salon & Spa Management Software',
    operatingSystem: 'Web, Android, iOS',
    inLanguage: 'fa-IR',
    description:
      'نرم افزار مدیریت آرایشگاه و سالن زیبایی منشیم؛ تقویم نوبت، باشگاه مشتریان، مدیریت مالی و گزارش‌گیری.',
    offers: {
      '@type': 'Offer',
      price: 0,
      priceCurrency: 'IRR',
      description: 'پلن رایگان برای شروع',
      url: JSONLD_URLS.pricing,
    },
    featureList: [
      'تقویم هوشمند نوبت‌ها',
      'پرونده مشتریان و باشگاه مشتریان',
      'مدیریت مالی و گزارش درآمد',
      'مدیریت خدمات و آرایشگران',
      'صفحه اختصاصی آرایشگاه',
    ],
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
        name: 'نرم افزار مدیریت آرایشگاه',
        item: JSONLD_URLS.management,
      },
    ],
  },
];

/** مقایسه «قبل از منشیم / بعد از منشیم» */
const BEFORE_AFTER = [
  {
    title: 'بدون منشیم',
    isGood: false,
    points: [
      'تماس‌های پیاپی برای رزرو نوبت',
      'دفترچه نوبت و یادداشت‌های کاغذی',
      'نوبت‌های تداخلی و مشتری‌های جا مانده',
      'فراموش شدن سابقه و سلیقه مشتری',
      'پیگیری سخت بیعانه و پرداخت‌های نوبت',
    ],
  },
  {
    title: 'با نرم افزار مدیریت آرایشگاه منشیم',
    isGood: true,
    points: [
      'رزرو آنلاین آرایشگاه بدون تماس تلفنی',
      'تقویم هوشمند با جلوگیری از تداخل نوبت',
      'پرونده دیجیتال مشتریان با گروه‌بندی',
      'یادآوری پیامکی نوبت برای مشتریان',
      'پیگیری پرداخت‌ها در کیف پول و تسویه وجه',
    ],
  },
] as const;

const MANAGEMENT_FAQS = [
  {
    question: 'نرم افزار مدیریت آرایشگاه منشیم چه کارهایی را خودکار می‌کند؟',
    answer:
      'منشیم ثبت رزرو آنلاین آرایشگاه، جلوگیری از تداخل نوبت‌ها، یادآوری خودکار نوبت به مشتری، ثبت پرونده مشتریان و محاسبه گزارش مالی آرایشگاه را به صورت خودکار انجام می‌دهد تا وقت شما صرف کار اصلی شود.',
  },
  {
    question: 'آیا منشیم برای مدیریت آرایشگاه مردانه و سالن زیبایی هر دو مناسب است؟',
    answer:
      'بله؛ منشیم برای آرایشگاه مردانه، سالن زیبایی بانوان و سالن‌های مختلط طراحی شده است. خدمات، ساعات کاری و تعداد آرایشگران به دلخواه شما تنظیم می‌شود و برای هر نوع کسب‌وکار آرایشی قابل استفاده است.',
  },
  {
    question: 'گزارش مالی آرایشگاه در منشیم به چه صورت است؟',
    answer:
      'در پنل مدیریت منشیم، درآمد روزانه، هفتگی و ماهانه، تعداد رزروها، پرفروش‌ترین خدمات و مشتریان جدید و تکراری را به صورت نمودار و جدول می‌بینید؛ برای تصمیم‌گیری مدیریتی، داده دقیق در اختیار دارید.',
  },
  {
    question: 'آیا اطلاعات مشتریان آرایشگاه در منشیم امن است؟',
    answer:
      'بله؛ اطلاعات مشتریان شما فقط در حساب کاربری خودتان ذخیره می‌شود و قابل مشاهده توسط آرایشگاه‌های دیگر نیست. اطلاعات به صورت رمزنگاری‌شده نگهداری و به صورت روزانه پشتیبان‌گیری می‌شود.',
  },
];

export default function BarberManagementPage() {
  return (
    <>
      <JsonLd data={managementJsonLd} />

      <Breadcrumbs
        items={[
          { href: '/', label: 'منشیم' },
          { href: '/barber-management', label: 'نرم افزار مدیریت آرایشگاه' },
        ]}
      />

      <PageHero
        eyebrow="نرم افزار مدیریت آرایشگاه"
        heading={
          <>
            مدیریت آرایشگاه را با{' '}
            <span className="text-primary">نرم افزار منشیم</span> حرفه‌ای کنید
          </>
        }
        description="دفترچه نوبت و تماس‌های تکراری را کنار بگذارید. نرم افزار مدیریت آرایشگاه منشیم، نوبت دهی، مشتریان، مالی و گزارش‌های سالن شما را آنلاین و خودکار می‌کند؛ از موبایل و کامپیوتر."
        imageSrc="/landing/hero-management.png"
        imageAlt="نرم افزار مدیریت آرایشگاه و سالن زیبایی منشیم با داشبورد گزارش و مدیریت نوبت‌ها"
        primaryCta={{
          href: '/register',
          label: 'شروع رایگان مدیریت آرایشگاه',
          title: 'ثبت‌نام رایگان نرم افزار مدیریت آرایشگاه منشیم',
        }}
        secondaryCta={{
          href: '/pricing',
          label: 'مشاهده تعرفه‌ها',
          title: 'تعرفه و قیمت نرم افزار مدیریت آرایشگاه منشیم',
        }}
        highlights={[
          'راه‌اندازی در ۱۰ دقیقه',
          'بدون نیاز به نصب',
          'پشتیبانی فارسی',
        ]}
      />

      {/* ردیف‌های ویژگی اصلی — هر ردیف یک کلیدواژه کانونی */}
      <section aria-label="امکانات نرم افزار مدیریت آرایشگاه منشیم" className="custom-container">
        <FeatureRow
          id="calendar"
          eyebrow="تقویم و نوبت‌ها"
          title="تقویم هوشمند؛ مدیریت نوبت آرایشگاه بدون تداخل"
          description="همه نوبت‌های رزرو شده از کانال‌های مختلف در یک تقویم جمع می‌شود. ساعت‌های خالی و پر را یک نگاه ببینید، نوبت حضوری ثبت کنید و مطمئن باشید دو مشتری هرگز روی یک ساعت اتفاق نمی‌افتند."
          bullets={[
            'نمایش روزانه و هفتگی نوبت‌های هر آرایشگر',
            'ثبت نوبت دستی برای مشتری‌های حضوری و تلفنی',
            'تعیین مدت‌زمان هر خدمت برای جلوگیری از تأخیر',
            'تأیید، لغو یا جابه‌جایی نوبت با چند کلیک',
          ]}
          imageSrc="/landing/feature-calendar.png"
          imageAlt="تقویم هوشمند مدیریت نوبت آرایشگاه در نرم افزار منشیم"
        />

        <FeatureRow
          id="customers"
          reverse
          eyebrow="مشتریان"
          title="پرونده مشتریان و باشگاه مشتریان آرایشگاه"
          description="شماره تماس، سابقه رزرو و سلیقه هر مشتری همیشه در دسترس شماست. با باشگاه مشتریان منشیم، گروه‌های مختلف مشتری بسازید و برای هر گروه پیشنهاد و تخفیف مناسب بفرستید."
          bullets={[
            'پرونده دیجیتال هر مشتری با سابقه کامل رزروها',
            'گروه‌بندی مشتریان (VIP، عادی، غیرفعال)',
            'ارسال پیشنهاد و خبر خدمات جدید به گروه‌ها',
            'شناسایی مشتریان وفادار و افزایش مراجعه مجدد',
          ]}
          imageSrc="/landing/feature-customers.png"
          imageAlt="باشگاه مشتریان و مدیریت مشتریان آرایشگاه در سامانه منشیم"
        />

        <FeatureRow
          id="finance"
          eyebrow="مالی"
          title="کیف پول و تسویه وجه؛ پول نوبت‌ها همیشه در دسترس شما"
          description="پرداخت‌های نوبت‌های آنلاین در کیف پول منشیم ثبت می‌شود؛ موجودی و تراکنش‌ها را لحظه‌ای ببینید و هر زمان خواستید با تسویه وجه، درآمد را به کارت بانکی خود منتقل کنید."
          bullets={[
            'مشاهده لحظه‌ای موجودی کیف پول',
            'لیست تراکنش‌های دریافتی نوبت‌ها',
            'تسویه وجه به کارت بانکی شخصی',
            'ثبت و مدیریت کارت‌های بانکی',
          ]}
          imageSrc="/landing/feature-finance.png"
          imageAlt="کیف پول و تسویه وجه نوبت‌های آرایشگاه در نرم افزار منشیم"
        />
      </section>

      {/* مقایسه قبل و بعد */}
      <section aria-labelledby="before-after-heading" className="bg-primary-3">
        <div className="custom-container py-16 lg:py-24">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <p className="mb-3 inline-flex items-center rounded-full bg-white px-4 py-1 text-xs font-bold text-primary shadow-sm">
              چرا منشیم؟
            </p>
            <h2
              id="before-after-heading"
              className="text-2xl font-extrabold leading-[1.6] text-foreground sm:text-3xl"
            >
              مدیریت آرایشگاه، قبل و بعد از منشیم
            </h2>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {BEFORE_AFTER.map(card => (
              <article
                key={card.title}
                className={`rounded-3xl border bg-white p-7 shadow-sm lg:p-8 ${
                  card.isGood
                    ? 'border-primary shadow-md shadow-primary/10'
                    : 'border-primary-100/60'
                }`}
              >
                <h3
                  className={`mb-5 text-lg font-extrabold ${
                    card.isGood ? 'text-primary' : 'text-muted-foreground'
                  }`}
                >
                  {card.title}
                </h3>
                <ul className="space-y-3">
                  {card.points.map(point => (
                    <li
                      key={point}
                      className="flex items-start gap-2.5 text-sm leading-7 text-foreground/90"
                    >
                      <span
                        aria-hidden="true"
                        className={`mt-2 size-1.5 shrink-0 rounded-full ${
                          card.isGood ? 'bg-primary' : 'bg-muted-foreground/40'
                        }`}
                      />
                      {point}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      <FaqSection
        heading="سوالات متداول نرم افزار مدیریت آرایشگاه"
        items={MANAGEMENT_FAQS}
      />

      <CtaSection
        title="مدیریت آرایشگاه خود را از امروز به منشیم بسپارید"
        description="ثبت‌نام در منشیم چند دقیقه بیشتر طول نمی‌کشد؛ همین امروز نوبت دهی آنلاین و پنل مدیریت آرایشگاه خود را فعال کنید و از ماه اول تفاوت را ببینید."
      />
    </>
  );
}