import type { ReactNode } from 'react';

import { siteConfig } from '@/lib/site-config';

/**
 * لایهٔ صفحهٔ عمومی و سئوشدهٔ آرایشگاه (`/provider/[slug]`).
 *
 * طبق طراحی اختصاصی این صفحه، هدر و فوتر عمومی سایت نمایش داده نمی‌شوند و
 * ناوبری بالای صفحه صرفاً با بردکرامب (`Breadcrumbs`) انجام می‌شود.
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
    <div className="min-h-screen bg-[#f4f7f8]">
      <main id="main-content" className="min-h-screen">
        {children}
      </main>
    </div>
  );
}
