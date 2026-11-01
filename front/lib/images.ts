/**
 * تبدیل مسیر تصویر به URL قابل استفاده در سرور و مرورگر. با API نسبی،
 * `/uploads` روی همان origin فرانت پراکسی می‌شود تا مرورگرِ راه دور به
 * localhost خودش مراجعه نکند.
 */
export function publicImageUrl(imagePath?: string | null): string | undefined {
  if (!imagePath) return undefined;
  if (/^https?:\/\//i.test(imagePath)) return imagePath;

  const imageBase =
    process.env.NEXT_PUBLIC_IMAGE_URL?.trim() ||
    process.env.NEXT_PUBLIC_API_URL?.trim().replace(/\/api\/?$/i, '') ||
    '';
  if (imageBase && !/^https?:\/\//i.test(imageBase)) return undefined;

  return `${imageBase.replace(/\/+$/, '')}/${imagePath.replace(/^\/+/, '')}`;
}

/** نسخهٔ fallbackدار برای استفاده در `next/image` و `<img>`. */
export function publicImageUrlOrPlaceholder(imagePath?: string | null) {
  return publicImageUrl(imagePath) ?? '/placeholder.webp';
}
