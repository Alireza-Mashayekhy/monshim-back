import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import JsonLd from '@/components/marketing/json-ld';
import Breadcrumbs from '@/components/marketing/shared/breadcrumbs';
import BarberCard from '@/components/shared/barber-card';
import { fetchPublicApi } from '@/lib/public-api';
import { buildPageMetadata } from '@/lib/seo';
import { siteConfig } from '@/lib/site-config';
import type { PublicCityResponse } from '@/services/features/barber/types';

export const dynamic = 'force-dynamic';

type CityPageProps = {
  params: Promise<{ slug: string }>;
};

function cityPath(slug: string) {
  return `/cities/${encodeURIComponent(slug)}/barbers`;
}

async function getCityDirectory(slug: string) {
  return fetchPublicApi<PublicCityResponse>(
    `/barber/public/cities/${encodeURIComponent(slug)}`,
  );
}

export async function generateMetadata({
  params,
}: CityPageProps): Promise<Metadata> {
  const { slug } = await params;
  const directory = await getCityDirectory(slug);
  const path = cityPath(slug);

  if (!directory) {
    return buildPageMetadata({
      title: 'آرایشگاه‌های شهر',
      description: 'فهرست آرایشگاه‌های دارای خدمات فعال در منشیم.',
      path,
      noIndex: true,
    });
  }

  const { city, pagination } = directory;
  return buildPageMetadata({
    title: `آرایشگاه‌های ${city.name}`,
    description: `پروفایل ${pagination.total.toLocaleString('fa-IR')} آرایشگاه تأییدشده در ${city.name}${city.provinceName ? `، ${city.provinceName}` : ''} را ببینید و خدمات و قیمت‌های ثبت‌شده را بررسی کنید.`,
    path,
    noIndex: pagination.total < 3,
  });
}

export default async function CityBarbersPage({ params }: CityPageProps) {
  const { slug } = await params;
  const directory = await getCityDirectory(slug);
  if (!directory) notFound();

  const { city, barbers, pagination } = directory;
  const canonicalUrl = `${siteConfig.url}${cityPath(city.slug)}`;
  const cityName = `${city.name}${city.provinceName ? `، ${city.provinceName}` : ''}`;
  const structuredData = [
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      '@id': `${canonicalUrl}#webpage`,
      url: canonicalUrl,
      name: `آرایشگاه‌های ${city.name}`,
      description: `فهرست پروفایل‌های تأییدشده با خدمات فعال در ${cityName}.`,
      inLanguage: 'fa-IR',
      isPartOf: { '@id': `${siteConfig.url}/#website` },
      about: { '@type': 'City', name: city.name },
      mainEntity: {
        '@type': 'ItemList',
        numberOfItems: barbers.length,
        itemListElement: barbers.map((barber, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          item: {
            '@type': 'HairSalon',
            name: barber.salonName,
            url: `${siteConfig.url}/barber/${barber.id}`,
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
          item: `${siteConfig.url}/explore`,
        },
        {
          '@type': 'ListItem',
          position: 3,
          name: `آرایشگاه‌های ${city.name}`,
          item: canonicalUrl,
        },
      ],
    },
  ];

  return (
    <main id="main-content" className="min-h-screen bg-background px-4 pb-28">
      <JsonLd data={structuredData} />
      <div className="mx-auto max-w-5xl">
        <Breadcrumbs
          items={[
            { href: '/', label: siteConfig.name },
            { href: '/explore', label: 'جست‌وجوی آرایشگاه‌ها' },
            { href: cityPath(city.slug), label: `آرایشگاه‌های ${city.name}` },
          ]}
        />

        <header className="pb-6">
          <h1 className="text-2xl font-black leading-relaxed text-foreground sm:text-3xl">
            آرایشگاه‌های {city.name}
            {city.provinceName ? `، ${city.provinceName}` : ''}
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-muted-foreground">
            فهرست زیر از پروفایل‌های تأییدشدهٔ سالن‌هایی تشکیل شده که خدمات فعال
            دارند. اطلاعات خدمات و قیمت‌ها در صفحهٔ هر آرایشگاه نمایش داده
            می‌شود.
          </p>
        </header>

        <section aria-labelledby="city-barbers-heading">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
            <h2
              id="city-barbers-heading"
              className="text-lg font-extrabold text-foreground"
            >
              سالن‌های دارای خدمات فعال
            </h2>
            <p className="text-xs text-muted-foreground">
              {pagination.total.toLocaleString('fa-IR')} آرایشگاه
            </p>
          </div>

          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {barbers.map(barber => (
              <li key={barber.id}>
                <BarberCard barber={barber} variant="vertical" />
              </li>
            ))}
          </ul>

          {pagination.total > barbers.length && (
            <p className="mt-5 text-sm leading-7 text-muted-foreground">
              {barbers.length.toLocaleString('fa-IR')} مورد نخست از{' '}
              {pagination.total.toLocaleString('fa-IR')} مورد نمایش داده شده
              است. برای دیدن فهرست و فیلترهای کامل به{' '}
              <Link
                className="font-bold text-primary underline"
                href="/explore"
              >
                جست‌وجوی آرایشگاه‌ها
              </Link>{' '}
              بروید.
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
