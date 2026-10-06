import type { MetadataRoute } from 'next';

import { siteConfig } from '@/lib/site-config';

const privatePaths = [
  '/admin',
  '/dashboard',
  '/home',
  '/explore',
  '/cities',
  '/support',
  '/login',
  '/login-otp',
  '/register',
  '/barbaer-signup',
  '/profile',
  '/appointments',
  '/payment',
  '/barber/profile',
  '/test',
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: privatePaths,
      },
      {
        // Explicitly permit OpenAI's search crawler on public pages. Private
        // account and management routes remain excluded like for other bots.
        userAgent: 'OAI-SearchBot',
        allow: '/',
        disallow: privatePaths,
      },
    ],
    sitemap: `${siteConfig.url}/sitemap.xml`,
  };
}
