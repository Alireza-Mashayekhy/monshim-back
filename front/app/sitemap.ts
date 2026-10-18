import type { MetadataRoute } from 'next';

import { fetchPublicApi } from '@/lib/public-api';
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

/**
 * صفحات عمومی آرایشگرها فقط زمانی در sitemap اعلام می‌شوند که
 * فعال باشند (خرید پکیج یا رزروهای بیعانه‌دار کافی). صفحات
 * غیرفعال در بک‌اند ۴۰۴ می‌دهند و نباید نمایه شوند.
 */
async function getActivePublicPageIds(): Promise<number[]> {
  const barbers = await fetchPublicApi<{ id: number }[]>(
    '/barber/public-pages/directory',
  );

  if (!Array.isArray(barbers)) return [];

  return barbers
    .map(barber => Number(barber?.id))
    .filter(id => Number.isInteger(id) && id > 0);
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // توجه: `/explore` و `/cities/[slug]/barbers` قبلاً در sitemap بودند ولی
  // اکنون هر دو صفحهٔ private محسوب می‌شوند (ورود به سامانه لازم است)، پس
  // اینجا اضافه نمی‌شوند تا در نتایج جستجو نمایش داده نشوند.

  const staticEntries: MetadataRoute.Sitemap = staticPaths.map(path => ({
    url: path === '/' ? siteConfig.url : `${siteConfig.url}${path}`,
  }));

  const barberIds = await getActivePublicPageIds();

  const barberEntries: MetadataRoute.Sitemap = barberIds.map(id => ({
    url: `${siteConfig.url}/barber/${id}`,
  }));

  return [...staticEntries, ...barberEntries];
}
