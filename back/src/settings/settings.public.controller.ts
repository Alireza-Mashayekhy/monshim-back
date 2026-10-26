import { Controller, Get } from '@nestjs/common';
import {
  type CommissionMode,
  type CommissionTier,
  normalizeCommissionTiers,
} from 'src/payment/deposit-amount';

import { CommissionBase } from './entities/setting.entity';
import { SettingsService } from './settings.service';

export interface PublicCommissionSettingsResponse {
  depositPercent: number;
  commissionPercent: number;
  commissionBase: CommissionBase;
  commissionMode: CommissionMode;
  commissionTiers: CommissionTier[];
  commissionMaxAmount: number | null;
}

@Controller('settings')
export class PublicSettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  /**
   * تنظیمات عمومی مورد نیاز برای نمایش مبالغ پرداخت در فرانت
   * (بدون نیاز به احراز هویت ادمین)
   * این endpoint برای صفحه رزرو آنلاین و پیش‌نمایش لینک بیعانه استفاده می‌شود
   * تا کمیسیون همان مقداری باشد که بک‌اند هنگام ایجاد پرداخت محاسبه می‌کند.
   */
  @Get('public')
  async getPublicSettings(): Promise<PublicCommissionSettingsResponse> {
    const settings = await this.settingsService.getSettings();
    return {
      depositPercent: Number(settings.depositPercent),
      commissionPercent: Number(settings.commissionPercent),
      commissionBase: settings.commissionBase,
      commissionMode: settings.commissionMode === 'flat' ? 'flat' : 'tiered',
      commissionTiers: normalizeCommissionTiers(settings.commissionTiers),
      commissionMaxAmount: settings.commissionMaxAmount ?? null,
    };
  }

  /**
   * alias برای سازگاری با فرانت که /settings/payment-config را صدا می‌زند
   */
  @Get('payment-config')
  async getPaymentConfig(): Promise<PublicCommissionSettingsResponse> {
    return this.getPublicSettings();
  }
}
