import type { INestApplication } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { ResponseInterceptor } from 'src/common/interceptors/response.interceptor';
import { RedisService } from 'src/redis/redis.service';
import request from 'supertest';
import { DataSource } from 'typeorm';

import { HealthController } from './health.controller';
import { HealthService } from './health.service';

/**
 * تست سطح HTTP: مسیرها واقعاً mount می‌شوند و کد وضعیت درست است.
 *
 * چرا جدا از تست واحد: منطق `ready()` ممکن است درست باشد اما اگر کنترلر
 * ۵۰۳ برنگرداند (مثلاً به‌خاطر `@Res()` نادرست یا ترتیب interceptors)،
 * load balancer هرگز نمی‌فهمد سرویس آماده نیست.
 */
describe('Health endpoints (HTTP)', () => {
  let app: INestApplication;

  const build = async (
    queryImpl: () => Promise<unknown>,
    redisOpen: boolean,
  ) => {
    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        HealthService,
        { provide: DataSource, useValue: { query: queryImpl } },
        {
          provide: RedisService,
          useValue: {
            getClient: () => ({
              isOpen: redisOpen,
              ping: () => Promise.resolve('PONG'),
            }),
          },
        },
      ],
    }).compile();

    const created = moduleRef.createNestApplication<NestExpressApplication>();
    created.setGlobalPrefix('api');
    /**
     * همان `ResponseInterceptor` سراسری ثبت می‌شود تا شکل پاسخ دقیقاً
     * همان چیزی باشد که در production به کلاینت/healthcheck می‌رسد.
     * بدون آن، تست شکل پاسخی را می‌سنجد که هرگز در production دیده نمی‌شود.
     */
    created.useGlobalInterceptors(new ResponseInterceptor());
    await created.init();
    return created;
  };

  afterEach(async () => {
    await app?.close();
  });

  it('GET /api/health در حالت سالم ۲۰۰ می‌دهد', async () => {
    app = await build(() => Promise.resolve([{ '1': 1 }]), true);

    const response = await request(app.getHttpServer()).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe('ok');
  });

  it('GET /api/health/ready در حالت سالم ۲۰۰ می‌دهد', async () => {
    app = await build(() => Promise.resolve([{ '1': 1 }]), true);

    const response = await request(app.getHttpServer()).get(
      '/api/health/ready',
    );

    expect(response.status).toBe(200);
    expect(response.body.data.checks).toEqual({ database: 'ok', redis: 'ok' });
  });

  it('GET /api/health/ready وقتی دیتابیس قطع است ۵۰۳ می‌دهد', async () => {
    app = await build(() => Promise.reject(new Error('ECONNREFUSED')), true);

    const response = await request(app.getHttpServer()).get(
      '/api/health/ready',
    );

    expect(response.status).toBe(503);
    expect(response.body.data.status).toBe('degraded');
  });
});
