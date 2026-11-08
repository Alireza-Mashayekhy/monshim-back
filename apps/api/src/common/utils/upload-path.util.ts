import path from 'node:path';

/**
 * مسیر ریشهٔ فایل‌های آپلودی — تنها منبع حقیقت.
 *
 * چرا از `process.cwd()` تنها استفاده نمی‌کنیم؟
 * `cwd` به این بستگی دارد که سرویس **از کجا اجرا شود**. با PM2 یا Docker،
 * `cwd` می‌تواند متفاوت باشد. اگر اشتباه باشد، دو اتفاق بد می‌افتد:
 *   ۱. فایل‌های موجود «گم» می‌شوند (کاربر آواتارهای قبلی را نمی‌بیند)
 *   ۲. فایل‌های جدید در مسیری نوشته می‌شوند که volume روی آن mount نیست
 *      → با هر deploy پاک می‌شوند.
 *
 * `UPLOAD_DIR` این وابستگی را حذف می‌کند. اگر تنظیم نشده باشد، رفتار قبلی
 * (`cwd/uploads`) حفظ می‌شود تا deploy فعلی دست‌نخورده بماند.
 */
export function getUploadRoot(): string {
  const configured = process.env.UPLOAD_DIR?.trim();
  if (configured) return path.resolve(configured);

  return path.join(process.cwd(), 'uploads');
}

/** مسیر یک زیرپوشهٔ آپلود (مثلاً `blog`). */
export function getUploadDir(...segments: string[]): string {
  return path.join(getUploadRoot(), ...segments);
}
