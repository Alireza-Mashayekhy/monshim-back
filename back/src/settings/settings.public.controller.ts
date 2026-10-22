import { Controller, Get } from '@nestjs/common';
import { CommissionBase } from './entities/setting.entity';
import { SettingsService } from './settings.service';

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
  async getPublicSettings(): Promise<{
    depositPercent: number;
    commissionPercent: number;
    commissionBase: CommissionBase;
  }> {
    const settings = await this.settingsService.getSettings();
    return {
      depositPercent: Number(settings.depositPercent),
      commissionPercent: Number(settings.commissionPercent),
      commissionBase: settings.commissionBase,
    };
  }

  /**
   * alias برای سازگاری با فرانت قدیمی‌تر که /payment/config را صدا می‌زند
   * در صورت نیاز می‌توان جداگانه نگه داشت
   */
  @Get('payment-config')
  async getPaymentConfig(): Promise<{
    depositPercent: number;
    commissionPercent: number;
    commissionBase: CommissionBase;
  }> {
    return this.getPublicSettings();
  }
}
