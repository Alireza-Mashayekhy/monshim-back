export const MAX_IMAGE_SIZE = 1024 * 1024 * 3;
export const IMAGE_SIZE_ERROR = 'حداکثر حجم هر عکس 3 مگابایت است.';
export const IMAGE_FORMAT_ERROR =
  'فقط فرمت‌های jpeg، jpg، png، gif و webp مجاز هستند.';

export const IMAGE_DROPZONE_ACCEPT: Record<string, string[]> = {
  'image/jpeg': ['.jpeg', '.jpg'],
  'image/png': ['.png'],
  'image/gif': ['.gif'],
  'image/webp': ['.webp'],
};

export const IMAGE_ACCEPT = Object.entries(IMAGE_DROPZONE_ACCEPT)
  .flatMap(([type, extensions]) => [type, ...extensions])
  .join(',');

export function getImageUploadError(
  file: Blob & { name?: string },
): string | null {
  if (file.size > MAX_IMAGE_SIZE) return IMAGE_SIZE_ERROR;
  const extensions = IMAGE_DROPZONE_ACCEPT[file.type];
  const extension = file.name?.split('.').pop()?.toLowerCase();
  if (
    !extensions ||
    (file.name !== undefined && !extensions.includes(`.${extension}`))
  ) {
    return IMAGE_FORMAT_ERROR;
  }
  return null;
}
