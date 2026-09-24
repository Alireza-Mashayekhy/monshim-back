import type { MetadataRoute } from 'next';

import { siteConfig } from '@/lib/site-config';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // صفحات پنل کاربری و احراز هویت نباید ایندکس شوند
        disallow: [
          '/dashboard',
          '/admin',
          '/login',
          '/login-otp',
          '/register',
          '/barbaer-signup',
          '/profile',
          '/appointments',
          '/payment',
          '/test',
        ],
      },
    ],
    sitemap: `${siteConfig.url}/sitemap.xml`,
    host: siteConfig.url,
  };
}
