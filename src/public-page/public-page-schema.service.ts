import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { ensureEntitySchema } from 'src/common/utils/schema-guard.util';
import { DataSource } from 'typeorm';

import { PublicPageDiscount } from './entities/public-page-discount.entity';

/**
 * جدول‌هایی که در production با `synchronize = false` ممکن است ساخته نشده باشند
 * (چون فقط با فایل‌های `sql/` به‌صورت دستی ساخته می‌شوند).
 *
 * نمونهٔ واقعی: جدول `public_page_discounts` که اگر در دیتابیس production نبود،
 * «افزودن کد تخفیف» در پنل ادمین با خطای ۵۰۰ شکست می‌خورد.
 */
const GUARDED_ENTITIES = [PublicPageDiscount];

/**
 * هنگام بالا آمدن سرویس، وجودِ جدول‌های مورد نیاز این ماژول را تضمین می‌کند.
 *
 * این گارد کاملاً idempotent است: اگر جدول از قبل وجود داشته باشد هیچ نوشتنی
 * انجام نمی‌شود (فقط یک بررسی سبک روی اسکیمای پایگاه داده). همچنین هر خطایی
 * فقط ثبت می‌شود و هرگز مانع بوت‌شدن سرویس نمی‌شود؛ در آن صورت درخواست‌ها مثل
 * قبل با خطای مشخص (و نه ۵۰۰ مبهم) پاسخ می‌گیرند.
 */
@Injectable()
export class PublicPageSchemaService implements OnApplicationBootstrap {
  private readonly logger = new Logger(PublicPageSchemaService.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async onApplicationBootstrap(): Promise<void> {
    for (const entity of GUARDED_ENTITIES) {
      try {
        const report = await ensureEntitySchema(this.dataSource, entity);

        if (report.created) {
          this.logger.log(
            `جدول «${report.table}» در پایگاه داده وجود نداشت و به‌صورت خودکار ساخته شد ` +
              `(دیگر نیازی به اجرای دستی فایل‌های پوشهٔ sql/ برای این جدول نیست).`,
          );
        } else if (report.addedColumns.length > 0) {
          this.logger.log(
            `ستون‌های جاماندهٔ جدول «${report.table}» اضافه شد: ${report.addedColumns.join('، ')}`,
          );
        }

        for (const warning of report.warnings) {
          this.logger.warn(warning);
        }
      } catch (error) {
        // شکستِ این گارد نباید سرویس را از کار بیندازد؛ فقط تشخیص خطا را
        // برای اپراتور روشن می‌کنیم.
        this.logger.error(
          `ساخت خودکار جدول مربوط به ${
            typeof entity === 'function' ? entity.name : String(entity)
          } ناموفق بود؛ در صورت نیاز فایل‌های پوشهٔ sql/ را به‌صورت دستی اجرا کنید. جزئیات: ${String(error)}`,
        );
      }
    }
  }
}
