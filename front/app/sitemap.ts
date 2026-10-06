import type { MetadataRoute } from 'next';

import { siteConfig } from '@/lib/site-config';

export const dynamic = 'force-dynamic';

const staticPaths = [
  '/',
  '/barber-management',
  '/online-barber-booking',
  '/pricing',
  '/privacy',
  '/terms',
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // توجه: `/explore` و `/cities/[slug]/barbers` قبلاً در sitemap بودند ولی
  // اکنون هر دو صفحهٔ private محسوب می‌شوند (ورود به سامانه لازم است)، پس
  // اینجا اضافه نمی‌شوند تا در نتایج جستجو نمایش داده نشوند.

  const staticEntries: MetadataRoute.Sitemap = staticPaths.map(path => ({
    url: path === '/' ? siteConfig.url : `${siteConfig.url}${path}`,
  }));

  return staticEntries;
}
