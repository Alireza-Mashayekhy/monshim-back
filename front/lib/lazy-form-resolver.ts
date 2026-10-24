import type { FieldValues, Resolver } from 'react-hook-form';
import type { ZodType } from 'zod';

type ZodResolverModule = typeof import('@hookform/resolvers/zod');

let zodResolverPromise: Promise<ZodResolverModule> | null = null;

/**
 * ماژول `zodResolver` را یک بار (و مشترک بین همهٔ فرم‌ها) لود می‌کند.
 *
 * اگر لود شکست بخورد، promise پاک می‌شود تا تلاش بعدی دوباره شانس داشته باشد
 * (مثلاً بعد از یک قطعی کوتاه شبکه یا خطای گذرای CDN).
 */
export function loadZodResolverModule(): Promise<ZodResolverModule> {
  if (!zodResolverPromise) {
    zodResolverPromise = import('@hookform/resolvers/zod').catch(error => {
      zodResolverPromise = null;
      throw error;
    });
  }

  return zodResolverPromise;
}

export type LazyFormResolver<TFieldValues extends FieldValues> = {
  resolver: Resolver<TFieldValues>;
  /**
   * شروع بارگذاری resolver و اسکیمای فرم.
   *
   * باید بلافاصله بعد از mount فرم صدا زده شود؛ این‌طور تا وقتی کاربر در حال
   * تایپ است، chunkهای لازم رسیده‌اند و لحظهٔ «زدن دکمه» هیچ درخواست شبکه‌ای
   * در مسیر submit وجود ندارد.
   */
  preload: () => void;
};

/**
 * ساخت resolver برای zod با دو بهبود نسبت به الگوی قبلی
 * (`resolver: async (...) => { const { zodResolver } = await import(...) }`):
 *
 * ۱) **پیش‌بارگذاری**: maژول resolver و اسکیمای zod همان لحظهٔ mount شروع به
 *    لود شدن می‌کنند، نه لحظهٔ submit. روی موبایل/اینترنت کند این تفاوت
 *    محسوس است: قبلاً اولین کلیک باید منتظر دو round-trip شبکه می‌ماند.
 * ۲) **قابلیت تلاش دوباره**: نتیجهٔ import کش می‌شود و در صورت خطا پاک؛ پس
 *    یک قطعی موقت، فرم را تا رفرش صفحه از کار نمی‌اندازد.
 *
 * نکتهٔ مهم: zod و resolver همچنان در chunk جدا و lazy می‌مانند (هدف
 * بهینه‌سازی قبلی حفظ می‌شود)؛ فقط زمانِ شروع لود تغییر کرده است.
 */
export function createLazyFormResolver<TFieldValues extends FieldValues>(
  loadSchema: () => Promise<ZodType<TFieldValues, TFieldValues>>,
): LazyFormResolver<TFieldValues> {
  let schemaPromise: Promise<ZodType<TFieldValues, TFieldValues>> | null = null;

  const loadSchemaOnce = () => {
    if (!schemaPromise) {
      schemaPromise = loadSchema().catch(error => {
        schemaPromise = null;
        throw error;
      });
    }

    return schemaPromise;
  };

  const preload = () => {
    // خطاها همین‌جا بلعیده می‌شوند؛ اگر لود ناموفق باشد، لحظهٔ submit همان
    // خطا دوباره پرتاب می‌شود و `FormProvider` آن را به کاربر نشان می‌دهد.
    void loadZodResolverModule().catch(() => {});
    void loadSchemaOnce().catch(() => {});
  };

  const resolver: Resolver<TFieldValues> = async (values, context, options) => {
    const [{ zodResolver }, schema] = await Promise.all([
      loadZodResolverModule(),
      loadSchemaOnce(),
    ]);

    const resolve = zodResolver(schema) as unknown as Resolver<TFieldValues>;

    return resolve(values, context, options);
  };

  return { resolver, preload };
}
