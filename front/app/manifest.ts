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
        src: '/logo/logo.png',
        sizes: '98x98',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/logo/logo.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/logo/logo.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  };
}
