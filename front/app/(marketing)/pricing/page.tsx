import { RefreshCcw, ShieldCheck, Wallet } from 'lucide-react';
import type { Metadata } from 'next';

import CtaSection from '@/components/marketing/cta-section';
import JsonLd from '@/components/marketing/json-ld';
import PlanFeaturesTable from '@/components/marketing/pricing/plan-features-table';
import PlanRecommender from '@/components/marketing/pricing/plan-recommender';
import { PRICING_PLANS } from '@/components/marketing/pricing/plans-data';
import PricingFaq, {
  PRICING_FAQS,
} from '@/components/marketing/pricing/pricing-faq';
import PricingPlans from '@/components/marketing/pricing/pricing-plans';
import SectionHeading from '@/components/marketing/section-heading';
import Breadcrumbs from '@/components/marketing/shared/breadcrumbs';
import PageHero from '@/components/marketing/shared/page-hero';
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

      <PageHero
        eyebrow="تعرفه و قیمت پلن‌های منشیم"
        heading={
          <>
            تعرفه و قیمت پلن‌های{' '}
            <span className="text-primary">نرم افزار مدیریت آرایشگاه</span>{' '}
            منشیم
          </>
        }
        description="اشتراک‌ها ۳۰روزه‌اند و تفاوت پلن‌ها در سهمیه پیامک است. مبلغ اشتراک
        هر پلن مشخص است؛ کارمزد درگاه و کمیسیون پرداخت آنلاین رزرو نیز پیش
        از تأیید پرداخت نمایش داده می‌شود."
        imageSrc="/landing/hero-pricing.png"
        imageAlt="پنل مدیریت آرایشگاه و تعرفه پلن‌های اشتراک سامانه رزرو آنلاین منشیم"
        primaryCta={{
          href: '/register',
          label: 'شروع رایگان',
          title: 'ثبت‌نام رایگان نرم افزار مدیریت آرایشگاه منشیم',
        }}
        secondaryCta={{
          href: '/provider-management',
          label: 'امکانات مدیریت سالن',
          title: 'نرم افزار مدیریت آرایشگاه و امکانات منشیم',
        }}
        highlights={[
          'همه امکانات در همه پلن‌ها فعال',
          'قیمت شفاف بدون هزینه پنهان',
          'پشتیبانی آنلاین',
        ]}
      />

      {/* ضمانت‌های اشتراک منشیم */}
      <section
        aria-label="ضمانت‌های اشتراک منشیم"
        className="custom-container py-8 lg:py-10"
      >
        <ul className="mx-auto grid max-w-4xl gap-4 sm:grid-cols-3">
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

      {/* پیشنهاد پلن بر اساس حجم نوبت سالن */}
      <PlanRecommender />

      {/* کارت‌های پلن‌ها */}
      <section
        id="plans"
        aria-labelledby="plans-heading"
        className="custom-container pb-8"
      >
        <SectionHeading
          id="plans-heading"
          eyebrow="پلن‌های اشتراک"
          title="تعرفه پلن‌های منشیم"
          description="همه امکانات نرم افزار مدیریت آرایشگاه در همه پلن‌ها فعال است؛ تفاوت پلن‌ها فقط در سهمیه پیامک ماهانه و حجم رزرو پیشنهادی هر پلن است."
        />
        <div className="mt-12">
          <PricingPlans />
        </div>
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
