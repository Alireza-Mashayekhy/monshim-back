import { Controller, Get, HttpCode, HttpStatus, Res } from '@nestjs/common';
import type { Response } from 'express';

import { HealthService } from './health.service';

/**
 * نقاط بررسی سلامت سرویس.
 *
 * چرا وجود دارند؟
 * بدون این‌ها هیچ راهی نیست بفهمیم «سرویس بالا آمده ولی آماده نیست» —
 * مثلاً پروسه زنده است اما اتصال MySQL برقرار نشده. PM2 و Docker و Nginx
 * فقط می‌فهمند پروسه باز است، نه اینکه کار می‌کند. نتیجه: ترافیک به
 * نمونهٔ خراب فرستاده می‌شود و کاربر خطای ۵۰۰ می‌بیند.
 *
 * مسیرها زیر پیشوند سراسری `api` قرار می‌گیرند:
 *   GET /api/health          → liveness  (بدون وابستگی خارجی)
 *   GET /api/health/ready    → readiness (DB + Redis، با timeout)
 *
 * ⚠️ این کنترلر گارد ندارد، پس عمومی است. هیچ اطلاعات حساسی برنمی‌گرداند
 * (فقط ok/down و پیام خطا، نه هاست و پورت و رمز).
 */
@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthService) {}

  /**
   * liveness: اگر این پاسخ آمد، پروسه سالم است.
   * همیشه ۲۰۰ برمی‌گرداند و به دیتابیس/Redis دست نمی‌زند.
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  live() {
    return this.health.live();
  }

  /**
   * readiness: ۲۰۰ اگر همهٔ وابستگی‌ها سالم باشند، ۵۰۳ در غیر این صورت.
   *
   * از `@Res()` استفاده می‌شود تا بتوان کد وضعیت را خودمان تعیین کنیم؛
   * با `HttpException` پاسخ به شکل خطای استاندارد درمی‌آمد و برای
   * load balancer/healthcheck قابل تفکیک نبود.
   */
  @Get('ready')
  async ready(@Res({ passthrough: true }) response: Response) {
    const report = await this.health.ready();

    response.status(
      report.status === 'ok' ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE,
    );

    return report;
  }
}
