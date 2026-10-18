import type { ReactNode } from 'react';

import MarketingFooter from '@/components/marketing/layout/marketing-footer';
import MarketingHeader from '@/components/marketing/layout/marketing-header';
import { siteConfig } from '@/lib/site-config';

/**
 * لایهٔ صفحهٔ عمومی و سئوشدهٔ آرایشگاه (`/barber/[id]`).
 *
 * این گروه عمداً جدا از `(panel)` (صفحات خصوصیِ کاربر) و `(marketing)` است:
 * صفحه باید بدون ورود به سامانه در دسترس باشد و هدر/فوتر عمومیِ سایت را
 * داشته باشد، اما نباید با صفحات لندینگ یا پنل قاطی شود.
 */
export const metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${siteConfig.name} | معرفی آرایشگاه‌ها و سالن‌های زیبایی`,
    template: `%s | ${siteConfig.name}`,
  },
  applicationName: `${siteConfig.name} - ${siteConfig.nameEn}`,
  authors: [{ name: siteConfig.nameEn, url: siteConfig.url }],
  creator: siteConfig.nameEn,
  publisher: siteConfig.nameEn,
  formatDetection: {
    telephone: false,
  },
};

export default function PublicBarberLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <MarketingHeader />
      <main id="main-content" className="flex-1">
        {children}
      </main>
      <MarketingFooter />
    </div>
  );
}
