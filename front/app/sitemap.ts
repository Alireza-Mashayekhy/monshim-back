import type { MetadataRoute } from 'next';

import { fetchPublicApi } from '@/lib/public-api';
import { siteConfig } from '@/lib/site-config';
import type { PublicPageDirectoryEntry } from '@/services/features/public-page/types';

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
  //
  // صفحات عمومی آرایشگاه (`/barber/[id]`) فقط وقتی وارد sitemap می‌شوند که
  // واقعاً فعال باشند: آرایشگر پکیج صفحهٔ اختصاصی را خریده باشد یا به حد نصاب
  // نوبت‌های پرداخت‌شده رسیده باشد. بک‌اند همین فهرست را برمی‌گرداند، بنابراین
  // هیچ آدرسی که قرار است ۴۰۴ بدهد اینجا نمی‌آید.
  const activeBarbers = await fetchPublicApi<PublicPageDirectoryEntry[]>(
    '/public-page/directory',
  );

  const staticEntries: MetadataRoute.Sitemap = staticPaths.map(path => ({
    url: path === '/' ? siteConfig.url : `${siteConfig.url}${path}`,
  }));

  const barberEntries: MetadataRoute.Sitemap = (activeBarbers ?? [])
    .filter(
      entry => Number.isInteger(Number(entry?.id)) && Number(entry.id) > 0,
    )
    .map(entry => ({
      url: `${siteConfig.url}/barber/${entry.id}`,
      ...(entry.updatedAt ? { lastModified: new Date(entry.updatedAt) } : {}),
    }));

  return [...staticEntries, ...barberEntries];
}
