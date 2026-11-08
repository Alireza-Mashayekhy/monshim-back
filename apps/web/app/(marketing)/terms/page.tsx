import { ScrollText } from 'lucide-react';
import type { Metadata } from 'next';

import JsonLd from '@/components/marketing/json-ld';
import Breadcrumbs from '@/components/marketing/shared/breadcrumbs';
import { buildPageMetadata } from '@/lib/seo';
import { siteConfig } from '@/lib/site-config';

export const metadata: Metadata = buildPageMetadata({
  title: 'قوانین و شرایط استفاده',
  description:
    'قوانین و شرایط استفاده از سامانه رزرو آنلاین آرایشگاه و نرم‌افزار مدیریت آرایشگاه منشیم؛ ثبت‌نام و صحت اطلاعات، رزرو و پرداخت، رفتار و اخلاق، مالکیت و مسئولیت و تغییر شرایط.',
  path: siteConfig.routes.terms,
});

/** داده ساخت‌یافته صفحهٔ قوانین و شرایط */
const termsJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  '@id': `${siteConfig.url}${siteConfig.routes.terms}#webpage`,
  url: `${siteConfig.url}${siteConfig.routes.terms}`,
  name: 'قوانین و شرایط استفاده | منشیم',
  description:
    'قوانین و شرایط استفاده از سامانه رزرو آنلاین آرایشگاه و نرم‌افزار مدیریت آرایشگاه منشیم.',
  inLanguage: 'fa-IR',
  isPartOf: { '@id': `${siteConfig.url}/#website` },
};

/** بندهای قوانین و شرایط — شماره‌ها به‌صورت عدد فارسی نوشته می‌شوند */
const TERMS_SECTIONS = [
  {
    number: '۱',
    title: 'ثبت‌نام و صحت اطلاعات',
    content:
      'شما متعهد می‌شوید اطلاعات درستی در زمان ثبت‌نام وارد کنید و از حساب خود برای انجام فعالیت‌های غیرمجاز استفاده نکنید.',
  },
  {
    number: '۲',
    title: 'رزرو و پرداخت',
    content:
      'هنگام رزرو، مجموع مبالغ خدمات به‌همراه کمیسیون سایت (۱۰٪ بیشترین مبلغ خدمت) دریافت می‌شود. با رزرو نوبت، شما موظف به حضور در نوبت انتخابی هستید و در صورت لغو نوبت از سوی کاربر، مبلغ پرداخت‌شده بازگردانده نمی‌شود.',
  },
  {
    number: '۳',
    title: 'رفتار و اخلاق',
    content:
      'از هرگونه رفتار توهین‌آمیز، افترا یا مزاحمت برای سالن‌ها، آرایشگران و سایر کاربران خودداری کنید. منشیم حق تعلیق یا حذف حساب‌های خلافی را دارد.',
  },
  {
    number: '۴',
    title: 'مالکیت و مسئولیت',
    content:
      'منشیم یک پلتفرم واسط برای هماهنگی نوبت‌دهی است و کیفیت خدمات نهایی بر عهده سالن یا آرایشگر مربوطه است. در صورت بروز هرگونه اختلاف با ارائه‌دهنده خدمت، می‌توانید از بخش پشتیبانی گزارش دهید.',
  },
  {
    number: '۵',
    title: 'تغییر شرایط',
    content:
      'منشیم ممکن است این قوانین را به‌روزرسانی کند. ادامه استفاده شما از سامانه به معنای پذیرش شرایط به‌روزشده است.',
  },
] as const;

export default function TermsPage() {
  return (
    <>
      <JsonLd data={termsJsonLd} />

      <Breadcrumbs
        items={[
          { href: '/', label: 'منشیم' },
          { href: siteConfig.routes.terms, label: 'قوانین و شرایط' },
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
              <ScrollText className="size-3.5" aria-hidden="true" />
              قوانین و شرایط استفاده
            </p>

            <h1 className="text-2xl font-black leading-[1.7] text-foreground sm:text-3xl lg:text-4xl lg:leading-[1.6]">
              قوانین و شرایط استفاده از{' '}
              <span className="text-primary">سامانه منشیم</span>
            </h1>

            <p className="mt-5 leading-8 text-muted-foreground">
              با استفاده از سامانه رزرو آنلاین آرایشگاه منشیم، شما قوانین و
              شرایط زیر را می‌پذیرید. لطفاً پیش از استفاده، این موارد را با
              دقت مطالعه کنید.
            </p>
          </div>
        </div>
      </section>

      {/* بندهای قوانین و شرایط */}
      <section
        aria-label="بندهای قوانین و شرایط استفاده از منشیم"
        className="custom-container py-8 lg:py-14"
      >
        <div className="mx-auto max-w-3xl space-y-4">
          {TERMS_SECTIONS.map(section => (
            <article
              key={section.number}
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
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
