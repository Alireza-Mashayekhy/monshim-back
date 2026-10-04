import { RefreshCcw, ShieldCheck, Wallet } from 'lucide-react';
import type { Metadata } from 'next';

import CtaSection from '@/components/marketing/cta-section';
import JsonLd from '@/components/marketing/json-ld';
import PlanFeaturesTable from '@/components/marketing/pricing/plan-features-table';
import { PRICING_PLANS } from '@/components/marketing/pricing/plans-data';
import PricingFaq, {
  PRICING_FAQS,
} from '@/components/marketing/pricing/pricing-faq';
import PricingPlans from '@/components/marketing/pricing/pricing-plans';
import Breadcrumbs from '@/components/marketing/shared/breadcrumbs';
import { buildPageMetadata, faqPageSchema, JSONLD_URLS } from '@/lib/seo';
import { siteConfig } from '@/lib/site-config';

export const metadata: Metadata = buildPageMetadata({
  title: 'تعرفه و قیمت نرم افزار مدیریت آرایشگاه',
  description:
    'تعرفه پلن‌های منشیم از ماهانه ۵۹ هزار تومان؛ همه امکانات نوبت دهی آنلاین آرایشگاه و مدیریت آرایشگاه در همه پلن‌ها فعال است و تفاوت فقط در سهمیه پیامک ماهانه است.',
  path: siteConfig.routes.pricing,
  imageUrl: `${siteConfig.url}/landing/og-pricing.png`,
});

/**
 * داده ساخت‌یافته صفحه تعرفه — قیمت‌ها عیناً از
 * back/src/subscription/constants.ts (تومان × ۱۰ = ریال).
 */
const planPricesInRial = PRICING_PLANS.map(plan => plan.monthlyPrice * 10);

const pricingJsonLd = [
  {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': `${JSONLD_URLS.pricing}#webpage`,
    url: JSONLD_URLS.pricing,
    name: 'تعرفه و قیمت نرم افزار مدیریت آرایشگاه منشیم',
    description: 'قیمت‌ها و سهمیهٔ پیامک پلن‌های اشتراک ۳۰روزهٔ منشیم.',
    inLanguage: 'fa-IR',
    isPartOf: { '@id': `${siteConfig.url}/#website` },
  },
  {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'منشیم | نرم افزار مدیریت آرایشگاه و رزرو آنلاین',
    description:
      'سامانه رزرو آنلاین آرایشگاه و نرم افزار مدیریت آرایشگاه منشیم با پنج پلن اشتراک ۳۰روزه.',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web browser',
    inLanguage: 'fa-IR',
    publisher: { '@id': `${siteConfig.url}/#organization` },
    url: JSONLD_URLS.pricing,
    offers: {
      '@type': 'AggregateOffer',
      priceCurrency: 'IRR',
      lowPrice: Math.min(...planPricesInRial),
      highPrice: Math.max(...planPricesInRial),
      offerCount: PRICING_PLANS.length,
      url: JSONLD_URLS.pricing,
      offers: PRICING_PLANS.map(plan => ({
        '@type': 'Offer',
        name: `${plan.name}؛ ${plan.smsCount} پیامک برای ۳۰ روز`,
        price: plan.monthlyPrice * 10,
        priceCurrency: 'IRR',
        availability: 'https://schema.org/InStock',
        url: `${JSONLD_URLS.pricing}#plans`,
      })),
    },
  },
  faqPageSchema(PRICING_FAQS),
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
    title: 'پیگیری مالی در پنل',
    description:
      'موجودی کیف پول و تراکنش‌های مرتبط با نوبت‌ها را از پنل مالی پیگیری کنید.',
  },
] as const;

export default function PricingPage() {
  return (
    <>
      <JsonLd data={pricingJsonLd} />

      <Breadcrumbs
        items={[
          { href: '/', label: 'منشیم' },
          { href: '/pricing', label: 'تعرفه‌ها' },
        ]}
      />

      <section
        aria-labelledby="pricing-hero-heading"
        className="custom-container py-8 lg:py-14"
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
            اشتراک‌ها ۳۰روزه‌اند و تفاوت پلن‌ها در سهمیه پیامک است. مبلغ اشتراک
            هر پلن مشخص است؛ کارمزد درگاه و کمیسیون پرداخت آنلاین رزرو نیز پیش
            از تأیید پرداخت نمایش داده می‌شود.
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
