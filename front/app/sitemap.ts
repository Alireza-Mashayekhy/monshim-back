import type { MetadataRoute } from 'next';

import { fetchPublicApi } from '@/lib/public-api';
import { siteConfig } from '@/lib/site-config';
import type { PublicDirectoryResponse } from '@/services/features/barber/types';

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
  const directory = await fetchPublicApi<PublicDirectoryResponse>(
    '/barber/public-directory',
  );

  const staticEntries: MetadataRoute.Sitemap = staticPaths.map(path => ({
    url: path === '/' ? siteConfig.url : `${siteConfig.url}${path}`,
  }));

  const exploreEntries: MetadataRoute.Sitemap =
    directory && directory.barbers.length > 0
      ? [{ url: `${siteConfig.url}/explore` }]
      : [];

  const cityEntries: MetadataRoute.Sitemap = (directory?.cities ?? [])
    .filter(city => city.activeBarberCount >= 3)
    .map(city => ({
      url: `${siteConfig.url}/cities/${encodeURIComponent(city.slug)}/barbers`,
    }));

  const barberEntries: MetadataRoute.Sitemap = [
    ...new Set(
      (directory?.barbers ?? [])
        .map(barber => Number(barber.id))
        .filter(id => Number.isInteger(id) && id > 0),
    ),
  ].map(id => ({
    url: `${siteConfig.url}/barber/${id}`,
  }));

  return [
    ...staticEntries,
    ...exploreEntries,
    ...cityEntries,
    ...barberEntries,
  ];
}
