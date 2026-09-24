import type { Metadata } from 'next';

import { siteConfig } from '@/lib/site-config';

interface PageSeoInput {
  /** عنوان کوتاه صفحه (بدون نام برند — به صورت خودکار اضافه می‌شود) */
  title: string;
  /** عنوان کامل و نهایی؛ الگوی «%s | منشیم» را نادیده می‌گیرد (برای صفحه اصلی) */
  absoluteTitle?: string;
  /** توضیح متا؛ ۱۲۰ تا ۱۶۰ کاراکتر توصیه می‌شود */
  description: string;
  /** مسیر نسبی صفحه، مثلاً /pricing */
  path: string;
  /** کلیدواژه‌های اختصاصی صفحه (به کلیدواژه‌های برند اضافه می‌شوند) */
  keywords?: readonly string[];
  /** تصویر Open Graph مطلق؛ پیش‌فرض بنر برند شده صفحه اصلی است */
  imageUrl?: string;
  /** برای صفحات وبلاگ/مقالات */
  type?: 'website' | 'article';
}

/** ایندکس پایه: عنوان با الگوی «عنوان صفحه | منشیم» */
export const TITLE_TEMPLATE = `%s | ${siteConfig.name}`;

/**
 * سازنده متادیتای استاندارد صفحات لندینگ.
 * شامل: title/description، canonical، Open Graph، Twitter Card و robots.
 */
export function buildPageMetadata({
  title,
  absoluteTitle,
  description,
  path,
  keywords,
  imageUrl,
  type = 'website',
}: PageSeoInput): Metadata {
  const url = `${siteConfig.url}${path}`;
  const image = imageUrl ?? `${siteConfig.url}/landing/og-home.png`;
  const finalTitle = absoluteTitle ?? title;
  const ogTitle = `${title} | ${siteConfig.name}`;

  return {
    title: finalTitle,
    description,
    keywords: [...siteConfig.keywords, ...(keywords ?? [])],
    alternates: {
      canonical: url,
    },
    openGraph: {
      type,
      url,
      siteName: `${siteConfig.name} | ${siteConfig.nameEn}`,
      title: ogTitle,
      description,
      locale: siteConfig.locale,
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: `${title} - ${siteConfig.name}`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: ogTitle,
      description,
      images: [image],
      site: siteConfig.twitter,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-image-preview': 'large',
        'max-snippet': -1,
        'max-video-preview': -1,
      },
    },
  };
}

export const JSONLD_URLS = {
  home: siteConfig.url + siteConfig.routes.home,
  management: siteConfig.url + siteConfig.routes.barberManagement,
  booking: siteConfig.url + siteConfig.routes.onlineBooking,
  pricing: siteConfig.url + siteConfig.routes.pricing,
};
