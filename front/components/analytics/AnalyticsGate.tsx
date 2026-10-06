'use client';

import Script from 'next/script';
import { useEffect, useRef, useState } from 'react';

const GA_ID = 'G-KXZ735QXG9';
const CLARITY_ID = 'ymyycjeoqr';

/**
 * گِیت تعامل برای ابزارهای آنالیتیکس.
 *
 * دلیل: `lazyOnload` اسکریپت‌ها را رویداد `window.load` صدا می‌زند و در آن
 * لحظه DOM اسنپ‌شات گرفته می‌شود. Clarity به‌خصوص، در لحظهٔ لود اولیه
 * forced reflowهای زیادی ایجاد می‌کند که اسنپ‌شات DOM مایکروسافت را
 * شامل می‌شود؛ یعنی یک ابزار شخص ثالث، توصیفی از DOM خصوصی کاربر را
 * به سرور خودش می‌فرستد **پیش از اینکه کاربر حتی یک کلیک کرده باشد**.
 *
 * راه‌حل: اسکریپت‌ها فقط پس از اولین تعامل کاربر (کلیک، اسکرول، تاچ،
 * keypress، pointermove) بارگذاری می‌شوند. اگر کاربر تعامل نکند و صفحه
 * را ترک کند، هیچ داده‌ای ارسال نمی‌شود — که هم از نظر حریم خصوصی
 * بهتر است، هم اسنپ‌شات Clarity خالی از DOM اصلی خواهد بود.
 *
 * فالبک: اگر کاربر ۲۰ ثانیهٔ اول تعامل نکند، اسکریپت‌ها بارگذاری
 * می‌شوند تا بازدیدکنندگان passive (مثلاً خواندن طولانی متن) نیز ثبت
 * شوند؛ این بازه با PageSpeed Insights (که خودش تعامل ندارد) هم
 * سازگار است.
 */
const INTERACTION_EVENTS: Array<keyof DocumentEventMap> = [
  'pointerdown',
  'pointermove',
  'keydown',
  'scroll',
  'touchstart',
];
const FALLBACK_TIMEOUT_MS = 20_000;

export default function AnalyticsGate() {
  const [enabled, setEnabled] = useState(false);
  const firedRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const arm = () => {
      if (firedRef.current) return;
      firedRef.current = true;
      // حذف listenerها پس از اولین تعامل برای کاهش overhead
      INTERACTION_EVENTS.forEach(event =>
        window.removeEventListener(event, arm, { passive: true } as AddEventListenerOptions),
      );
      setEnabled(true);
    };

    INTERACTION_EVENTS.forEach(event =>
      window.addEventListener(event, arm, { passive: true } as AddEventListenerOptions),
    );

    // فالبک: اگر تا ۲۰ ثانیه تعاملی نشد، فعال شو.
    const fallbackTimer = window.setTimeout(arm, FALLBACK_TIMEOUT_MS);

    return () => {
      INTERACTION_EVENTS.forEach(event =>
        window.removeEventListener(event, arm, { passive: true } as AddEventListenerOptions),
      );
      window.clearTimeout(fallbackTimer);
    };
  }, []);

  if (!enabled) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){window.dataLayer.push(arguments);}
          window.gtag = gtag;

          gtag('js', new Date());
          gtag('config', '${GA_ID}');
        `}
      </Script>
      <Script id="microsoft-clarity" strategy="afterInteractive">
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
    </>
  );
}
