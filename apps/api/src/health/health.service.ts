import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { RedisService } from 'src/redis/redis.service';
import { DataSource } from 'typeorm';

/** حداکثر زمان انتظار برای هر بررسی؛ بیشتر از این یعنی «آماده نیست». */
const CHECK_TIMEOUT_MS = 1500;

type CheckState = 'ok' | 'down';

export interface HealthReport {
  status: 'ok' | 'degraded';
  /** زمان پاسخ‌دهی خودِ سرویس (همیشه ok اگر پروسه زنده باشد) */
  uptimeSeconds: number;
  version: string;
  checks: {
    database: CheckState;
    redis: CheckState;
  };
  /** جزئیات فقط در حالت خرابی — برای اینکه پاسخ سالم کوچک بماند */
  details?: Record<string, string>;
}

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);
  private readonly startedAt = Date.now();

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly redis: RedisService,
  ) {}

  /**
   * بررسی «زنده بودن» — هیچ وابستگی خارجی را لمس نمی‌کند.
   *
   * برای liveness استفاده می‌شود: اگر این پاسخ بیاید، پروسه سالم است.
   * عمداً به دیتابیس و Redis دست نمی‌زند، چون liveness نباید به‌خاطر
   * قطعی یک سرویس بیرونی، پروسه را «مرده» اعلام کند و باعث restart پشت‌سرهم شود.
   */
  live() {
    return {
      status: 'ok' as const,
      uptimeSeconds: Math.floor((Date.now() - this.startedAt) / 1000),
      version: process.env.APP_VERSION ?? 'unknown',
    };
  }

  /**
   * بررسی «آماده بودن» — دیتابیس و Redis را واقعاً صدا می‌زند.
   *
   * برای readiness استفاده می‌شود: اگر دیتابیس در دسترس نباشد، ترافیک
   * نباید به این نمونه فرستاده شود (۵۰۳ برمی‌گرداند).
   *
   * ⚠️ هرگز throw نمی‌کند. اگر throw کند، فیلتر سراسری آن را به ۵۰۰
   * تبدیل می‌کند و load balancer نمی‌تواند «۵۰۳ آماده نیست» را از «باگ» تشخیص دهد.
   */
  async ready(): Promise<HealthReport> {
    const details: Record<string, string> = {};

    const [database, redis] = await Promise.all([
      this.checkDatabase(details),
      this.checkRedis(details),
    ]);

    const report: HealthReport = {
      status: database === 'ok' && redis === 'ok' ? 'ok' : 'degraded',
      uptimeSeconds: Math.floor((Date.now() - this.startedAt) / 1000),
      version: process.env.APP_VERSION ?? 'unknown',
      checks: { database, redis },
    };

    if (Object.keys(details).length > 0) report.details = details;

    return report;
  }

  private async checkDatabase(
    details: Record<string, string>,
  ): Promise<CheckState> {
    try {
      await this.withTimeout(this.dataSource.query('SELECT 1'), 'database');
      return 'ok';
    } catch (error) {
      details.database = this.describeError(error);
      return 'down';
    }
  }

  private async checkRedis(
    details: Record<string, string>,
  ): Promise<CheckState> {
    try {
      const client = this.redis.getClient();

      /**
       * اگر اتصال برقرار نشده باشد (`client` تعریف‌نشده) یا بسته شده باشد،
       * صدا زدن `ping()` مستقیماً خطای همگام پرتاب می‌کند. این حالت «down» است،
       * نه «خطای سرور».
       */
      if (!client?.isOpen) {
        details.redis = 'connection is not open';
        return 'down';
      }

      await this.withTimeout(client.ping(), 'redis');
      return 'ok';
    } catch (error) {
      details.redis = this.describeError(error);
      return 'down';
    }
  }

  /**
   * هر بررسی زمان‌دار است.
   *
   * چرا: اگر MySQL سوکت را باز نگه دارد ولی پاسخ ندهد (حالت hang)، بدون
   * timeout این درخواست برای همیشه معلق می‌ماند و healthcheck خودش
   * باعث اشباع کانکشن‌ها می‌شود.
   */
  private withTimeout<T>(promise: Promise<T>, label: string): Promise<T> {
    let timer: NodeJS.Timeout | undefined;

    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(
        () =>
          reject(
            new Error(`${label} check timed out after ${CHECK_TIMEOUT_MS}ms`),
          ),
        CHECK_TIMEOUT_MS,
      );
      /**
       * ❗️ عمداً `unref()` صدا زده نمی‌شود.
       * با `unref()` تایمر پروسه را زنده نگه نمی‌دارد؛ پس اگر هیچ کار دیگری
       * روی event loop نباشد، Node پیش از رسیدن تایمر خارج می‌شود و
       * «timeout» هرگز اجرا نمی‌شد (با یک تست واقعی کشف شد).
       * تایمر در `finally` همیشه پاک می‌شود، پس نگرانی از نشت وجود ندارد.
       */
    });

    return Promise.race([promise, timeout]).finally(() => {
      if (timer) clearTimeout(timer);
    });
  }

  private describeError(error: unknown): string {
    const message = (error as Error)?.message ?? String(error);
    // پیام اتصال ممکن است میزبان/پورت باشد؛ آن را در لاگ نگه می‌داریم نه در پاسخ HTTP.
    this.logger.warn(`health check failed: ${message}`);
    return message.slice(0, 200);
  }
}
