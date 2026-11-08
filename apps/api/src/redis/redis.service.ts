import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { createClient, RedisClientType } from 'redis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: RedisClientType;

  async onModuleInit() {
    this.client = createClient({
      socket: {
        host: process.env.REDIS_HOST,
        port: Number(process.env.REDIS_PORT),
      },
    });

    this.client.on('error', err => {
      this.logger.error(`Redis Error: ${err?.message ?? err}`);
    });

    await this.client.connect();

    this.logger.log('Redis connected');
  }

  getClient() {
    return this.client;
  }

  /**
   * بستن تمیز اتصال هنگام خاموشی سرویس (SIGTERM از PM2 / `docker stop`).
   *
   * چرا مهم است؟
   * اگر اتصال Redis بسته نشود، Node تا وقتی سوکت باز است خارج نمی‌شود.
   * `pm2 restart` اول SIGTERM می‌فرستد و صبر می‌کند؛ اگر پروسه بیرون نرود
   * بعد از مهلت با SIGKILL کشته می‌شود — که یعنی:
   *   • درخواست‌های در حال پردازش نیمه‌کاره رها می‌شوند
   *   • اتصال‌های MySQL هم تمیز بسته نمی‌شوند
   *   • هر restart در لاگ به‌صورت «kill» دیده می‌شود
   *
   * این متد فقط زمانی صدا زده می‌شود که `enableShutdownHooks()` فعال باشد.
   * اگر اتصال برقرار نشده باشد (مثلاً Redis در دسترس نبوده) بی‌خطر است.
   */
  async onModuleDestroy() {
    if (!this.client?.isOpen) return;

    try {
      await this.client.quit();
      this.logger.log('Redis connection closed');
    } catch (error) {
      this.logger.warn(
        `بستن اتصال Redis با خطا مواجه شد: ${(error as Error)?.message ?? error}`,
      );
      // اگر quit() موفق نشد، اتصال را به‌زور قطع می‌کنیم تا پروسه معطل نماند.
      this.client?.destroy();
    }
  }
}
