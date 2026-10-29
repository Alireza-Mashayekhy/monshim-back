import type { Metadata } from 'next';

import ExploreClient from '@/components/pages/explore/explore-client';
import { buildPageMetadata } from '@/lib/seo';
import { siteConfig } from '@/lib/site-config';

/**
 * صفحهٔ جست‌وجوی آرایشگاه‌ها داخل پنل کاربر (`/panel/explore`).
 *
 * نکته: این صفحه **خصوصی** است (`isPublicAuthPath` در `lib/auth.ts` آن را
 * شامل نمی‌شود)، یعنی کاربران غیرعضو به صفحهٔ ورود هدایت می‌شوند. به همین
 * دلیل نه ایندکس می‌شود و نه دادهٔ ساخت‌یافته منتشر می‌کند؛ صفحهٔ عمومی و
 * سئوشدهٔ هر آرایشگاه مسیر مستقل خودش (`/barber/[id]`) را دارد.
 */
export const revalidate = 300;

const pageDescription =
  'آرایشگاه‌های تأییدشده را جست‌وجو کنید، نام و موقعیت سالن را ببینید و خدمات و قیمت‌های ثبت‌شده را بررسی کنید. برای استفاده وارد حساب کاربری خود شوید.';

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata({
    title: 'جست‌وجوی آرایشگاه‌ها و سالن‌های زیبایی',
    description: pageDescription,
    path: siteConfig.routes.explore,
    noIndex: true,
  });
}

export default function ExplorePage() {
  return (
    <main id="main-content" className="min-h-screen bg-background pb-24">
      <ExploreClient />
    </main>
  );
}
