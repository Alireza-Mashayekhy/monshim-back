import { ShieldCheck } from 'lucide-react';
import type { Metadata } from 'next';

import JsonLd from '@/components/marketing/json-ld';
import Breadcrumbs from '@/components/marketing/shared/breadcrumbs';
import { buildPageMetadata } from '@/lib/seo';
import { siteConfig } from '@/lib/site-config';

export const metadata: Metadata = buildPageMetadata({
  title: 'سیاست حریم خصوصی',
  description:
    'سیاست حریم خصوصی منشیم؛ چه اطلاعاتی جمع‌آوری می‌شود، چگونه استفاده می‌شود، امنیت داده‌ها و مدیریت اطلاعات حساب کاربری شما.',
  path: siteConfig.routes.privacy,
});

/** داده ساخت‌یافته صفحهٔ سیاست حریم خصوصی */
const privacyJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  '@id': `${siteConfig.url}${siteConfig.routes.privacy}#webpage`,
  url: `${siteConfig.url}${siteConfig.routes.privacy}`,
  name: 'سیاست حریم خصوصی | منشیم',
  description:
    'سیاست حریم خصوصی و نحوهٔ پردازش اطلاعات در سامانه رزرو آنلاین آرایشگاه منشیم.',
  inLanguage: 'fa-IR',
  isPartOf: { '@id': `${siteConfig.url}/#website` },
};

interface PrivacySection {
  /** شمارهٔ بند به‌صورت عدد فارسی */
  number: string;
  title: string;
  content: string;
  /** فهرست موارد — فقط بندهایی که نقطه‌ای دارند */
  items?: readonly string[];
}

const PRIVACY_SECTIONS: PrivacySection[] = [
  {
    number: '۱',
    title: 'اطلاعاتی که جمع‌آوری می‌کنیم',
    content:
      'برای ارائهٔ خدمات رزرو آنلاین و مدیریت سالن، این اطلاعات را دریافت و نگهداری می‌کنیم:',
    items: [
      'نام و نام خانوادگی و شماره موبایل (در زمان ثبت‌نام)',
      'تاریخ تولد و شهر محل سکونت (اختیاری)',
      'سوابق رزروهای شما در منشیم',
    ],
  },
  {
    number: '۲',
    title: 'استفاده از اطلاعات',
    content:
      'اطلاعات شما فقط برای ارائهٔ بهتر خدمات، هماهنگی نوبت‌ها، اطلاع‌رسانی و بهبود تجربه کاربری به کار می‌رود. اطلاعات شخصی شما با شخص ثالث به اشتراک گذاشته نمی‌شود.',
  },
  {
    number: '۳',
    title: 'امنیت داده‌ها',
    content:
      'ارتباطات شما با رمزنگاری محافظت می‌شود و رمز عبور شما به‌صورت هش‌شده و امن در سیستم‌های ما نگهداری می‌شود.',
  },
  {
    number: '۴',
    title: 'مدیریت اطلاعات',
    content:
      'شما همواره می‌توانید از بخش پروفایل، اطلاعات خود را ویرایش کنید و در صورت نیاز، برای حذف یا اصلاح اطلاعات با پشتیبانی منشیم در ارتباط باشید.',
  },
];

export default function PrivacyPage() {
  return (
    <>
      <JsonLd data={privacyJsonLd} />

      <Breadcrumbs
        items={[
          { href: '/', label: 'منشیم' },
          { href: siteConfig.routes.privacy, label: 'سیاست حریم خصوصی' },
        ]}
      />

      {/* سرصفحه — همان زبان بصری صفحات عمومی منشیم */}
      <section className="relative overflow-hidden bg-gradient-to-b from-primary-2/70 to-background">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-32 -top-32 size-96 rounded-full bg-primary-2 blur-3xl"
        />
        <div className="custom-container relative py-8 lg:py-12">
          <div className="mx-auto max-w-3xl text-center">
            <p className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-primary-200/60 bg-white px-4 py-1.5 text-xs font-bold text-primary shadow-sm">
              <ShieldCheck className="size-3.5" aria-hidden="true" />
              سیاست حریم خصوصی
            </p>

            <h1 className="text-2xl font-black leading-[1.7] text-foreground sm:text-3xl lg:text-4xl lg:leading-[1.6]">
              سیاست <span className="text-primary">حریم خصوصی</span> منشیم
            </h1>

            <p className="mt-5 leading-8 text-muted-foreground">
              در منشیم، حفاظت از اطلاعات شخصی شما اولویت اصلی ماست. این
              سیاست توضیح می‌دهد که چه اطلاعاتی جمع‌آوری می‌شود و چگونه
              از آن‌ها استفاده می‌شود.
            </p>
          </div>
        </div>
      </section>

      {/* بخش‌های سیاست */}
      <section
        aria-label="بخش‌های سیاست حریم خصوصی منشیم"
        className="custom-container py-8 lg:py-14"
      >
        <div className="mx-auto max-w-3xl space-y-4">
          {PRIVACY_SECTIONS.map(section => (
            <article
              key={section.title}
              className="rounded-3xl border border-primary-100/60 bg-white p-6 shadow-sm lg:p-7"
            >
              <div className="flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary-2/70 text-sm font-black text-primary"
                >
                  {section.number}
                </span>
                <h2 className="text-sm font-extrabold text-foreground sm:text-base">
                  {section.title}
                </h2>
              </div>
              <p className="mt-3 text-sm leading-8 text-muted-foreground">
                {section.content}
              </p>
              {section.items ? (
                <ul className="mt-3 space-y-1.5 text-sm leading-8 text-muted-foreground">
                  {section.items.map(item => (
                    <li key={item} className="flex items-start gap-2.5">
                      <span
                        aria-hidden="true"
                        className="mt-2.5 size-1.5 shrink-0 rounded-full bg-primary"
                      />
                      {item}
                    </li>
                  ))}
                </ul>
              ) : null}
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
