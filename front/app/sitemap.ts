import type { MetadataRoute } from 'next';

import { fetchPublicApi } from '@/lib/public-api';
import { siteConfig } from '@/lib/site-config';
import type { PublicPageDirectoryEntry } from '@/services/features/public-page/types';

export const dynamic = 'force-dynamic';

const staticPaths = [
  '/',
  '/provider-management',
  '/online-provider-booking',
  '/pricing',
  '/privacy',
  '/terms',
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // توجه: `/explore` و `/cities/[slug]/barbers` قبلاً در sitemap بودند ولی
  // اکنون هر دو صفحهٔ private محسوب می‌شوند (ورود به سامانه لازم است)، پس
  // اینجا اضافه نمی‌شوند تا در نتایج جستجو نمایش داده نشوند.
  //
  // صفحات عمومی آرایشگاه (`/provider/[slug]`) فقط وقتی وارد sitemap می‌شوند که
  // واقعاً فعال باشند و آرایشگر اسلاگ یکتای سالن خود را ثبت کرده باشد. بک‌اند
  // همین فهرست را برمی‌گرداند، بنابراین نه شناسهٔ عددی در URL قرار می‌گیرد و نه
  // صفحه‌ای که قرار است ۴۰۴ بدهد اینجا می‌آید.
  const activeBarbers = await fetchPublicApi<PublicPageDirectoryEntry[]>(
    '/public-page/directory',
  );

  const staticEntries: MetadataRoute.Sitemap = staticPaths.map(path => ({
    url: path === '/' ? siteConfig.url : `${siteConfig.url}${path}`,
  }));

  const barberEntries: MetadataRoute.Sitemap = (activeBarbers ?? [])
    .filter(
      entry => typeof entry?.slug === 'string' && entry.slug.trim().length > 0,
    )
    .map(entry => ({
      url: `${siteConfig.url}/provider/${encodeURIComponent(entry.slug.trim())}`,
      ...(entry.updatedAt ? { lastModified: new Date(entry.updatedAt) } : {}),
    }));

  return [...staticEntries, ...barberEntries];
}
