'use client';

import { useEffect, useRef } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { useWatch } from 'react-hook-form';

/**
 * با تغییر استان، فیلد شهر پاک می‌شود؛ چون شهرهای استانِ قبلی دیگر معتبر نیستند
 * و کاربر باید شهر را از فهرستِ استانِ تازه انتخاب کند.
 *
 * ── چرا بدون `shouldValidate`؟ ─────────────────────────────────────────────
 * این پاک‌کردن یک واکنش داخلی فرم است، نه اشتباه کاربر. اگر همراهش validation
 * اجرا شود (`setValue('cityId', '', { shouldValidate: true })`) خطای
 * «انتخاب شهر اجباری است» بلافاصله و *پیش از* آنکه کاربر فرصت انتخاب شهر را
 * داشته باشد قرمز می‌شود.
 *
 * بدتر اینکه با تنظیمات پیش‌فرض فرم‌ها (`mode: 'onSubmit'`) این خطا بعداً پاک
 * هم نمی‌شود: `reValidateMode` اعتبارسنجیِ مجدد روی تغییر را فقط «بعد از اولین
 * submit» فعال می‌کند؛ یعنی انتخاب‌کردن شهر هیچ validationای اجرا نمی‌کرد و
 * کاربر با اینکه شهر را انتخاب کرده بود، فیلد قرمز و پیام «انتخاب شهر اجباری
 * است» را می‌دید (تا لحظهٔ زدن دکمهٔ ثبت).
 *
 * ── چرا «تغییر هم‌زمان استان و شهر» نادیده گرفته می‌شود؟ ───────────────────
 * `reset()` (مثلاً وقتی مودال ویرایش آدرس با استان/شهرِ ذخیره‌شدهٔ کاربر باز
 * می‌شود) هر دو فیلد را با هم مقداردهی می‌کند؛ آن شهرِ از قبل انتخاب‌شده
 * متعلق به همان استان است و پاک‌کردنش یک باگ بود (کاربر شهر ذخیره‌شده‌اش را
 * از دست می‌داد). پس فقط وقتی شهر پاک می‌شود که استان «به‌تنهایی» عوض شده باشد،
 * یعنی کاربر واقعاً استان دیگری انتخاب کرده است.
 *
 * `clearErrors` هم خطای احتمالیِ مانده از قبل (مثلاً بعد از یک submit ناموفق که
 * کاربر سپس استان را عوض می‌کند) را پاک می‌کند تا فیلد شهر تمیز از نو شروع کند؛
 * اعتبارسنجی واقعی سر جای خودش و در زمان submit انجام می‌شود.
 *
 * ── چرا `UseFormReturn<any>`؟ ──────────────────────────────────────────────
 * تایپِ `setValue`/`clearErrors`/`useWatch` در react-hook-form نام فیلد را
 * به‌صورت `Path<TFieldValues>` می‌گیرد که برای یک نوعِ عمومی (generic) قابل حل
 * نیست، پس نمی‌توان hook مشترکی با تایپ دقیق برای همهٔ فرم‌ها نوشت. هر سه فرمی
 * که این hook را استفاده می‌کنند (ثبت‌نام کاربر، ثبت‌نام آرایشگر، ویرایش آدرس)
 * فیلدهای `provinceId: string` و `cityId: string` دارند.
 */
export function useResetCityOnProvinceChange(
  methods: UseFormReturn<any>,
  selectedProvinceId: string | undefined,
) {
  const selectedCityId: string | undefined = useWatch({
    control: methods.control,
    name: 'cityId',
  });

  const previous = useRef({
    provinceId: selectedProvinceId,
    cityId: selectedCityId,
  });

  useEffect(() => {
    const provinceChanged = previous.current.provinceId !== selectedProvinceId;
    const cityChanged = previous.current.cityId !== selectedCityId;
    previous.current = {
      provinceId: selectedProvinceId,
      cityId: selectedCityId,
    };

    // فقط تغییرِ «تنهای» استان به معنای انتخاب استان جدید توسط کاربر است.
    if (!provinceChanged || cityChanged) return;

    methods.setValue('cityId', '', { shouldValidate: false });
    methods.clearErrors('cityId');
  }, [selectedProvinceId, selectedCityId, methods]);
}
