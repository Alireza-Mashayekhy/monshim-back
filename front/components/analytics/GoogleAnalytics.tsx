'use client';

import Script from 'next/script';

const GA_ID = 'G-KXZ735QXG9';

/**
 * آنالیتیکس نباید با منابع critical رقابت کند.
 *
 * با `strategy="afterInteractive"` مرورگر اسکریپت gtag را در `<head>` پیش‌بارگذاری
 * (`<link rel="preload" as="script">`) می‌کرد و آن را دقیقاً بعد از hydration اجرا
 * می‌کرد؛ یعنی روی همان فریم‌هایی که محتوای اصلی صفحه دارد رندر و hydrate می‌شود.
 * با `lazyOnload` این اسکریپت در زمان idle بارگذاری می‌شود و هم از مسیر critical
 * خارج می‌شود و هم تعداد requestهای اولیه کم می‌شود. عملکرد آن تغییری نمی‌کند.
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
