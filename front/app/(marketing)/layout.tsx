import type { ReactNode } from 'react';

import MarketingFooter from '@/components/marketing/layout/marketing-footer';
import MarketingHeader from '@/components/marketing/layout/marketing-header';
import { siteConfig } from '@/lib/site-config';

export const metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${siteConfig.name} | سامانه رزرو آنلاین آرایشگاه و نرم افزار مدیریت آرایشگاه`,
    template: '%s | منشیم',
  },
  applicationName: `${siteConfig.name} - ${siteConfig.nameEn}`,
  authors: [{ name: siteConfig.nameEn, url: siteConfig.url }],
  creator: siteConfig.nameEn,
  publisher: siteConfig.nameEn,
  formatDetection: {
    telephone: false,
  },
};

export default function MarketingLayout({ children }: { children: ReactNode }) {
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
