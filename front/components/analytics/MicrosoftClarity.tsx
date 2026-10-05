'use client';

import Script from 'next/script';

const CLARITY_ID = 'ymyycjeoqr';

/**
 * Microsoft Clarity یک ابزار ثالث سنگین است که هنگام اجرا روی DOM اندازه‌گیری
 * انجام می‌دهد (forced reflow) و اسکریپتش CDN خود مایکروسافت با Cache-Control
 * یک‌روزه سرو می‌شود؛ چیزی که ما نمی‌توانیم تغییرش دهیم.
 *
 * با `lazyOnload` این ابزار کاملاً از مسیر critical خارج می‌شود و در زمان idle
 * بارگذاری می‌شود تا نه روی LCP اثر بگذارد، نه روی forced reflowهای ابتدای صفحه و
 * نه روی تعداد requestهای اولیه.
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
