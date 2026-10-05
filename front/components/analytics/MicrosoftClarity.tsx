'use client';

import Script from 'next/script';

const CLARITY_ID = 'ymyycjeoqr';

/**
 * Clarity سنگین‌ترین اسکریپت third-party صفحه است و در حین ثبت رفتار کاربر
 * مرتب layout را می‌خواند (منبع بخش بزرگی از Forced Reflowهای گزارش
 * PageSpeed). با `lazyOnload` از پنجره‌ی LCP خارج می‌شود و بعد از idle
 * مرورگر همان‌طور کامل کار می‌کند.
 */
export default function MicrosoftClarity() {
  return (
    <Script id="microsoft-clarity" strategy="lazyOnload">
      {`
        (function(c,l,a,r,i,t,y){
          c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
          t=l.createElement(r);
          t.async=1;
          t.src="https://www.clarity.ms/tag/"+i;
          y=l.getElementsByTagName(r)[0];
          y.parentNode.insertBefore(t,y);
        })(window, document, "clarity", "script", "${CLARITY_ID}");
      `}
    </Script>
  );
}
