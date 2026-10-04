import type { Metadata } from 'next';

import CtaSection from '@/components/marketing/cta-section';
import HomeFaq, { HOME_FAQS } from '@/components/marketing/home/home-faq';
import HomeFeatures from '@/components/marketing/home/home-features';
import HomeHero from '@/components/marketing/home/home-hero';
import HomeHowItWorks from '@/components/marketing/home/home-how-it-works';
import HomePreview from '@/components/marketing/home/home-preview';
import HomeRoleSummary from '@/components/marketing/home/home-role-summary';
import JsonLd from '@/components/marketing/json-ld';
import { PRICING_PLANS } from '@/components/marketing/pricing/plans-data';
import { buildPageMetadata, faqPageSchema, JSONLD_URLS } from '@/lib/seo';
import { siteConfig } from '@/lib/site-config';

export const metadata: Metadata = buildPageMetadata({
  title: 'رزرو آنلاین آرایشگاه و مدیریت سالن',
  absoluteTitle: 'منشیم | رزرو آنلاین آرایشگاه و مدیریت سالن',
  description:
    'در منشیم آرایشگاه‌های تأییدشده را جست‌وجو کنید، خدمات و قیمت‌ها را ببینید و برای رزرو اقدام کنید؛ سالن‌داران هم نوبت‌ها و مشتریان را در پنل مدیریت می‌کنند.',
  path: siteConfig.routes.home,
});

const planPricesInRial = PRICING_PLANS.map(plan => plan.monthlyPrice * 10);

const homeJsonLd = [
  {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': `${JSONLD_URLS.home}#webpage`,
    url: JSONLD_URLS.home,
    name: 'رزرو آنلاین آرایشگاه و مدیریت سالن | منشیم',
    description:
      'جست‌وجوی آرایشگاه‌های تأییدشده برای مشتریان و ابزار مدیریت نوبت و مشتری برای سالن‌داران.',
    inLanguage: 'fa-IR',
    isPartOf: { '@id': `${siteConfig.url}/#website` },
  },
  {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    '@id': `${JSONLD_URLS.home}#application`,
    name: 'منشیم',
    alternateName: siteConfig.nameEn,
    url: JSONLD_URLS.home,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web browser',
    inLanguage: 'fa-IR',
    description:
      'سامانهٔ رزرو آنلاین آرایشگاه برای مشتریان و مدیریت نوبت، خدمات، پیامک و امور مالی سالن برای آرایشگران.',
    publisher: { '@id': `${siteConfig.url}/#organization` },
    offers: {
      '@type': 'AggregateOffer',
      priceCurrency: 'IRR',
      lowPrice: Math.min(...planPricesInRial),
      highPrice: Math.max(...planPricesInRial),
      offerCount: PRICING_PLANS.length,
      url: JSONLD_URLS.pricing,
    },
    featureList: [
      'مدیریت نوبت‌های سالن',
      'مدیریت خدمات و ساعات کاری',
      'پرونده و گروه‌بندی مشتریان',
      'یادآوری پیامکی',
      'مدیریت پرداخت‌ها و کیف پول',
      'صفحهٔ عمومی سالن برای مشاهده و رزرو خدمات',
    ],
  },
  faqPageSchema(HOME_FAQS),
];

export default function HomePage() {
  return (
    <>
      <JsonLd data={homeJsonLd} />
      <HomeHero />
      <HomeRoleSummary />
      <div id="features" className="scroll-mt-32">
        <HomeFeatures />
      </div>
      <HomeHowItWorks />
      <HomePreview />
      <HomeFaq />
      <CtaSection
        title="سالن خودتان را آنلاین کنید"
        description="خدمات و ساعات کاری را مشخص کنید و لینک رزرو سالن را با مشتریانتان به اشتراک بگذارید."
      />
    </>
  );
}
