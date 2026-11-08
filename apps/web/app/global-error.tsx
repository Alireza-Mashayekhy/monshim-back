'use client';

import NextError from 'next/error';
import { useEffect } from 'react';

import { captureException } from '@/lib/sentry-client';

/**
 * این کامپوننت آخرین خط دفاعی در برابر خطاهاست و در باندل کلاینتِ همهٔ صفحه‌ها
 * حضور دارد؛ به همین دلیل نباید SDK ی Sentry را مستقیماً import کند (حدود ۱۷
 * کیلوبایت gzip فقط برای هستهٔ آن در مسیر critical می‌آمد). در عوض از loader
 * مشترک استفاده می‌کنیم که در صورت نیاز SDK را لود و خطا را گزارش می‌کند.
 */
export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    captureException(error);
  }, [error]);

  return (
    <html>
      <body>
        {/* `NextError` is the default Next.js error page component. Its type
        definition requires a `statusCode` prop. However, since the App Router
        does not expose status codes for errors, we simply pass 0 to render a
        generic error message. */}
        <NextError statusCode={0} />
      </body>
    </html>
  );
}
