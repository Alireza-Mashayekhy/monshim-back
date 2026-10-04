import type { Metadata } from 'next';

import { siteConfig } from '@/lib/site-config';

interface PageSeoInput {
  /** عنوان صفحه بدون نام برند؛ الگوی نام برند از layout اضافه می‌شود. */
  title: string;
  /** عنوان کامل و مستقل از template، برای نمونه صفحهٔ اصلی. */
  absoluteTitle?: string;
  description: string;
  /** مسیر نسبی صفحه، مثلاً /pricing */
  path: string;
  /** تصویر Open Graph مطلق؛ پیش‌فرض تصویر صفحهٔ اصلی است. */
  imageUrl?: string;
  type?: 'website' | 'article';
  noIndex?: boolean;
}

export const TITLE_TEMPLATE = `%s | ${siteConfig.name}`;

/** Shared canonical, social-card and crawler metadata for public pages. */
export function buildPageMetadata({
  title,
  absoluteTitle,
  description,
  path,
  imageUrl,
  type = 'website',
  noIndex = false,
}: PageSeoInput): Metadata {
  const url = path === '/' ? siteConfig.url : `${siteConfig.url}${path}`;
  const image = imageUrl ?? `${siteConfig.url}/landing/og-home.png`;
  const finalTitle = absoluteTitle ?? `${title} | ${siteConfig.name}`;
  const robots = {
    index: !noIndex,
    follow: true,
    googleBot: {
      index: !noIndex,
      follow: true,
      'max-image-preview': 'large' as const,
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  };

  return {
    title: absoluteTitle ? { absolute: absoluteTitle } : title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type,
      url,
      siteName: `${siteConfig.name} | ${siteConfig.nameEn}`,
      title: finalTitle,
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
      title: finalTitle,
      description,
      images: [image],
    },
    robots,
  };
}

export function faqPageSchema(
  items: readonly { question: string; answer: string }[],
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map(item => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };
}

export const JSONLD_URLS = {
  home: siteConfig.url,
  management: siteConfig.url + siteConfig.routes.barberManagement,
  booking: siteConfig.url + siteConfig.routes.onlineBooking,
  pricing: siteConfig.url + siteConfig.routes.pricing,
};
