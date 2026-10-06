import './globals.css';

import type { Metadata } from 'next';

import AnalyticsGate from '@/components/analytics/AnalyticsGate';
import GoogleAnalytics from '@/components/analytics/GoogleAnalytics';
import MicrosoftClarity from '@/components/analytics/MicrosoftClarity';
import { iranSans } from '@/components/font';
import JsonLd from '@/components/marketing/json-ld';
import { siteConfig } from '@/lib/site-config';
import { cn } from '@/lib/utils';

import Providers from './providers';

/**
 * با preconnect به origin واقعی API، هندشیک DNS/TLS قبل از اولین XHR
 * کلاینتی (`/auth/me`) انجام می‌شود و یک رفت‌وبرگشت شبکه ذخیره می‌شود.
 * اگر API روی همان دامنه سایت باشد، لینک اضافه‌ای تولید نمی‌کنیم.
 */
function apiOriginPreconnect(): string | null {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) return null;

  try {
    const origin = new URL(apiUrl).origin;
    return origin === new URL(siteConfig.url).origin ? null : origin;
  } catch {
    return null;
  }
}

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: 'رزرو آنلاین آرایشگاه و مدیریت سالن',
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
};

const globalStructuredData = [
  {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${siteConfig.url}/#organization`,
    name: siteConfig.name,
    alternateName: siteConfig.nameEn,
    url: siteConfig.url,
    logo: `${siteConfig.url}/logo/logo.png`,
    email: 'info@monshiim.ir',
    sameAs: ['https://www.instagram.com/monshiim', 'https://t.me/monshiim'],
  },
  {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${siteConfig.url}/#website`,
    name: siteConfig.name,
    alternateName: siteConfig.nameEn,
    url: siteConfig.url,
    inLanguage: 'fa-IR',
    publisher: { '@id': `${siteConfig.url}/#organization` },
  },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const preconnectOrigin = apiOriginPreconnect();

  return (
    <html
      lang="fa"
      dir="rtl"
      className={cn('h-full', 'antialiased', 'font-sans', iranSans.variable)}
    >
      <head>
        {preconnectOrigin ? (
          <link
            rel="preconnect"
            href={preconnectOrigin}
            crossOrigin="anonymous"
          />
        ) : null}
      </head>
      <body className="min-h-full flex flex-col bg-primary-3">
        {/*
          تنها دو origin ثالثِ واقعاً ضروری (آنالیتیکس). چون این اسکریپت‌ها
          lazy/idle بارگذاری می‌شوند، `dns-prefetch` کافی است: فقط DNS را از قبل
          حل می‌کند بدون اینکه کانکشنی باز کند که با منابع critical رقابت کند
          (برخلاف `preconnect` که برای این دو مورد زیاده‌روی است).
        */}
        <link rel="dns-prefetch" href="https://www.googletagmanager.com" />
        <link rel="dns-prefetch" href="https://www.clarity.ms" />

        <GoogleAnalytics />
        <MicrosoftClarity />
        <AnalyticsGate />
        <JsonLd data={globalStructuredData} />

        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
