import * as Sentry from '@sentry/nextjs';
Sentry.init({
  dsn: 'https://9168378fb23522e9bc24ee4a076c2017@o4510550604120064.ingest.de.sentry.io/4510550606217296',

  // Capture 100% in dev, 10% in production
  // Adjust based on your traffic volume
  tracesSampleRate: process.env.NODE_ENV === 'development' ? 1.0 : 0.1,
});
