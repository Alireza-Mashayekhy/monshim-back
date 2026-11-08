// src/settings/settings.service.ts

import {
  BadRequestException,
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  CommissionTier,
  DEFAULT_COMMISSION_MAX_AMOUNT,
  DEFAULT_COMMISSION_TIERS,
  normalizeCommissionTiers,
} from 'src/payment/deposit-amount';
import { Repository } from 'typeorm';

import { UpdateSiteSettingsDto } from './dto/update-setting.dto';
import { SiteSettings } from './entities/setting.entity';

@Injectable()
export class SettingsService implements OnModuleInit {
  private readonly logger = new Logger(SettingsService.name);

  constructor(
    @InjectRepository(SiteSettings)
    private readonly settingsRepo: Repository<SiteSettings>,
  ) {}

  /**
   * در محیط پروداکشن `synchronize` غیرفعال است؛ این متد به صورت idempotent
   * ستون‌های کمیسیون پلکانی و سقف کمیسیون را در جدول `site_settings` ایجاد می‌کند.
   */
  async onModuleInit() {
    if (
      typeof this.settingsRepo?.query !== 'function' ||
      !this.settingsRepo?.metadata?.tableName
    ) {
      return;
    }

    const tableName = this.settingsRepo.metadata.tableName;
    if (!/^[a-zA-Z0-9_]+$/.test(tableName)) {
      return;
    }

    try {
      const rows: Array<{ COLUMN_NAME?: string; column_name?: string }> =
        await this.settingsRepo.query(
          'SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?',
          [tableName],
        );

      const existing = new Set(
        (rows ?? []).map(row =>
          String(row.COLUMN_NAME ?? row.column_name ?? '').toLowerCase(),
        ),
      );

      if (!existing.has('commission_mode')) {
        await this.settingsRepo.query(
          `ALTER TABLE \`${tableName}\` ADD COLUMN \`commission_mode\` VARCHAR(20) NOT NULL DEFAULT 'tiered'`,
        );
      }

      if (!existing.has('commission_tiers')) {
        await this.settingsRepo.query(
          `ALTER TABLE \`${tableName}\` ADD COLUMN \`commission_tiers\` JSON NULL`,
        );
      }

      if (!existing.has('commission_max_amount')) {
        await this.settingsRepo.query(
          `ALTER TABLE \`${tableName}\` ADD COLUMN \`commission_max_amount\` INT NULL DEFAULT ${DEFAULT_COMMISSION_MAX_AMOUNT}`,
        );
      }
    } catch (error) {
      this.logger.warn(
        `بررسی/ایجاد ستون‌های کمیسیون پلکانی در site_settings ناموفق بود: ${String(error)}`,
      );
    }
  }

  private hydrateSettings(settings: SiteSettings): SiteSettings {
    settings.commissionMode =
      settings.commissionMode === 'flat' ? 'flat' : 'tiered';
    settings.commissionTiers = normalizeCommissionTiers(
      settings.commissionTiers,
    );
    if (settings.commissionMaxAmount === undefined) {
      settings.commissionMaxAmount = DEFAULT_COMMISSION_MAX_AMOUNT;
    } else if (
      settings.commissionMaxAmount !== null &&
      Number(settings.commissionMaxAmount) <= 0
    ) {
      settings.commissionMaxAmount = null;
    } else if (settings.commissionMaxAmount !== null) {
      settings.commissionMaxAmount = Math.round(
        Number(settings.commissionMaxAmount),
      );
    }
    return settings;
  }

  async getSettings(): Promise<SiteSettings> {
    let settings = await this.settingsRepo.findOne({
      where: { id: 1 },
    });

    if (!settings) {
      settings = this.settingsRepo.create({
        id: 1,
        depositPercent: 30,
        commissionPercent: 10,
        commissionMode: 'tiered',
        commissionTiers: DEFAULT_COMMISSION_TIERS.map(tier => ({ ...tier })),
        commissionMaxAmount: DEFAULT_COMMISSION_MAX_AMOUNT,
      });

      settings = await this.settingsRepo.save(settings);
    }

    return this.hydrateSettings(settings);
  }

  async updateSettings(dto: UpdateSiteSettingsDto): Promise<SiteSettings> {
    const settings = await this.getSettings();

    if (
      dto.depositPercent !== undefined &&
      (dto.depositPercent < 0 || dto.depositPercent > 100)
    ) {
      throw new BadRequestException('درصد بیعانه باید بین ۰ تا ۱۰۰ باشد');
    }

    if (
      dto.commissionPercent !== undefined &&
      (dto.commissionPercent < 0 || dto.commissionPercent > 100)
    ) {
      throw new BadRequestException('درصد سهم سایت باید بین ۰ تا ۱۰۰ باشد');
    }

    if (dto.depositPercent !== undefined) {
      settings.depositPercent = dto.depositPercent;
    }
    if (dto.commissionPercent !== undefined) {
      settings.commissionPercent = dto.commissionPercent;
    }
    if (dto.commissionBase !== undefined) {
      settings.commissionBase = dto.commissionBase;
    }
    if (dto.commissionMode !== undefined) {
      settings.commissionMode = dto.commissionMode;
    }

    if (dto.commissionTiers !== undefined) {
      const validatedTiers = this.validateAndBuildTiers(dto.commissionTiers);
      settings.commissionTiers = validatedTiers;
    }

    if (dto.commissionMaxAmount !== undefined) {
      if (dto.commissionMaxAmount === null || dto.commissionMaxAmount === 0) {
        settings.commissionMaxAmount = null;
      } else {
        if (dto.commissionMaxAmount < 0) {
          throw new BadRequestException('سقف کمیسیون نمی‌تواند منفی باشد');
        }
        settings.commissionMaxAmount = Math.round(dto.commissionMaxAmount);
      }
    }

    const saved = await this.settingsRepo.save(settings);
    return this.hydrateSettings(saved);
  }

  private validateAndBuildTiers(
    input: Array<{ upTo?: number | null; percent: number }>,
  ): CommissionTier[] {
    if (!Array.isArray(input) || input.length === 0) {
      throw new BadRequestException(
        'حداقل یک پله برای کمیسیون پلکانی لازم است',
      );
    }

    const result: CommissionTier[] = [];
    let previousUpper = 0;
    let seenUnbounded = false;

    for (let i = 0; i < input.length; i++) {
      if (seenUnbounded) {
        throw new BadRequestException(
          'پس از پلهٔ پایانی (بدون سقف)، پلهٔ دیگری نمی‌توان تعریف کرد',
        );
      }

      const row = input[i];
      const percent = Number(row.percent);
      if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
        throw new BadRequestException(
          `درصد پلهٔ شمارهٔ ${i + 1} باید بین ۰ تا ۱۰۰ باشد`,
        );
      }

      if (row.upTo === null || row.upTo === undefined) {
        seenUnbounded = true;
        result.push({ upTo: null, percent });
        continue;
      }

      const upTo = Math.round(Number(row.upTo));
      if (!Number.isFinite(upTo) || upTo <= previousUpper) {
        throw new BadRequestException(
          `سقف بازه در پلهٔ شمارهٔ ${i + 1} باید بزرگ‌تر از پلهٔ قبلی (${previousUpper.toLocaleString('fa-IR')} تومان) باشد`,
        );
      }

      previousUpper = upTo;
      result.push({ upTo, percent });
    }

    if (!seenUnbounded) {
      const last = result[result.length - 1];
      result.push({ upTo: null, percent: last.percent });
    }

    return result;
  }
}
