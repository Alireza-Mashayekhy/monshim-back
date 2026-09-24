import type { Metadata } from 'next';

import CtaSection from '@/components/marketing/cta-section';
import HomeFaq, { HOME_FAQS } from '@/components/marketing/home/home-faq';
import HomeFeatures from '@/components/marketing/home/home-features';
import HomeHero from '@/components/marketing/home/home-hero';
import HomeHowItWorks from '@/components/marketing/home/home-how-it-works';
import HomePersonas from '@/components/marketing/home/home-personas';
import HomePreview from '@/components/marketing/home/home-preview';
import HomeProblems from '@/components/marketing/home/home-problems';
import JsonLd from '@/components/marketing/json-ld';
import { buildPageMetadata, JSONLD_URLS } from '@/lib/seo';
import { siteConfig } from '@/lib/site-config';

export const metadata: Metadata = buildPageMetadata({
  title: 'منشیم | سامانه رزرو آنلاین آرایشگاه و نرم افزار مدیریت آرایشگاه',
  absoluteTitle:
    'منشیم | سامانه رزرو آنلاین آرایشگاه و نرم افزار مدیریت آرایشگاه',
  description:
    'منشیم (Monshim) سامانه رزرو آنلاین آرایشگاه و نرم افزار مدیریت آرایشگاه است؛ نوبت دهی آنلاین ۲۴ ساعته، باشگاه مشتریان، مدیریت مالی و گزارش درآمد آرایشگاه را یکجا داشته باشید. ثبت‌نام رایگان.',
  path: siteConfig.routes.home,
});

/** داده ساخت‌یافته صفحه اصلی: SoftwareApplication + WebSite + FAQPage */
const homeJsonLd = [
  {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'منشیم (Monshim)',
    alternateName: 'Monshim',
    url: JSONLD_URLS.home,
    applicationCategory: 'BusinessApplication',
    applicationSubCategory: 'Booking & Appointment Scheduling Software',
    operatingSystem: 'Web, Android, iOS',
    inLanguage: 'fa-IR',
    description:
      'منشیم، سامانه رزرو آنلاین آرایشگاه و نرم افزار مدیریت آرایشگاه؛ شامل نوبت دهی آنلاین، باشگاه مشتریان، یادآوری پیامکی و کیف پول.',
    offers: {
      '@type': 'AggregateOffer',
      priceCurrency: 'IRR',
      lowPrice: 590000,
      highPrice: 15490000,
      offerCount: 5,
      url: JSONLD_URLS.pricing,
    },
    featureList: [
      'رزرو آنلاین آرایشگاه',
      'نوبت دهی آنلاین ۲۴ ساعته',
      'تقویم هوشمند نوبت‌ها',
      'یادآوری پیامکی نوبت',
      'پرداخت آنلاین و کیف پول',
      'باشگاه مشتریان',
      'صفحه اختصاصی آرایشگاه',
    ],
  },
  {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'منشیم | Monshim',
    alternateName: 'Monshim',
    url: JSONLD_URLS.home,
    inLanguage: 'fa-IR',
    description:
      'سامانه رزرو آنلاین آرایشگاه و نرم افزار مدیریت آرایشگاه و سالن زیبایی',
  },
  {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: HOME_FAQS.map(faq => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  },
];

export default function HomePage() {
  return (
    <>
      <JsonLd data={homeJsonLd} />
      <HomeHero />
      <HomePersonas />
      <HomeProblems />
      <HomeFeatures />
      <HomeHowItWorks />
      <HomePreview />
      <HomeFaq />
      <CtaSection
        title="همین حالا با منشیم شروع کنید"
        description="نوبت دهی و مدیریت آرایشگاه خود را به منشیم بسپارید؛ ثبت‌نام رایگان است، کمتر از ۱۰ دقیقه طول می‌کشد و از همان روز اول اولین نوبت‌های آنلاین را دریافت می‌کنید."
      />
    </>
  );
}
