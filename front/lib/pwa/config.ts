/** Shared install and worker policy. Changing workerPolicy changes the generated worker. */
export const pwaConfig = {
  showDelayMs: 5_000,
  dismissalMs: 7 * 24 * 60 * 60 * 1000,
  dismissalKey: 'monshiim:pwa-install-dismissed-at',
  workerPolicy: {
    cacheName: 'monshiim-pwa-v1',
    offlineUrl: '/pwa/offline.html',
    // This is an explicit public, immutable-in-content allowlist; never add API,
    // HTML pages, Next/RSC payloads, user uploads or transaction data here.
    assets: ['/pwa/offline.html', '/pwa/icon-192.png'],
  },
  text: {
    iosTitle: 'منشیم را به صفحه اصلی اضافه کنید.',
    iosDescription:
      'با افزودن منشیم به صفحه اصلی، سریع‌تر به خدمات و نوبت‌های خود دسترسی داشته باشید.',
    androidTitle: 'منشیم همیشه در دسترس شماست!',
    androidDescription:
      'منشیم را روی گوشی خود نصب کنید و تجربه‌ای سریع‌تر و راحت‌تر از رزرو نوبت و دسترسی به خدمات داشته باشید.',
    desktopTitle: 'منشیم، روی دسکتاپ شما!',
    desktopDescription:
      'به‌راحتی به منشیم و مدیریت نوبت‌های خود دسترسی داشته باشید.',
  },
} as const;
