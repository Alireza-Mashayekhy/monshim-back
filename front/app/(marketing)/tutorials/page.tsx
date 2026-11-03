import { ExternalLink } from 'lucide-react';
import type { Metadata } from 'next';

import CtaSection from '@/components/marketing/cta-section';
import JsonLd from '@/components/marketing/json-ld';
import SectionHeading from '@/components/marketing/section-heading';
import Breadcrumbs from '@/components/marketing/shared/breadcrumbs';
import PageHero from '@/components/marketing/shared/page-hero';
import AparatVideo from '@/components/marketing/tutorials/aparat-video';
import {
  LEARN_STEPS,
  MAIN_TUTORIAL,
  MORE_TUTORIALS,
  type TutorialVideo,
} from '@/components/marketing/tutorials/tutorials-data';
import {
  aparatEmbedUrl,
  aparatWatchUrl,
  extractAparatHash,
  fetchAparatPoster,
} from '@/lib/aparat';
import { buildPageMetadata, JSONLD_URLS } from '@/lib/seo';
import { siteConfig } from '@/lib/site-config';

export const metadata: Metadata = buildPageMetadata({
  title: 'آموزش سایت منشیم | آموزش گام‌به‌گام نرم افزار مدیریت آرایشگاه',
  description:
    'آموزش سایت منشیم با ویدیو؛ از ثبت‌نام و ساخت پروفایل سالن تا تعریف خدمات، مدیریت نوبت‌ها در تقویم و مشاهدهٔ گزارش درآمد. آموزش گام‌به‌گام نوبت دهی آنلاین آرایشگاه.',
  path: siteConfig.routes.tutorials,
});

/**
 * صفحهٔ آموزش استاتیک با ISR روزانه است. تنها دادهٔ خارجی آن پوستر
 * ویدیوها از API آپارات است که خودش با کش یک‌هفته‌ای fetch می‌شود؛ در
 * نبودِ پاسخ، کامپوننت پخش‌کننده پوستر جایگزین نشان می‌دهد.
 */
export const revalidate = 86400;

interface TutorialWithPoster extends TutorialVideo {
  poster: string | null;
}

async function withPoster(
  tutorial: TutorialVideo,
): Promise<TutorialWithPoster> {
  const poster = await fetchAparatPoster(extractAparatHash(tutorial.aparatUrl));
  return { ...tutorial, poster };
}

export default async function TutorialsPage() {
  const [mainTutorial, moreTutorials] = await Promise.all([
    withPoster(MAIN_TUTORIAL),
    Promise.all(MORE_TUTORIALS.map(withPoster)),
  ]);

  const tutorialsJsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      '@id': `${JSONLD_URLS.tutorials}#webpage`,
      url: JSONLD_URLS.tutorials,
      name: 'آموزش سایت منشیم | آموزش گام‌به‌گام نرم افزار مدیریت آرایشگاه',
      description:
        'ویدیوهای آموزش کار با سامانهٔ نوبت‌دهی و مدیریت آرایشگاه منشیم.',
      inLanguage: 'fa-IR',
      isPartOf: { '@id': `${siteConfig.url}/#website` },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'منشیم',
          item: JSONLD_URLS.home,
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'آموزش سایت منشیم',
          item: JSONLD_URLS.tutorials,
        },
      ],
    },
    // برای هر ویدیو یک VideoObject — embedUrl به آپارات اشاره می‌کند و
    // تماشای ویدیو روی صفحهٔ خود منشیم انجام می‌شود.
    ...[mainTutorial, ...moreTutorials].map((tutorial, index) => ({
      '@context': 'https://schema.org',
      '@type': 'VideoObject',
      '@id': `${JSONLD_URLS.tutorials}#video-${index + 1}`,
      url: `${JSONLD_URLS.tutorials}#video-${index + 1}`,
      name: tutorial.title,
      description: tutorial.description,
      thumbnailUrl: tutorial.poster ?? `${siteConfig.url}/landing/og-home.png`,
      uploadDate: tutorial.uploadDate,
      embedUrl: aparatEmbedUrl(extractAparatHash(tutorial.aparatUrl)),
      inLanguage: 'fa-IR',
      isFamilyFriendly: true,
      publisher: { '@id': `${siteConfig.url}/#organization` },
    })),
  ];

  return (
    <>
      <JsonLd data={tutorialsJsonLd} />

      <Breadcrumbs
        items={[
          { href: siteConfig.routes.home, label: 'منشیم' },
          { href: siteConfig.routes.tutorials, label: 'آموزش سایت منشیم' },
        ]}
      />

      <PageHero
        eyebrow="آموزش منشیم"
        heading={
          <>
            آموزش <span className="text-primary">سایت منشیم</span>، قدم‌به‌قدم
            با ویدیو
          </>
        }
        description="ویدیوهای کوتاه و کاربردی؛ از ثبت‌نام و راه‌اندازی سالن تا مدیریت نوبت‌ها، مشتریان و درآمد. هر بخش را ببینید و همان لحظه در پنل خودتان تمرین کنید."
        visual={
          <AparatVideo
            videoHash={extractAparatHash(mainTutorial.aparatUrl)}
            title={mainTutorial.title}
            posterUrl={mainTutorial.poster}
            priority
          />
        }
        primaryCta={{
          href: siteConfig.routes.providerSignup,
          label: 'رایگان شروع کنید',
          title: 'ثبت‌نام رایگان نوبت دهی آنلاین آرایشگاه در منشیم',
        }}
        secondaryCta={{
          href: siteConfig.routes.pricing,
          label: 'مشاهده تعرفه‌ها',
          title: 'تعرفه و قیمت سامانه مدیریت آرایشگاه منشیم',
        }}
        highlights={[
          'بدون نیاز به نصب',
          'ویدیوهای کوتاه و هدفمند',
          'مناسب شروع سریع',
        ]}
      />

      <section
        aria-labelledby="learn-steps-heading"
        className="custom-container py-8 lg:py-14"
      >
        <SectionHeading
          id="learn-steps-heading"
          eyebrow="مسیر یادگیری"
          title="در آموزش‌ها چه می‌آموزید؟"
          description="چهار قدم اصلی راه‌اندازی و مدیریت سالن با منشیم؛ هر قدم ویدیوی آموزشی مخصوص خودش را دارد."
        />
        <ol className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {LEARN_STEPS.map((step, index) => (
            <li
              key={step.title}
              className="relative rounded-3xl border border-primary-2 bg-white p-6 shadow-sm"
            >
              <span
                aria-hidden="true"
                className="mb-4 inline-flex size-9 items-center justify-center rounded-full bg-primary-2 text-sm font-black text-primary"
              >
                {(index + 1).toLocaleString('fa-IR')}
              </span>
              <h3 className="text-base font-extrabold text-foreground">
                {step.title}
              </h3>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">
                {step.description}
              </p>
            </li>
          ))}
        </ol>
      </section>

      <section
        aria-labelledby="more-tutorials-heading"
        className="custom-container py-8 lg:py-14"
      >
        <SectionHeading
          id="more-tutorials-heading"
          eyebrow="ویدیوهای آموزشی"
          title="آموزش گام‌به‌گام بخش‌های مختلف منشیم"
          description="هر ویدیو یک بخش از پنل را پوشش می‌دهد؛ روی هر کدام کلیک کنید تا پخش شود."
        />
        <div className="mt-10 grid gap-8 md:grid-cols-2">
          {moreTutorials.map(tutorial => {
            const hash = extractAparatHash(tutorial.aparatUrl);

            return (
              <article
                key={tutorial.title}
                className="flex flex-col overflow-hidden rounded-4xl border border-primary-2 bg-white shadow-sm"
              >
                <AparatVideo
                  videoHash={hash}
                  title={tutorial.title}
                  posterUrl={tutorial.poster}
                  className="rounded-none"
                />
                <div className="flex flex-1 flex-col p-6">
                  <h3 className="text-lg font-extrabold text-foreground">
                    {tutorial.title}
                  </h3>
                  <p className="mt-2 flex-1 text-sm leading-7 text-muted-foreground">
                    {tutorial.description}
                  </p>
                  <a
                    href={aparatWatchUrl(hash)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline"
                  >
                    تماشا در آپارات
                    <ExternalLink className="size-3.5" aria-hidden="true" />
                  </a>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <CtaSection
        title="همین حالا سالن خود را آنلاین کنید"
        description="منشیم را رایگان راه بیندازید؛ آموزش‌ها همین‌جا کنار شما هستند."
      />
    </>
  );
}
