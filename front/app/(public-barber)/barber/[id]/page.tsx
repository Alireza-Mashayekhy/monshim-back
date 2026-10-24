import { CalendarCheck, Clock, MapPin, Scissors, Star } from 'lucide-react';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound, permanentRedirect } from 'next/navigation';

import JsonLd from '@/components/marketing/json-ld';
import Breadcrumbs from '@/components/marketing/shared/breadcrumbs';
import PortfolioGallery from '@/components/public-barber/portfolio-gallery';
import PublicReviews from '@/components/public-barber/public-reviews';
import ShareButton from '@/components/public-barber/share-button';
import { Button } from '@/components/ui/button';
import { getActivityTypeLabel } from '@/constants/activity-types';
import { publicImageUrl } from '@/lib/images';
import { absolutePublicImageUrl, fetchPublicApi } from '@/lib/public-api';
import {
  normalizePublicPageSlug,
  validatePublicPageSlug,
} from '@/lib/public-page-slug';
import { buildPageMetadata } from '@/lib/seo';
import { siteConfig } from '@/lib/site-config';
import type { ApiListResponse } from '@/services/api/types';
import type { BarberReview } from '@/services/features/barber/types';
import type { PublicBarberProfile } from '@/services/features/public-page/types';

/**
 * صفحهٔ عمومی و سئوشدهٔ آرایشگاه (`/barber/[slug]`).
 *
 * این صفحه فقط وقتی نمایش داده می‌شود که صفحهٔ اختصاصی آرایشگر فعال شده باشد
 * (خرید پکیج یا ۳۰۰ رزرو موفقِ پرداخت‌شده در درگاه) و آرایشگر اسلاگ یکتای خود
 * را ثبت کرده باشد. اگر کاربر صفحه را با شناسهٔ عددی باز کند، به‌صورت دائمی به
 * آدرس اسلاگ ریدایرکت می‌شود تا هیچ‌گاه آیدی در URL نمایش داده نشود.
 *
 * نسخهٔ داخل پنلِ همین آرایشگاه (رزرو نوبت) مسیر مستقل خودش را دارد:
 * `/panel/barber/[id]`.
 */
export const revalidate = 300;

type BarberPageProps = {
  params: Promise<{ id: string }>;
};

const REVIEWS_LIMIT = 10;

function barberPath(slug: string) {
  return `/barber/${encodeURIComponent(slug)}`;
}

async function getPublicBarber(rawIdentifier: string) {
  const identifier = rawIdentifier.trim();
  if (!identifier || identifier.length > 80) return null;

  if (/^\d+$/.test(identifier)) {
    const numericId = Number(identifier);
    if (!Number.isSafeInteger(numericId) || numericId < 1) return null;
    return fetchPublicApi<PublicBarberProfile>(
      `/public-page/barber/${numericId}`,
    );
  }

  const normalized = normalizePublicPageSlug(identifier);
  const validation = validatePublicPageSlug(normalized);
  if (!validation.valid) return null;

  return fetchPublicApi<PublicBarberProfile>(
    `/public-page/barber/${encodeURIComponent(validation.slug)}`,
  );
}

async function getPublicReviews(id: number) {
  return fetchPublicApi<ApiListResponse<BarberReview>>(
    `/barber/${id}/reviews?page=1&limit=${REVIEWS_LIMIT}`,
  );
}

function locationLabel(barber: PublicBarberProfile) {
  return [barber.city?.name, barber.province?.name].filter(Boolean).join('، ');
}

function profileDescription(barber: PublicBarberProfile) {
  const location = locationLabel(barber);
  const services = barber.services
    .slice(0, 3)
    .map(service => service.name)
    .join('، ');

  const parts = [
    barber.bio?.trim(),
    location ? `نشانی: ${barber.address}، ${location}` : barber.address?.trim(),
    services ? `خدمات: ${services}` : undefined,
  ].filter(Boolean);

  return (
    parts.join(' ') || `مشاهده خدمات و اطلاعات ${barber.salonName} در منشیم.`
  )
    .replace(/\s+/g, ' ')
    .slice(0, 300);
}

export async function generateMetadata({
  params,
}: BarberPageProps): Promise<Metadata> {
  const { id } = await params;
  const barber = await getPublicBarber(id);

  if (!barber || !barber.slug) {
    // صفحه‌ای که فعال نیست یا اسلاگ ندارد نباید ایندکس شود (و ۴۰۴ می‌دهد).
    return buildPageMetadata({
      title: 'پروفایل آرایشگاه',
      description: 'پروفایل عمومی آرایشگاه در منشیم.',
      path: `/barber/${encodeURIComponent(id)}`,
      noIndex: true,
    });
  }

  const location = locationLabel(barber);
  return buildPageMetadata({
    title: location ? `${barber.salonName} در ${location}` : barber.salonName,
    description: profileDescription(barber),
    path: barberPath(barber.slug),
    imageUrl: absolutePublicImageUrl(barber.profileImage),
  });
}

export default async function PublicBarberPage({ params }: BarberPageProps) {
  const { id } = await params;
  const barber = await getPublicBarber(id);
  if (!barber || !barber.slug) notFound();

  // اگر آدرس با آیدی عددی یا حروف بزرگ باز شده باشد، همیشه به اسلاگ ریدایرکت شود
  if (id !== barber.slug) {
    permanentRedirect(barberPath(barber.slug));
  }

  const reviews = await getPublicReviews(barber.id);

  const profileUrl = `${siteConfig.url}${barberPath(barber.slug)}`;
  const bookingUrl = `/panel/barber/${barber.id}`;
  const heroImage = publicImageUrl(barber.profileImage);
  const location = locationLabel(barber);
  const rating = Number(barber.rating ?? 0);
  const reviewCount = Number(barber.reviewCount ?? 0);

  const offers = barber.services.map(service => ({
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

  const salonSchema = {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    '@id': `${profileUrl}#webpage`,
    url: profileUrl,
    name: `${barber.salonName}${location ? ` در ${location}` : ''}`,
    description: profileDescription(barber),
    inLanguage: 'fa-IR',
    isPartOf: { '@id': `${siteConfig.url}/#website` },
    mainEntity: {
      '@type': 'HairSalon',
      '@id': `${profileUrl}#salon`,
      name: barber.salonName,
      url: profileUrl,
      ...(heroImage ? { image: heroImage } : {}),
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
      ...(reviewCount > 0 && rating > 0
        ? {
            aggregateRating: {
              '@type': 'AggregateRating',
              ratingValue: rating,
              reviewCount,
              bestRating: 5,
              worstRating: 1,
            },
          }
        : {}),
      ...(offers.length > 0
        ? {
            hasOfferCatalog: {
              '@type': 'OfferCatalog',
              name: 'خدمات آرایشگاه',
              itemListElement: offers,
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
        name: barber.salonName,
        item: profileUrl,
      },
    ],
  };

  return (
    <>
      <JsonLd data={[salonSchema, breadcrumbSchema]} />

      <div className="custom-container py-6">
        <Breadcrumbs
          items={[
            { href: '/', label: siteConfig.name },
            { href: barberPath(barber.slug), label: barber.salonName },
          ]}
        />

        <article className="overflow-hidden rounded-3xl border border-primary/15 bg-white shadow-sm">
          <header className="p-5 sm:p-7">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
                <div className="relative aspect-square w-full shrink-0 overflow-hidden rounded-[24px] border border-primary/15 bg-primary-2 shadow-xs sm:size-44 md:size-52">
                  <Image
                    src={heroImage ?? '/placeholder.webp'}
                    alt={`لوگوی سالن ${barber.salonName}`}
                    fill
                    priority
                    sizes="(max-width: 640px) 100vw, 208px"
                    className="object-cover"
                  />
                </div>

                <div className="min-w-0 space-y-2.5">
                  <h1 className="text-2xl font-black text-gray-900 sm:text-3xl">
                    {barber.salonName}
                  </h1>
                  {barber.activityType && (
                    <p className="text-xs font-medium text-muted-foreground">
                      {getActivityTypeLabel(barber.activityType) ||
                        barber.activityType}
                    </p>
                  )}
                  {barber.address && (
                    <p className="flex items-start gap-1.5 text-sm text-gray-600">
                      <MapPin
                        size={16}
                        className="mt-0.5 shrink-0 text-primary"
                      />
                      <span>
                        {barber.address}
                        {location ? ` • ${location}` : ''}
                      </span>
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-start">
                <div className="flex items-center gap-1 rounded-xl border border-primary/20 bg-primary-2 px-3 py-2">
                  <Star size={16} className="fill-yellow-400 text-yellow-400" />
                  <span className="text-sm font-bold text-gray-800">
                    {reviewCount > 0 ? rating.toFixed(1) : 'جدید'}
                  </span>
                  {reviewCount > 0 && (
                    <span className="text-[11px] text-muted-foreground">
                      ({reviewCount} نظر)
                    </span>
                  )}
                </div>
                <ShareButton url={profileUrl} title={barber.salonName} />
              </div>
            </div>
          </header>

          <div className="space-y-8 border-t border-gray-100 p-5 sm:p-7">
            {barber.services.length > 0 && (
              <section aria-labelledby="services-heading">
                <h2
                  id="services-heading"
                  className="flex items-center gap-2 text-lg font-black text-gray-900"
                >
                  <Scissors size={18} className="text-primary" />
                  خدمات و قیمت‌ها
                </h2>

                <ul className="mt-4 divide-y divide-gray-100 overflow-hidden rounded-2xl border border-gray-100">
                  {barber.services.map(service => (
                    <li
                      key={service.id}
                      className="flex items-center justify-between gap-3 bg-white p-4"
                    >
                      <div>
                        <p className="font-bold text-gray-900">
                          {service.name}
                        </p>
                        <p className="mt-1 flex items-center gap-1 text-xs text-gray-400">
                          <Clock size={12} />
                          {service.durationMinutes} دقیقه
                        </p>
                      </div>
                      <p className="text-left">
                        <span className="text-lg font-black text-primary">
                          {Number(service.price).toLocaleString('fa-IR')}
                        </span>
                        <span className="mr-1 text-xs text-gray-400">
                          تومان
                        </span>
                      </p>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section aria-labelledby="about-heading">
              <h2
                id="about-heading"
                className="text-lg font-black text-gray-900"
              >
                دربارهٔ {barber.salonName}
              </h2>
              {barber.bio ? (
                <p className="mt-3 leading-8 text-gray-700">{barber.bio}</p>
              ) : (
                <p className="mt-3 text-sm leading-7 text-muted-foreground">
                  توضیحاتی برای این سالن ثبت نشده است.
                </p>
              )}

              {barber.portfolio.length > 0 && (
                <div className="mt-5">
                  <h3 className="mb-1 text-sm font-bold text-gray-800">
                    نمونه‌کارهای {barber.salonName}
                  </h3>
                  <PortfolioGallery
                    images={barber.portfolio}
                    salonName={barber.salonName}
                  />
                </div>
              )}
            </section>

            <section aria-labelledby="reviews-heading">
              <h2
                id="reviews-heading"
                className="text-lg font-black text-gray-900"
              >
                نظرات مشتریان
              </h2>
              <div className="mt-4">
                <PublicReviews
                  reviews={reviews}
                  rating={rating}
                  reviewCount={reviewCount}
                  salonName={barber.salonName}
                />
              </div>
            </section>
          </div>
        </article>

        <div className="sticky bottom-4 z-40 mt-6">
          <Button asChild size="lg" className="w-full gap-2 shadow-lg">
            <Link href={bookingUrl}>
              <CalendarCheck size={18} />
              رزرو نوبت در {barber.salonName}
            </Link>
          </Button>
        </div>
      </div>
    </>
  );
}
