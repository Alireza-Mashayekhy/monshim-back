import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { join } from 'path';

import { AppModule } from './app.module';
import { setupSwagger } from './common/config/swagger.config';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.setGlobalPrefix('api');

  if (process.env.NODE_ENV !== 'production') {
    setupSwagger(app);
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
