import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
        port: '',
        pathname: '**',
      },
      {
        protocol: 'http',
        hostname: '**',
        port: '',
        pathname: '**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '4000',
        pathname: '/uploads/**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '', // پورت 80
        pathname: '/uploads/**',
      },
      // در صورت نیاز به سایر دامنه‌ها (مثل محیط production)
      {
        protocol: 'https',
        hostname: 'your-production-domain.com',
        pathname: '/uploads/**',
      },
    ],
  },
};

export default nextConfig;
