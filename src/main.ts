import './instrument';

import { Logger, ValidationPipe } from '@nestjs/common';
import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { join } from 'path';

import { AppModule } from './app.module';
import { setupSwagger } from './common/config/swagger.config';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.setGlobalPrefix('api');

  if (process.env.NODE_ENV !== 'production') {
    setupSwagger(app);
  }

  /**
   * پشت reverse proxy باید trust proxy فعال باشد تا محدودیت نرخ بر اساس
   * IP واقعی کاربر اعمال شود (وگرنه همه یک IP مشترک دارند). به‌صورت
   * پیش‌فرض خاموش است تا اگر سرویس مستقیم روی اینترنت است، کسی نتواند
   * با هدر X-Forwarded-For محدودیت را دور بزند.
   */
  const trustProxy = (process.env.TRUST_PROXY ?? '').trim();
  if (trustProxy === 'true' || trustProxy === '1') {
    app.set('trust proxy', 1);
  } else if (/^\d+$/.test(trustProxy)) {
    app.set('trust proxy', Number(trustProxy));
  } else if (process.env.NODE_ENV === 'production') {
    /**
     * در production سرویس عملاً پشت reverse proxy است؛ بدون `TRUST_PROXY` همهٔ
     * درخواست‌ها با IP خودِ پروکسی دیده می‌شوند و «محدودیت نرخ» به‌جای هر کاربر،
     * بین همهٔ کاربرها مشترک می‌شود (سقف ۱۲۰ درخواست در دقیقه برای کل سایت!).
     * نتیجهٔ عملی‌اش ۴۲۹ شدنِ تصادفی `/auth/refresh` و لاگ‌اوت شدن کاربرها بود.
     * شمارش بر اساس شناسهٔ کاربر (throttle-tracker.util) این مشکل را برای
     * کاربرهای واردشده حل می‌کند، اما IP واقعی همچنان برای ورود/OTP لازم است.
     */
    new Logger('Bootstrap').warn(
      'TRUST_PROXY در production تنظیم نشده است؛ اگر سرویس پشت nginx/ترافیک/لیارا است ' +
        'آن را روی true بگذارید تا محدودیت نرخ بر اساس IP واقعی هر کاربر اعمال شود.',
    );
  }

  app.use(compression());
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalInterceptors(new ResponseInterceptor());

  // خطاهای غیر HTTP (multer، MySQL و ...) با کد وضعیت مناسب برگردانده شوند
  const { httpAdapter } = app.get(HttpAdapterHost);
  app.useGlobalFilters(new AllExceptionsFilter(httpAdapter));

  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads',
  });

  const corsOrigin = process.env.CORS_ORIGIN;
  app.enableCors({
    origin: corsOrigin
      ? corsOrigin.split(',').map(origin => origin.trim())
      : true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  });

  await app.listen(process.env.PORT ?? 3000);
}

void bootstrap();
