import {
  ArrowLeft,
  CalendarCheck,
  Clock,
  Images,
  MapPin,
  MessageSquareHeart,
  Scissors,
  Sparkles,
  Star,
} from 'lucide-react';
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
import { toPersianDigits } from '@/lib/utils';
import type { ApiListResponse } from '@/services/api/types';
import type { BarberReview } from '@/services/features/barber/types';
import type { PublicBarberProfile } from '@/services/features/public-page/types';

/**
 * صفحهٔ عمومی و سئوشدهٔ آرایشگاه (`/barber/[slug]`).
 *
 * این صفحه بدون هدر و فوتر عمومی سایت و با بردکرامب نمایش داده می‌شود:
 * ۱. تصویر مربعی ۱:۱ با نام آرایشگاه روی بخش پایینی عکس (بلور + گرادیانت خوانا)
 * ۲. درباره آرایشگاه و نشانی
 * ۳. اسلایدر ۳تایی خودکار نمونه‌کارها با بزرگ‌نمایی آیتم وسط
 * ۴. نوار تک‌خطی متحرک و آرام نظرات مشتریان
 * ۵. فهرست خدمات و قیمت‌ها + دکمهٔ شناور رزرو آنلاین نوبت
 */
export const revalidate = 300;

type BarberPageProps = {
  params: Promise<{ id: string }>;
};

const REVIEWS_LIMIT = 50;

const HERO_BOTTOM_BLUR_MASK =
  'linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0.95) 50%, rgba(0,0,0,0.38) 78%, rgba(0,0,0,0) 100%)';

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

function resolveActivityText(activityType?: string | null): string | null {
  if (!activityType) return null;
  if (activityType === 'both') return 'ویژه آقایان و بانوان';
  const label = getActivityTypeLabel(activityType);
  return label ? `ویژه ${label}` : activityType;
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
  const activityText = resolveActivityText(barber.activityType);
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

      <div className="mx-auto w-full max-w-2xl px-4 pb-28 pt-2 sm:px-6">
        {/* بردکرامب بالای صفحه (بدون هدر و فوتر عمومی) */}
        <div className="[&>nav]:px-1 [&>nav]:py-4">
          <Breadcrumbs
            items={[
              { href: '/', label: siteConfig.name },
              { href: barberPath(barber.slug), label: barber.salonName },
            ]}
          />
        </div>

        <article className="space-y-5">
          {/* ۱. تصویر مربعی ۱:۱ با نام سالن روی پایین تصویر و افکت بلور و گرادیانت خوانا */}
          <header className="mx-auto w-full max-w-lg">
            <div className="relative aspect-square w-full overflow-hidden rounded-[32px] border border-black/5 bg-slate-900 shadow-[0_18px_44px_-15px_rgba(15,23,42,0.3)]">
              <Image
                src={heroImage ?? '/placeholder.webp'}
                alt={`لوگوی سالن ${barber.salonName}`}
                fill
                priority
                sizes="(max-width: 640px) 100vw, 512px"
                className="object-cover"
              />

              {/* سایه ظریف بالا برای خوانایی بج‌ها روی تصاویر روشن */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/30 to-transparent"
              />

              {/* نوار شناور بالای تصویر: امتیاز / نوع فعالیت + اشتراک‌گذاری */}
              <div className="absolute inset-x-4 top-4 z-20 flex items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <div className="inline-flex items-center gap-1.5 rounded-full border border-white/65 bg-white/88 px-3 py-1.5 text-xs font-bold text-gray-900 shadow-sm backdrop-blur-md">
                    <Star
                      size={14}
                      className="fill-amber-400 text-amber-400"
                    />
                    <span>
                      {reviewCount > 0
                        ? toPersianDigits(rating.toFixed(1))
                        : 'جدید'}
                    </span>
                    {reviewCount > 0 && (
                      <span className="text-[11px] font-medium text-gray-500">
                        ({toPersianDigits(reviewCount)})
                      </span>
                    )}
                  </div>

                  {activityText && (
                    <span className="inline-flex items-center rounded-full border border-white/65 bg-white/88 px-3 py-1.5 text-[11px] font-bold text-primary shadow-sm backdrop-blur-md">
                      {activityText}
                    </span>
                  )}
                </div>

                <ShareButton
                  url={profileUrl}
                  title={barber.salonName}
                  className="rounded-full border-white/65 bg-white/88 px-3.5 text-xs font-bold text-gray-900 shadow-sm backdrop-blur-md hover:bg-white"
                />
              </div>

              {/* افکت بلور تدریجی + گرادیانت تیره برای خوانایی کامل نام آرایشگاه روی هر پس‌زمینه */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 bottom-0 h-[46%] backdrop-blur-xl"
                style={{
                  WebkitMaskImage: HERO_BOTTOM_BLUR_MASK,
                  maskImage: HERO_BOTTOM_BLUR_MASK,
                }}
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 bottom-0 h-[52%] bg-gradient-to-t from-slate-950/92 via-slate-950/65 via-55% to-transparent"
              />

              {/* نام آرایشگاه و شهر روی پایین تصویر */}
              <div className="absolute inset-x-0 bottom-0 z-10 p-5 sm:p-6">
                <h1 className="text-2xl font-black leading-tight text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.45)] sm:text-3xl">
                  {barber.salonName}
                </h1>

                {location && (
                  <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-white/90 sm:text-sm">
                    <MapPin size={15} className="shrink-0 text-teal-300" />
                    <span>{location}</span>
                  </p>
                )}
              </div>
            </div>
          </header>

          {/* ۲. درباره آرایشگاه */}
          <section
            aria-labelledby="about-heading"
            className="rounded-[28px] border border-primary/15 bg-white p-5 shadow-xs sm:p-6"
          >
            <h2
              id="about-heading"
              className="flex items-center gap-2 text-base font-black text-gray-900 sm:text-lg"
            >
              <Sparkles size={18} className="text-primary" />
              درباره آرایشگاه
            </h2>

            {barber.bio ? (
              <p className="mt-3 text-justify text-sm leading-8 text-gray-700 sm:text-[15px]">
                {barber.bio}
              </p>
            ) : (
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                به صفحهٔ اختصاصی {barber.salonName} در منشیم خوش آمدید. برای
                مشاهده خدمات و رزرو آنلاین نوبت از فهرست پایین استفاده کنید.
              </p>
            )}

            {(barber.address || location) && (
              <div className="mt-4 flex items-start gap-2.5 rounded-2xl border border-primary/10 bg-primary-3 px-4 py-3 text-xs leading-6 text-gray-700 sm:text-sm">
                <MapPin size={17} className="mt-1 shrink-0 text-primary" />
                <div>
                  <span className="font-bold text-gray-900">نشانی سالن: </span>
                  <span>
                    {barber.address}
                    {barber.address && location ? ' • ' : ''}
                    {location}
                  </span>
                </div>
              </div>
            )}
          </section>

          {/* ۳. اسلایدر ۳تایی خودکار نمونه‌کارها (آیتم وسط بزرگ‌تر) */}
          {barber.portfolio.length > 0 && (
            <section
              aria-labelledby="portfolio-heading"
              className="rounded-[28px] border border-primary/15 bg-white p-5 shadow-xs sm:p-6"
            >
              <div className="flex items-center justify-between gap-2">
                <h2
                  id="portfolio-heading"
                  className="flex items-center gap-2 text-base font-black text-gray-900 sm:text-lg"
                >
                  <Images size={18} className="text-primary" />
                  نمونه‌کارهای {barber.salonName}
                </h2>
                <span className="rounded-full bg-primary-2 px-2.5 py-1 text-[11px] font-bold text-primary">
                  {toPersianDigits(barber.portfolio.length)} تصویر
                </span>
              </div>

              <PortfolioGallery
                images={barber.portfolio}
                salonName={barber.salonName}
              />
            </section>
          )}

          {/* ۴. نوار تک‌خطی متحرک و آرام نظرات مشتریان */}
          <section
            aria-labelledby="reviews-heading"
            className="overflow-hidden rounded-[28px] border border-primary/15 bg-white p-5 shadow-xs sm:p-6"
          >
            <h2
              id="reviews-heading"
              className="flex items-center gap-2 text-base font-black text-gray-900 sm:text-lg"
            >
              <MessageSquareHeart size={18} className="text-primary" />
              نظرات مشتریان
            </h2>

            <div className="mt-3">
              <PublicReviews
                reviews={reviews}
                rating={rating}
                reviewCount={reviewCount}
                salonName={barber.salonName}
              />
            </div>
          </section>

          {/* ۵. خدمات و تعرفه‌های سالن */}
          {barber.services.length > 0 && (
            <section
              aria-labelledby="services-heading"
              className="rounded-[28px] border border-primary/15 bg-white p-5 shadow-xs sm:p-6"
            >
              <div className="flex items-center justify-between gap-2">
                <h2
                  id="services-heading"
                  className="flex items-center gap-2 text-base font-black text-gray-900 sm:text-lg"
                >
                  <Scissors size={18} className="text-primary" />
                  خدمات و تعرفه‌ها
                </h2>
                <span className="rounded-full bg-primary-2 px-2.5 py-1 text-[11px] font-bold text-primary">
                  {toPersianDigits(barber.services.length)} خدمت فعال
                </span>
              </div>

              <ul className="mt-4 space-y-2.5">
                {barber.services.map(service => {
                  const hasDeposit =
                    service.depositPrice != null &&
                    Number(service.depositPrice) > 0;

                  return (
                    <li key={service.id}>
                      <Link
                        href={bookingUrl}
                        className="group flex items-center justify-between gap-3 rounded-2xl border border-gray-100 bg-gray-50/60 p-4 transition-all hover:border-primary/35 hover:bg-primary-3/70 hover:shadow-xs"
                      >
                        <div className="min-w-0 space-y-1">
                          <p className="truncate text-sm font-black text-gray-900 group-hover:text-primary sm:text-base">
                            {service.name}
                          </p>
                          <div className="flex flex-wrap items-center gap-2.5 text-xs text-gray-500">
                            <span className="inline-flex items-center gap-1">
                              <Clock size={12} className="text-primary/80" />
                              {toPersianDigits(service.durationMinutes)} دقیقه
                            </span>
                            {hasDeposit && (
                              <span className="rounded-md bg-primary-2/80 px-2 py-0.5 text-[11px] font-semibold text-primary">
                                بیعانه:{' '}
                                {Number(service.depositPrice).toLocaleString(
                                  'fa-IR',
                                )}{' '}
                                تومان
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-2.5">
                          <div className="text-left">
                            <span className="text-base font-black text-primary sm:text-lg">
                              {Number(service.price).toLocaleString('fa-IR')}
                            </span>
                            <span className="mr-1 text-[11px] text-gray-500">
                              تومان
                            </span>
                          </div>
                          <span
                            aria-hidden="true"
                            className="flex size-8 items-center justify-center rounded-full bg-white text-gray-400 shadow-2xs transition-all group-hover:-translate-x-0.5 group-hover:bg-primary group-hover:text-white"
                          >
                            <ArrowLeft size={15} />
                          </span>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </article>
      </div>

      {/* نوار شناور پایین صفحه برای رزرو سریع نوبت */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-primary/10 bg-white/85 px-4 py-3 backdrop-blur-md">
        <div className="mx-auto max-w-2xl">
          <Button
            asChild
            size="lg"
            className="h-12 w-full gap-2 rounded-2xl text-sm font-black shadow-lg shadow-primary/20 sm:text-base"
          >
            <Link href={bookingUrl}>
              <CalendarCheck size={19} />
              رزرو نوبت آنلاین در {barber.salonName}
            </Link>
          </Button>
        </div>
      </div>
    </>
  );
}
