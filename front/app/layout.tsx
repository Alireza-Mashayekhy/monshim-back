import './globals.css';

import { dehydrate } from '@tanstack/react-query';
import type { Metadata } from 'next';
import { cookies } from 'next/headers';

import GoogleAnalytics from '@/components/analytics/GoogleAnalytics';
import MicrosoftClarity from '@/components/analytics/MicrosoftClarity';
import { iranSans } from '@/components/font';
import JsonLd from '@/components/marketing/json-ld';
import { makeQueryClient } from '@/lib/query-client';
import { extractUser } from '@/lib/roles';
import { siteConfig } from '@/lib/site-config';
import { cn } from '@/lib/utils';
import AuthProvider from '@/providers/auth.provider';
import { authKeys } from '@/services/features/auth/hooks';
import { getMe } from '@/services/features/auth/server.api';
import { UserResponse } from '@/services/features/auth/types';

import Providers from './providers';

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

/** Only authoritative API data is hydrated; never fall back to request headers. */
async function resolveUser(): Promise<{
  user: UserResponse | null;
  known: boolean;
}> {
  const cookieStore = await cookies();
  if (!cookieStore.has('access_token')) {
    // No access token at all: if there's also no refresh token, this is
    // definitively a logged-out guest — no need to ask the API to confirm it.
    const hasRefreshToken = cookieStore.has('refresh_token');
    return { user: null, known: !hasRefreshToken };
  }
  try {
    return { user: extractUser(await getMe()), known: true };
  } catch {
    return { user: null, known: false };
  }
}

/**
 * کاربر را از سرور می‌گیریم و در کش react-query می‌گذاریم تا
 * در اولین رندر مرورگر هم در دسترس باشد (بدون پرش/خالی ماندن منوها).
 */
function buildDehydratedState(user: UserResponse | null, known: boolean) {
  const queryClient = makeQueryClient();

  if (known) {
    queryClient.setQueryData(authKeys.me, {
      status: user ? 200 : 401,
      message: '',
      data: user,
    });
  }

  return dehydrate(queryClient);
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { user, known } = await resolveUser();

  return (
    <html
      lang="fa"
      dir="rtl"
      className={cn('h-full', 'antialiased', 'font-sans', iranSans.className)}
    >
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
        <JsonLd data={globalStructuredData} />

        <Providers dehydratedState={buildDehydratedState(user, known)}>
          <AuthProvider>{children}</AuthProvider>
        </Providers>
      </body>
    </html>
  );
}
