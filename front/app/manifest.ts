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
    icons: [
      {
        src: '/logo/favicon.ico',
        sizes: '98x98',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/logo/favicon.ico',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/logo/favicon.ico',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  };
}
