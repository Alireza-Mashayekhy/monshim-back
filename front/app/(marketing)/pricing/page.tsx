import { RefreshCcw, ShieldCheck, Wallet } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import CtaSection from '@/components/marketing/cta-section';
import JsonLd from '@/components/marketing/json-ld';
import PlanFeaturesTable from '@/components/marketing/pricing/plan-features-table';
import { PRICING_PLANS } from '@/components/marketing/pricing/plans-data';
import PricingFaq, {
  PRICING_FAQS,
} from '@/components/marketing/pricing/pricing-faq';
import PricingPlans from '@/components/marketing/pricing/pricing-plans';
import { buildPageMetadata, JSONLD_URLS } from '@/lib/seo';
import { siteConfig } from '@/lib/site-config';

export const metadata: Metadata = buildPageMetadata({
  title: 'تعرفه و قیمت نرم افزار مدیریت آرایشگاه',
  description:
    'تعرفه پلن‌های منشیم از ماهانه ۵۹ هزار تومان؛ همه امکانات نوبت دهی آنلاین آرایشگاه و مدیریت آرایشگاه در همه پلن‌ها فعال است و تفاوت فقط در سهمیه پیامک ماهانه است.',
  path: siteConfig.routes.pricing,
  imageUrl: `${siteConfig.url}/landing/og-pricing.png`,
  keywords: [
    'قیمت نرم افزار آرایشگاه',
    'تعرفه نوبت دهی آنلاین',
    'پلن اشتراک منشیم',
    'خرید اشتراک منشیم',
  ],
});

/**
 * داده ساخت‌یافته صفحه تعرفه — قیمت‌ها عیناً از
 * back/src/subscription/constants.ts (تومان × ۱۰ = ریال).
 */
const pricingJsonLd = [
  {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: 'منشیم | نرم افزار مدیریت آرایشگاه و رزرو آنلاین',
    description:
      'سامانه رزرو آنلاین آرایشگاه و نرم افزار مدیریت آرایشگاه منشیم با پلن‌های آغاز، پایه، رشد، حرفه‌ای و ویژه.',
    brand: { '@type': 'Brand', name: 'منشیم (Monshim)' },
    url: JSONLD_URLS.pricing,
    offers: {
      '@type': 'AggregateOffer',
      priceCurrency: 'IRR',
      lowPrice: 590000,
      highPrice: 15490000,
      offerCount: 5,
      url: JSONLD_URLS.pricing,
      offers: PRICING_PLANS.map(plan => ({
        '@type': 'Offer',
        name: `${plan.name} (${plan.smsCount} پیامک ماهانه)`,
        price: plan.monthlyPrice * 10,
        priceCurrency: 'IRR',
        availability: 'https://schema.org/InStock',
        url: `${JSONLD_URLS.pricing}#plans`,
      })),
    },
  },
  {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: PRICING_FAQS.map(faq => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  },
];

const GUARANTEES = [
  {
    icon: ShieldCheck,
    title: 'همه امکانات فعال',
    description: 'در همه پلن‌ها، همه امکانات منشیم فعال است.',
  },
  {
    icon: RefreshCcw,
    title: 'اعتبار ۳۰ روزه',
    description: 'هر پلن یک‌ماهه است و هر زمان می‌توانید ارتقا دهید.',
  },
  {
    icon: Wallet,
    title: 'تسویه سریع درآمد',
    description: 'بیعانه نوبت‌ها در کیف پول شما می‌نشیند و قابل برداشت است.',
  },
] as const;

export default function PricingPage() {
  return (
    <>
      <JsonLd data={pricingJsonLd} />

      {/* بردکرامب (مسیر صفحه) */}
      <nav
        aria-label="مسیر صفحه"
        className="custom-container pt-6 text-xs text-muted-foreground"
      >
        <ol className="flex flex-wrap items-center gap-2">
          <li>
            <Link href="/" className="hover:text-primary">
              منشیم
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="font-bold text-foreground">
            تعرفه‌ها
          </li>
        </ol>
      </nav>

      <section
        aria-labelledby="pricing-hero-heading"
        className="custom-container py-10 lg:py-14"
      >
        <div className="mx-auto max-w-3xl text-center">
          <h1
            id="pricing-hero-heading"
            className="text-2xl font-black leading-[1.7] text-foreground sm:text-3xl lg:text-4xl lg:leading-[1.6]"
          >
            تعرفه و قیمت پلن‌های{' '}
            <span className="text-primary">نرم افزار مدیریت آرایشگاه</span>{' '}
            منشیم
          </h1>
          <p className="mt-5 leading-8 text-muted-foreground">
            اشتراک ماهانه از ۵۹ هزار تومان؛ همه امکانات در همه پلن‌ها فعال است و
            تفاوت فقط در سهمیه پیامک ماهانه است. شفاف و بدون هزینه پنهان.
          </p>
        </div>

        <ul className="mx-auto mt-10 grid max-w-4xl gap-4 sm:grid-cols-3">
          {GUARANTEES.map(item => (
            <li
              key={item.title}
              className="flex items-start gap-3 rounded-2xl border border-primary-100/60 bg-white p-4 shadow-sm"
            >
              <item.icon
                className="mt-0.5 size-5 shrink-0 text-primary"
                aria-hidden="true"
              />
              <span>
                <span className="block text-sm font-extrabold text-foreground">
                  {item.title}
                </span>
                <span className="mt-1 block text-xs leading-6 text-muted-foreground">
                  {item.description}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section
        id="plans"
        aria-labelledby="plans-heading"
        className="custom-container pb-8"
      >
        <h2 id="plans-heading" className="sr-only">
          پلن‌های اشتراک سامانه رزرو آنلاین آرایشگاه منشیم
        </h2>
        <PricingPlans />
      </section>

      <PlanFeaturesTable />

      <PricingFaq />

      <CtaSection
        title="منشیم را همین امروز برای سالن خود فعال کنید"
        description="ثبت‌نام کنید، خدمات و ساعات کاری خود را وارد کنید و اولین رزرو آنلاین آرایشگاه خود را همین امروز دریافت کنید."
        secondaryLabel="سوال دارید؟ صفحه اصلی را ببینید"
        secondaryTitle="بازگشت به صفحه اصلی منشیم"
        secondaryHref="/"
      />
    </>
  );
}
