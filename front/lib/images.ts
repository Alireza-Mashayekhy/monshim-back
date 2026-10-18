/**
 * تبدیل مسیر نسبیِ تصویر (پروفایل یا نمونه‌کار آرایشگر) به URL مطلق.
 *
 * قابل استفاده در سرور و کلاینت است چون فقط از متغیر عمومی
 * `NEXT_PUBLIC_IMAGE_URL` استفاده می‌کند.
 */
export function publicImageUrl(imagePath?: string | null): string | undefined {
  if (!imagePath) return undefined;
  if (/^https?:\/\//i.test(imagePath)) return imagePath;

  const imageBase = process.env.NEXT_PUBLIC_IMAGE_URL;
  if (!imageBase || !/^https?:\/\//i.test(imageBase)) return undefined;

  return `${imageBase.replace(/\/+$/, '')}/${imagePath.replace(/^\/+/, '')}`;
}

/** نسخهٔ fallbackدار برای استفاده در `next/image` و `<img>`. */
export function publicImageUrlOrPlaceholder(imagePath?: string | null) {
  return publicImageUrl(imagePath) ?? '/placeholder.webp';
}
