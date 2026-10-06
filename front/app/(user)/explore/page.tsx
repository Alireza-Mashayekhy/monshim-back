import type { Metadata } from 'next';

import JsonLd from '@/components/marketing/json-ld';
import ExploreClient from '@/components/pages/explore/explore-client';
import { fetchPublicApi } from '@/lib/public-api';
import { buildPageMetadata } from '@/lib/seo';
import { siteConfig } from '@/lib/site-config';
import type { ApiListResponse } from '@/services/api/types';
import type { BarberResponse } from '@/services/features/barber/types';

/**
 * صفحهٔ جست‌وجوی آرایشگاه‌ها.
 *
 * نکته: این صفحه اکنون **خصوصی** است (`isPublicAuthPath` در `lib/auth.ts` آن
 * را شامل نمی‌شود)، یعنی کاربران غیرعضو به صفحهٔ ورود هدایت می‌شوند.
 *
 * قبلاً لینک‌های شهر (`/cities/[slug]/barbers`) در همین صفحه نمایش
 * داده می‌شدند، اما آن صفحه حذف شده است چون خودِ `ExploreClient`
 * فیلتر شهر را دارد.
 */
export const revalidate = 300;

const PAGE_SIZE = 10;
const pageDescription =
  'آرایشگاه‌های تأییدشده را جست‌وجو کنید، نام و موقعیت سالن را ببینید و خدمات و قیمت‌های ثبت‌شده را بررسی کنید. برای استفاده وارد حساب کاربری خود شوید.';

async function getInitialResults() {
  return fetchPublicApi<ApiListResponse<BarberResponse>>(
    `/barber?page=1&limit=${PAGE_SIZE}&sort=createdAt%3Adesc`,
  );
}

export async function generateMetadata(): Promise<Metadata> {
  const initialResults = await getInitialResults();
  return buildPageMetadata({
    title: 'جست‌وجوی آرایشگاه‌ها و سالن‌های زیبایی',
    description: pageDescription,
    path: siteConfig.routes.explore,
    noIndex: !initialResults?.data.length,
  });
}

export default async function ExplorePage() {
  const initialResults = await getInitialResults();
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

      <ExploreClient initialResults={initialResults} />
    </main>
  );
}
