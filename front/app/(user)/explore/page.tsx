import type { Metadata } from 'next';
import Link from 'next/link';

import JsonLd from '@/components/marketing/json-ld';
import ExploreClient from '@/components/pages/explore/explore-client';
import { fetchPublicApi } from '@/lib/public-api';
import { buildPageMetadata } from '@/lib/seo';
import { siteConfig } from '@/lib/site-config';
import type { ApiListResponse } from '@/services/api/types';
import type {
  BarberResponse,
  PublicDirectoryResponse,
} from '@/services/features/barber/types';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 10;
const pageDescription =
  'آرایشگاه‌های تأییدشده را جست‌وجو کنید، نام و موقعیت سالن را ببینید و خدمات و قیمت‌های ثبت‌شده را بررسی کنید. مشاهدهٔ پروفایل عمومی بدون ورود ممکن است.';

async function getInitialResults() {
  return fetchPublicApi<ApiListResponse<BarberResponse>>(
    `/barber?page=1&limit=${PAGE_SIZE}&sort=createdAt%3Adesc`,
  );
}

export async function generateMetadata(): Promise<Metadata> {
  const [initialResults, directory] = await Promise.all([
    getInitialResults(),
    fetchPublicApi<PublicDirectoryResponse>('/barber/public-directory'),
  ]);
  return buildPageMetadata({
    title: 'جست‌وجوی آرایشگاه‌ها و سالن‌های زیبایی',
    description: pageDescription,
    path: siteConfig.routes.explore,
    noIndex: !initialResults?.data.length || !directory?.barbers.length,
  });
}

export default async function ExplorePage() {
  const [initialResults, directory] = await Promise.all([
    getInitialResults(),
    fetchPublicApi<PublicDirectoryResponse>('/barber/public-directory'),
  ]);

  const cityLinks = directory?.cities.slice(0, 12) ?? [];
  const publicSalons = initialResults?.data ?? [];
  const exploreUrl = `${siteConfig.url}${siteConfig.routes.explore}`;

  const structuredData = [
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      '@id': `${exploreUrl}#webpage`,
      url: exploreUrl,
      name: 'جست‌وجوی آرایشگاه‌ها و سالن‌های زیبایی',
      description: pageDescription,
      inLanguage: 'fa-IR',
      isPartOf: { '@id': `${siteConfig.url}/#website` },
      mainEntity: {
        '@type': 'ItemList',
        numberOfItems: publicSalons.length,
        itemListElement: publicSalons.map((salon, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          item: {
            '@type': 'HairSalon',
            name: salon.salonName,
            url: `${siteConfig.url}/barber/${salon.id}`,
          },
        })),
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: siteConfig.name,
          item: siteConfig.url,
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'جست‌وجوی آرایشگاه‌ها',
          item: exploreUrl,
        },
      ],
    },
  ];

  return (
    <main id="main-content" className="min-h-screen bg-background pb-24">
      <JsonLd data={structuredData} />

      <header className="border-b border-primary-100/60 bg-gradient-to-b from-primary-2/60 to-background px-4 py-7 sm:py-10">
        <div className="mx-auto max-w-5xl">
          <h1 className="text-2xl font-black leading-relaxed text-foreground sm:text-3xl">
            جست‌وجوی آرایشگاه و سالن زیبایی
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-muted-foreground">
            پروفایل‌های تأییدشده را ببینید، موقعیت سالن را بررسی کنید و خدمات و
            قیمت‌های ثبت‌شده را بخوانید. برای مشاهده نیازی به ورود نیست؛ ورود
            هنگام نهایی‌کردن رزرو لازم می‌شود.
          </p>
        </div>
      </header>

      {cityLinks.length > 0 && (
        <section
          aria-labelledby="public-cities-heading"
          className="mx-auto max-w-5xl px-4 pt-5"
        >
          <h2
            id="public-cities-heading"
            className="text-sm font-extrabold text-foreground"
          >
            شهرهایی با آرایشگاه‌های قابل رزرو
          </h2>
          <nav
            aria-label="جست‌وجوی آرایشگاه بر اساس شهر"
            className="mt-3 flex gap-2 overflow-x-auto pb-2"
          >
            {cityLinks.map(city => (
              <Link
                key={city.slug}
                href={`/cities/${encodeURIComponent(city.slug)}/barbers`}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-primary-100 bg-white px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:border-primary hover:text-primary"
              >
                <span>{city.name}</span>
                <span className="text-muted-foreground">
                  ({city.activeBarberCount.toLocaleString('fa-IR')})
                </span>
              </Link>
            ))}
          </nav>
        </section>
      )}

      <ExploreClient initialResults={initialResults} />
    </main>
  );
}
