import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Monshim',
    short_name: 'Monshim',
    description: 'Monshim',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#0d8cf4',
    // قبلاً هر سه اندازه به یک فایل ۱ مگابایتی (logo.png با ابعاد 1254x1254)
    // اشاره می‌کردند و مرورگر هنگام پردازش manifest آن را دانلود می‌کرد. حالا
    // برای هر اندازه یک فایل واقعی و کوچک تولید شده است (با نسخهٔ webp برای
    // مرورگرهایی که پشتیبانی می‌کنند).
    icons: [
      {
        src: '/logo/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/logo/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/logo/icon-192.webp',
        sizes: '192x192',
        type: 'image/webp',
        purpose: 'any',
      },
      {
        src: '/logo/icon-512.webp',
        sizes: '512x512',
        type: 'image/webp',
        purpose: 'any',
      },
    ],
  };
}
