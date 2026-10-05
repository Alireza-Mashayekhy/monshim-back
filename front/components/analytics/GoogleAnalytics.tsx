'use client';

import Script from 'next/script';

const GA_ID = 'G-KXZ735QXG9';

/**
 * استراتژی `lazyOnload` عمدی است: gtag.js حدود ۱۵۰ کیلوبایت است و اگر
 * در پنجره‌ی رندر اولیه (بعد از hydration) دانلود و اجرا شود، پهنای باند و
 * main-thread را از LCP می‌گیرد (PageSpeed: «Reduce the impact of third-party
 * code» / «Element render delay»). با lazyOnload اسکریپت در زمان idle مرورگر
 * بارگذاری می‌شود، بنابراین همه‌ی رویدادها ثبت می‌شوند و فقط چند صد
 * میلی‌ثانیه دیرتر.
 */
export default function GoogleAnalytics() {
  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="lazyOnload"
      />

      <Script id="google-analytics" strategy="lazyOnload">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){window.dataLayer.push(arguments);}
          window.gtag = gtag;

          gtag('js', new Date());
          gtag('config', '${GA_ID}');
        `}
      </Script>
    </>
  );
}
