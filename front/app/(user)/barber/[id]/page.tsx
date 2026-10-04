import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import JsonLd from '@/components/marketing/json-ld';
import Breadcrumbs from '@/components/marketing/shared/breadcrumbs';
import BookingWizard from '@/components/pages/barber/booking-wizard';
import { absolutePublicImageUrl, fetchPublicApi } from '@/lib/public-api';
import { buildPageMetadata } from '@/lib/seo';
import { siteConfig } from '@/lib/site-config';
import type { ApiListResponse } from '@/services/api/types';
import type { Barber, BarberReview } from '@/services/features/barber/types';

type BarberPageProps = {
  params: Promise<{ id: string }>;
};

function barberPath(id: number) {
  return `/barber/${id}`;
}

async function getPublicBarber(id: string) {
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId < 1) return null;
  return fetchPublicApi<Barber>(`/barber/${numericId}`);
}

async function getPublicReviews(id: number) {
  return fetchPublicApi<ApiListResponse<BarberReview>>(
    `/barber/${id}/reviews?page=1&limit=10`,
  );
}

function profileDescription(barber: Barber) {
  const location = [barber.city?.name, barber.province?.name]
    .filter(Boolean)
    .join('، ');
  const services = barber.services
    .slice(0, 3)
    .map(service => service.name)
    .join('، ');
  const parts = [
    barber.bio?.trim(),
    location ? `نشانی: ${barber.address}، ${location}` : barber.address,
    services ? `خدمات: ${services}` : undefined,
  ].filter(Boolean);
  return (
    parts.join(' ') || `مشاهده خدمات و اطلاعات ${barber.salonName} در منشیم.`
  )
    .replace(/\s+/g, ' ')
    .slice(0, 300);
}

function canIndexBarber(barber: Barber) {
  return Boolean(
    barber.salonName?.trim() &&
    barber.services?.length > 0 &&
    (barber.address?.trim() || barber.city?.name),
  );
}

export async function generateMetadata({
  params,
}: BarberPageProps): Promise<Metadata> {
  const { id } = await params;
  const barber = await getPublicBarber(id);
  const numericId = Number(id);
  const canonicalPath =
    Number.isInteger(numericId) && numericId > 0
      ? barberPath(numericId)
      : `/barber/${encodeURIComponent(id)}`;

  if (!barber || !Number.isInteger(numericId) || numericId < 1) {
    return buildPageMetadata({
      title: 'پروفایل آرایشگاه',
      description: 'پروفایل عمومی آرایشگاه در منشیم.',
      path: canonicalPath,
      noIndex: true,
    });
  }

  const location = [barber.city?.name, barber.province?.name]
    .filter(Boolean)
    .join('، ');
  return buildPageMetadata({
    title: location ? `${barber.salonName} در ${location}` : barber.salonName,
    description: profileDescription(barber),
    path: barberPath(numericId),
    imageUrl: absolutePublicImageUrl(barber.profileImage),
    noIndex: !canIndexBarber(barber),
  });
}

export default async function BarberProfilePage({ params }: BarberPageProps) {
  const { id } = await params;
  const barber = await getPublicBarber(id);
  if (!barber) notFound();
  const initialReviews = await getPublicReviews(barber.id);

  const profileUrl = `${siteConfig.url}${barberPath(barber.id)}`;
  const image = absolutePublicImageUrl(barber.profileImage);
  const services = barber.services.map(service => ({
    '@type': 'Offer',
    name: service.name,
    price: Number(service.price) * 10,
    priceCurrency: 'IRR',
    itemOffered: {
      '@type': 'Service',
      name: service.name,
      description: `${service.durationMinutes.toLocaleString('fa-IR')} دقیقه`,
    },
  }));
  const barberSchema = {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    '@id': `${profileUrl}#webpage`,
    url: profileUrl,
    name: `${barber.salonName}${barber.city?.name ? ` در ${barber.city.name}` : ''}`,
    description: profileDescription(barber),
    inLanguage: 'fa-IR',
    isPartOf: { '@id': `${siteConfig.url}/#website` },
    mainEntity: {
      '@type': 'HairSalon',
      '@id': `${profileUrl}#salon`,
      name: barber.salonName,
      url: profileUrl,
      ...(image ? { image } : {}),
      ...(barber.address || barber.city || barber.province
        ? {
            address: {
              '@type': 'PostalAddress',
              ...(barber.address ? { streetAddress: barber.address } : {}),
              ...(barber.city?.name
                ? { addressLocality: barber.city.name }
                : {}),
              ...(barber.province?.name
                ? { addressRegion: barber.province.name }
                : {}),
              addressCountry: 'IR',
            },
          }
        : {}),
      ...(barber.reviewCount > 0 && barber.rating > 0
        ? {
            aggregateRating: {
              '@type': 'AggregateRating',
              ratingValue: barber.rating,
              reviewCount: barber.reviewCount,
              bestRating: 5,
              worstRating: 1,
            },
          }
        : {}),
      ...(services.length > 0
        ? {
            hasOfferCatalog: {
              '@type': 'OfferCatalog',
              name: 'خدمات آرایشگاه',
              itemListElement: services,
            },
          }
        : {}),
    },
  };
  const breadcrumbSchema = {
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
        name: barber.salonName,
        item: profileUrl,
      },
    ],
  };

  return (
    <main id="main-content" className="min-h-screen bg-background">
      <JsonLd data={[barberSchema, breadcrumbSchema]} />
      <Breadcrumbs
        items={[
          { href: '/', label: siteConfig.name },
          { href: '/explore', label: 'جست‌وجوی آرایشگاه‌ها' },
          { href: barberPath(barber.id), label: barber.salonName },
        ]}
      />
      <BookingWizard initialBarber={barber} initialReviews={initialReviews} />
    </main>
  );
}
