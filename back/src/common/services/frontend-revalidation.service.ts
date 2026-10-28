import { Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import {
  DEFAULT_FRONT_ORIGIN,
  normalizeOrigin,
} from 'src/common/utils/public-url.util';

export interface BarberProfileChangedPayload {
  /** شناسهٔ کاربری آرایشگر (`User.id`) */
  userId: number;
  /** اسلاگ صفحهٔ عمومی آرایشگر (در صورت وجود) */
  slugs?: Array<string | null | undefined>;
}

const REQUEST_TIMEOUT_MS = 5_000;

/**
 * اطلاع‌دادن به فرانت برای پاک‌سازیِ on-demand کشِ صفحه‌های عمومی.
 *
 * چرا لازم است؟ صفحهٔ `/barber/[slug]`، فهرست آرایشگرها و sitemap در فرانت با
 * ISR کش می‌شوند (`revalidate = 300`). پنل ادمین و پنل آرایشگر خودشان بعد از
 * هر تغییر، Server Action پاک‌سازی کش را صدا می‌زنند؛ اما اگر همان تغییر از
 * مسیر دیگری انجام شود (اسکریپت مدیریتی، اپ موبایل، بات یا فراخوانی مستقیم
 * API) هیچ‌کس کشِ فرانت را پاک نمی‌کرد و اطلاعات تاییدشده تا پایان بازه روی
 * صفحهٔ عمومی دیده نمی‌شد. این سرویس همان اطلاع‌رسانی را انجام می‌دهد.
 *
 * فعال‌سازی (اختیاری): کافی است `REVALIDATE_SECRET` در بک‌اند و فرانت
 * هم‌مقدار باشد. آدرس فرانت از `FRONTEND_URL` (یا `FRONT_URL`) خوانده می‌شود.
 * اگر تنظیم نشده باشد، این سرویس فقط **یک‌بار** هشدار می‌دهد و بی‌صدا رد
 * می‌شود؛ هیچ‌وقت مسیر اصلی (تایید پروفایل) را کند یا خراب نمی‌کند.
 */
@Injectable()
export class FrontendRevalidationService {
  private readonly logger = new Logger(FrontendRevalidationService.name);
  private warnedMissingConfig = false;

  constructor(
    @Optional()
    private readonly configService?: ConfigService,
  ) {}

  private readConfigValue(key: string): string | null {
    const fromConfig = this.configService?.get<string>(key);
    const value = fromConfig ?? process.env[key];
    const trimmed = String(value ?? '').trim();
    return trimmed ? trimmed : null;
  }

  private resolveFrontOrigin(): string {
    const configured =
      this.readConfigValue('FRONTEND_URL') ?? this.readConfigValue('FRONT_URL');

    const normalized = normalizeOrigin(configured);
    const isProduction = process.env.NODE_ENV === 'production';

    // در production هرگز به localhost درخواست نمی‌فرستیم؛ اگر env تنظیم نشده
    // باشد بهتر است پاک‌سازی انجام نشود تا این‌که به میزبان اشتباه برود.
    if (
      !normalized ||
      (isProduction && /localhost|127\.0\.0\.1/i.test(normalized))
    ) {
      return isProduction ? '' : DEFAULT_FRONT_ORIGIN;
    }

    return normalized;
  }

  private get endpoint(): { url: string; secret: string } | null {
    const secret = this.readConfigValue('REVALIDATE_SECRET');
    const origin = this.resolveFrontOrigin();

    if (!secret || !origin) {
      if (!this.warnedMissingConfig) {
        this.warnedMissingConfig = true;
        this.logger.warn(
          'پاک‌سازی on-demand کش فرانت غیرفعال است (REVALIDATE_SECRET یا ' +
            'FRONTEND_URL تنظیم نشده)؛ تغییرات پس از پایان بازهٔ کش فرانت ' +
            '(۵ دقیقه) دیده می‌شوند.',
        );
      }
      return null;
    }

    return { url: `${origin}/api/revalidate`, secret };
  }

  /**
   * اعلام تغییر پروفایل یک آرایشگر. عمداً `void` است: پاسخ‌دهی به ادمین یا
   * آرایشگر هرگز نباید به در دسترس بودن فرانت گره بخورد.
   */
  notifyBarberProfileChanged(payload: BarberProfileChangedPayload): void {
    const config = this.endpoint;
    if (!config) return;

    const userId = Number(payload.userId);
    if (!Number.isInteger(userId) || userId < 1) return;

    const slugs = (payload.slugs ?? [])
      .filter(
        (slug): slug is string =>
          typeof slug === 'string' && slug.trim().length > 0,
      )
      .map(slug => slug.trim());

    void axios
      .post(
        config.url,
        { userId, slugs },
        {
          timeout: REQUEST_TIMEOUT_MS,
          headers: {
            'Content-Type': 'application/json',
            'x-revalidate-secret': config.secret,
          },
        },
      )
      .catch((error: unknown) => {
        // خطای شبکه/۴۰۱ نباید در مسیر تایید پروفایل دیده شود؛ فقط لاگ.
        this.logger.warn(
          `پاک‌سازی کش صفحهٔ عمومی آرایشگر ${userId} در فرانت ناموفق بود: ${
            axios.isAxiosError(error)
              ? `${error.response?.status ?? ''} ${error.message}`.trim()
              : String(error)
          }`,
        );
      });
  }
}
