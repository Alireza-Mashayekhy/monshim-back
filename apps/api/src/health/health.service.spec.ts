import type { RedisService } from 'src/redis/redis.service';
import type { DataSource } from 'typeorm';

import { HealthService } from './health.service';

/**
 * تست رفتارِ نقاط بررسی سلامت.
 *
 * چرا اهمیت دارد: یک healthcheck که دروغ بگوید بدتر از نداشتن آن است.
 * اگر readiness وقتی دیتابیس قطع است «ok» برگرداند، load balancer ترافیک
 * را به نمونهٔ خراب می‌فرستد و کاربر ۵۰۰ می‌بیند. اگر برعکس، در حالت
 * hang برای همیشه معلق بماند، خودش کانکشن‌ها را اشباع می‌کند.
 */
type RedisState = { isOpen: boolean; ping: () => Promise<string> };

function createService(
  queryImpl: () => Promise<unknown>,
  redisState: RedisState,
): HealthService {
  const dataSource = { query: queryImpl } as unknown as DataSource;
  const redisService = {
    getClient: () => redisState,
  } as unknown as RedisService;

  return new HealthService(dataSource, redisService);
}

const healthyDb = () => Promise.resolve([{ '1': 1 }]);
const healthyRedis: RedisState = {
  isOpen: true,
  ping: () => Promise.resolve('PONG'),
};

describe('HealthService', () => {
  describe('live()', () => {
    it('همیشه ok است و به دیتابیس/Redis دست نمی‌زند', () => {
      const query = jest.fn(() => Promise.resolve([]));
      const ping = jest.fn(() => Promise.resolve('PONG'));

      const report = createService(query as never, {
        isOpen: true,
        ping,
      }).live();

      expect(report.status).toBe('ok');
      expect(query).not.toHaveBeenCalled();
      expect(ping).not.toHaveBeenCalled();
      expect(typeof report.uptimeSeconds).toBe('number');
    });
  });

  describe('ready()', () => {
    it('وقتی دیتابیس و Redis سالم‌اند ok برمی‌گرداند', async () => {
      const report = await createService(healthyDb, healthyRedis).ready();

      expect(report.status).toBe('ok');
      expect(report.checks).toEqual({ database: 'ok', redis: 'ok' });
      expect(report.details).toBeUndefined();
    });

    it('وقتی دیتابیس خطا می‌دهد degraded است و جزئیات می‌دهد', async () => {
      const report = await createService(
        () => Promise.reject(new Error('ECONNREFUSED 127.0.0.1:3306')),
        healthyRedis,
      ).ready();

      expect(report.status).toBe('degraded');
      expect(report.checks.database).toBe('down');
      expect(report.checks.redis).toBe('ok');
      expect(report.details?.database).toContain('ECONNREFUSED');
    });

    it('وقتی اتصال Redis باز نیست degraded است (بدون پرتاب خطای همگام)', async () => {
      const report = await createService(healthyDb, {
        isOpen: false,
        ping: () => Promise.resolve('PONG'),
      }).ready();

      expect(report.status).toBe('degraded');
      expect(report.checks.redis).toBe('down');
      expect(report.details?.redis).toBe('connection is not open');
    });

    it('هرگز throw نمی‌کند، حتی وقتی هر دو وابستگی خراب‌اند', async () => {
      await expect(
        createService(() => Promise.reject(new Error('boom')), {
          isOpen: false,
          ping: () => Promise.reject(new Error('nope')),
        }).ready(),
      ).resolves.toMatchObject({
        status: 'degraded',
        checks: { database: 'down', redis: 'down' },
      });
    });

    /**
     * این تست یک باگ واقعی را قفل می‌کند.
     *
     * نسخهٔ اول از `timer.unref()` استفاده می‌کرد تا تایمر مانع خروج پروسه
     * نشود. نتیجه: اگر هیچ کار دیگری روی event loop نبود، Node پیش از رسیدن
     * تایمر خارج می‌شد و `ready()` **هرگز** resolve نمی‌شد. این تست همان
     * حالت را بازتولید می‌کند: یک promise که هیچ‌وقت settle نمی‌شود.
     */
    it('بررسی معلق را پس از timeout قطع می‌کند و معطل نمی‌ماند', async () => {
      jest.useFakeTimers();

      const neverSettles = new Promise<string>(() => {
        /* عمداً هیچ‌وقت settle نمی‌شود */
      });

      const promise = createService(healthyDb, {
        isOpen: true,
        ping: () => neverSettles,
      }).ready();

      await jest.advanceTimersByTimeAsync(2000);

      const report = await promise;

      expect(report.status).toBe('degraded');
      expect(report.checks.redis).toBe('down');
      expect(report.details?.redis).toContain('timed out');

      jest.useRealTimers();
    });
  });
});
