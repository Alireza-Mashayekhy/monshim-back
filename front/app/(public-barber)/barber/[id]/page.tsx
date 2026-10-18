import { CalendarCheck, Clock, MapPin, Scissors, Star } from 'lucide-react';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import JsonLd from '@/components/marketing/json-ld';
import Breadcrumbs from '@/components/marketing/shared/breadcrumbs';
import PortfolioGallery from '@/components/public-barber/portfolio-gallery';
import PublicReviews from '@/components/public-barber/public-reviews';
import ShareButton from '@/components/public-barber/share-button';
import { Button } from '@/components/ui/button';
import { publicImageUrl } from '@/lib/images';
import { absolutePublicImageUrl, fetchPublicApi } from '@/lib/public-api';
import { buildPageMetadata } from '@/lib/seo';
import { siteConfig } from '@/lib/site-config';
import type { ApiListResponse } from '@/services/api/types';
import type { BarberReview } from '@/services/features/barber/types';
import type { PublicBarberProfile } from '@/services/features/public-page/types';

/**
 * صفحهٔ عمومی و سئوشدهٔ آرایشگاه (`/barber/[id]`).
 *
 * این صفحه فقط وقتی نمایش داده می‌شود که آرایشگر یکی از این دو شرط را داشته
 * باشد: پکیج صفحهٔ عمومی را خریده باشد، یا ۳۰۰ نوبتِ پرداخت‌شده (بیعانه یا
 * پرداخت کامل آنلاین) داشته باشد. در غیر این صورت بک‌اند ۴۰۴ می‌دهد و اینجا
 * `notFound()` اجرا می‌شود؛ یعنی نه با URL دستی باز می‌شود و نه در sitemap
 * می‌آید.
 *
 * نسخهٔ داخل پنلِ همین آرایشگاه (رزرو نوبت) مسیر مستقل خودش را دارد:
 * `/panel/barber/[id]`.
 */
/**
 * کشِ این مسیر عمداً کوتاه است: اگر صفحه‌ای در زمان غیرفعال‌بودن بازدید و ۴۰۴
 * کش شود، نباید ساعت‌ها بعد از فعال‌سازی هم ۴۰۴ بماند (sitemap بلافاصله آن را
 * منتشر می‌کند). علاوه بر این، بعد از خرید موفق پکیج، کشِ مسیر از طریق
 * `revalidateMyPublicBarberPage` همان لحظه پاک می‌شود.
 */
export const revalidate = 300;

type BarberPageProps = {
  params: Promise<{ id: string }>;
};

const REVIEWS_LIMIT = 10;

function barberPath(id: number) {
  return `/barber/${id}`;
}

async function getPublicBarber(id: string) {
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId < 1) return null;
  return fetchPublicApi<PublicBarberProfile>(
    `/public-page/barber/${numericId}`,
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
  const numericId = Number(id);
  const canonicalPath =
    Number.isInteger(numericId) && numericId > 0
      ? barberPath(numericId)
      : `/barber/${encodeURIComponent(id)}`;

  if (!barber) {
    // صفحه‌ای که فعال نیست نباید ایندکس شود (و اصلاً ۴۰۴ می‌دهد).
    return buildPageMetadata({
      title: 'پروفایل آرایشگاه',
      description: 'پروفایل عمومی آرایشگاه در منشیم.',
      path: canonicalPath,
      noIndex: true,
    });
  }

  const location = locationLabel(barber);
  return buildPageMetadata({
    title: location ? `${barber.salonName} در ${location}` : barber.salonName,
    description: profileDescription(barber),
    path: barberPath(barber.id),
    imageUrl: absolutePublicImageUrl(barber.profileImage),
  });
}

export default async function PublicBarberPage({ params }: BarberPageProps) {
  const { id } = await params;
  const barber = await getPublicBarber(id);
  if (!barber) notFound();

  const reviews = await getPublicReviews(barber.id);

  const profileUrl = `${siteConfig.url}${barberPath(barber.id)}`;
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
            { href: barberPath(barber.id), label: barber.salonName },
          ]}
        />

        <article className="overflow-hidden rounded-3xl border border-primary/15 bg-white shadow-sm">
          <div className="relative h-56 w-full bg-primary-2 sm:h-72">
            <Image
              src={heroImage ?? '/placeholder.webp'}
              alt={`تصویر سالن ${barber.salonName}`}
              fill
              priority
              sizes="100vw"
              className="object-cover"
            />
          </div>

          <header className="space-y-3 p-5 sm:p-7">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-2">
                <h1 className="text-2xl font-black text-gray-900 sm:text-3xl">
                  {barber.salonName}
                </h1>
                {barber.activityType && (
                  <p className="text-xs text-muted-foreground">
                    {barber.activityType}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2">
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

            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-gray-600">
              {barber.address && (
                <span className="flex items-center gap-1.5">
                  <MapPin size={16} className="text-primary" />
                  {barber.address}
                  {location ? ` • ${location}` : ''}
                </span>
              )}
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
