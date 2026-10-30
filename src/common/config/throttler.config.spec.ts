import { Controller, Get, INestApplication } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import cookieParser from 'cookie-parser';
import request from 'supertest';

import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
} from '../utils/auth-cookie.util';
import { createThrottlerOptions } from './throttler.config';

const ACCESS_SECRET = 'test-access-secret';
const REFRESH_SECRET = 'test-refresh-secret';
const LIMIT = 3;

@Controller('probe')
class ProbeController {
  @Get()
  ping() {
    return { ok: true };
  }
}

/**
 * همان ساختار، ولی بدون `JwtModule` → مسیرِ جایگزینِ `new JwtService({})`
 * باید فعال شود تا بالا آمدنِ سرویس هرگز به محدودیت نرخ گره نخورد.
 */
async function createAppWithoutJwtModule() {
  const moduleRef = await Test.createTestingModule({
    imports: [
      ThrottlerModule.forRootAsync({
        inject: [{ token: JwtService, optional: true }],
        useFactory: createThrottlerOptions,
      }),
    ],
    controllers: [ProbeController],
    providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
  }).compile();

  const app = moduleRef.createNestApplication();
  app.use(cookieParser());
  await app.init();
  return { app, jwtService: new JwtService({}) };
}

/**
 * همین ساختارِ واقعیِ `AppModule` است (JwtModule سراسری +
 * `ThrottlerModule.forRootAsync` با `inject: [JwtService]`)؛ بنابراین اگر
 * تزریقِ وابستگی مشکل داشته باشد، این تست هنگام `compile` شکست می‌خورد.
 */
async function createApp() {
  const moduleRef = await Test.createTestingModule({
    imports: [
      JwtModule.registerAsync({
        global: true,
        useFactory: () => ({ secret: 'not-used-directly' }),
      }),
      ThrottlerModule.forRootAsync({
        inject: [JwtService],
        useFactory: createThrottlerOptions,
      }),
    ],
    controllers: [ProbeController],
    providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
  }).compile();

  const app = moduleRef.createNestApplication();
  app.use(cookieParser());
  await app.init();

  const jwtService = app.get(JwtService);
  return { app, jwtService };
}

process.env.THROTTLE_LIMIT = String(LIMIT);
process.env.THROTTLE_TTL_MS = '60000';
process.env.JWT_ACCESS_SECRET = ACCESS_SECRET;
process.env.JWT_REFRESH_SECRET = REFRESH_SECRET;

async function hit(app: INestApplication, cookies: string[] = []) {
  const pending = request(app.getHttpServer()).get('/probe');
  return cookies.length ? pending.set('Cookie', cookies) : pending;
}

describe('throttler config (محدودیت نرخ در عمل)', () => {
  it('درخواست‌های بدون توکن از یک IP را با سقف مشترک محدود می‌کند', async () => {
    const { app } = await createApp();

    const statuses = [
      await hit(app),
      await hit(app),
      await hit(app),
      await hit(app),
    ].map(response => response.status);

    expect(statuses).toEqual([200, 200, 200, 429]);
    await app.close();
  });

  it('هر کاربرِ واردشده سطلِ جدا دارد، حتی وقتی همه از یک IP می‌آیند', async () => {
    const { app, jwtService } = await createApp();
    const userA = await jwtService.signAsync(
      { id: 11 },
      { secret: ACCESS_SECRET, expiresIn: '6h' },
    );
    const userB = await jwtService.signAsync(
      { id: 22 },
      { secret: ACCESS_SECRET, expiresIn: '6h' },
    );

    const userAStatuses: number[] = [];
    for (let index = 0; index <= LIMIT; index++) {
      const response = await hit(app, [`${ACCESS_TOKEN_COOKIE}=${userA}`]);
      userAStatuses.push(response.status);
    }
    expect(userAStatuses).toEqual([200, 200, 200, 429]);

    // کاربر B از همان IP آمده، ولی سطلِ خودش را دارد
    const userBResponse = await hit(app, [`${ACCESS_TOKEN_COOKIE}=${userB}`]);
    expect(userBResponse.status).toBe(200);

    // سطل IP هم مستقل است؛ مهمان‌ها نمی‌توانند سهمیهٔ کاربرِ واردشده را بسوزانند
    const anonymousResponse = await hit(app);
    expect(anonymousResponse.status).toBe(200);
    await app.close();
  });

  it('بدونِ JwtModule هم سرویس بالا می‌آید و کاربر را درست می‌شمارد (مسیر جایگزین)', async () => {
    const { app, jwtService } = await createAppWithoutJwtModule();
    const token = await jwtService.signAsync(
      { id: 55 },
      { secret: ACCESS_SECRET, expiresIn: '6h' },
    );

    const statuses: number[] = [];
    for (let index = 0; index <= LIMIT; index++) {
      statuses.push(
        (await hit(app, [`${ACCESS_TOKEN_COOKIE}=${token}`])).status,
      );
    }
    expect(statuses).toEqual([200, 200, 200, 429]);

    // سطل کاربر با سطل IP فرق دارد
    expect((await hit(app)).status).toBe(200);
    await app.close();
  });

  it('وقتی سقف IP پر شده، درخواستِ رفرشِ کاربر (توکن منقضی + رفرش‌توکن) هنوز ۴۲۹ نمی‌شود', async () => {
    const { app, jwtService } = await createApp();

    // سطل مشترک IP با درخواست‌های مهمان پر می‌شود (سناریوی TRUST_PROXY خاموش)
    for (let index = 0; index <= LIMIT; index++) {
      await hit(app);
    }
    expect((await hit(app)).status).toBe(429);

    const expiredAccess = await jwtService.signAsync(
      { id: 33 },
      // عدد = ثانیه؛ منفی یعنی منقضی‌شده
      { secret: ACCESS_SECRET, expiresIn: -10 },
    );
    const refreshToken = await jwtService.signAsync(
      { sub: 33 },
      { secret: REFRESH_SECRET, expiresIn: '30d' },
    );

    // فقط کوکی رفرش (کوکی access پس از ۶ ساعت توسط مرورگر حذف شده است)
    const refreshOnly = await hit(app, [
      `${REFRESH_TOKEN_COOKIE}=${refreshToken}`,
    ]);
    // همراه با access منقضی (کوکی تا لحظهٔ انقضا در مرورگر می‌ماند)
    const withExpiredAccess = await hit(app, [
      `${ACCESS_TOKEN_COOKIE}=${expiredAccess}`,
      `${REFRESH_TOKEN_COOKIE}=${refreshToken}`,
    ]);

    expect(refreshOnly.status).toBe(200);
    expect(withExpiredAccess.status).toBe(200);
    await app.close();
  });
});
