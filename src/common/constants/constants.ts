export const jwtConstants = {
  secret: process.env.JWT_ACCESS_SECRET,
  refreshSecret: process.env.JWT_REFRESH_SECRET,
};

export const ALLOWED_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
] as const;

export const ALLOWED_IMAGE_EXTENSIONS = [
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.webp',
];

// فرمت واقعی محتوای فایل (بر اساس decode شدن تصویر، نه پسوند)
export const ALLOWED_IMAGE_FORMATS = [
  'jpeg',
  'jpg',
  'png',
  'gif',
  'webp',
] as const;

// همهٔ تصاویر ورودی به این فرمت تبدیل و بهینه می‌شوند
export const OUTPUT_IMAGE_FORMAT = 'webp';
export const OUTPUT_IMAGE_EXTENSION = '.webp';
export const IMAGE_WEBP_QUALITY = 82; // کیفیت webp (۰ تا ۱۰۰)
export const IMAGE_MAX_DIMENSION = 1600; // حداکثر عرض/ارتفاع خروجی (px)
export const IMAGE_MAX_INPUT_PIXELS = 50_000_000; // محافظت از بمب‌های decompression
export const IMAGE_MAX_SIZE_BYTES = 1024 * 1024 * 3; // 3 مگابایت

export const IRAN_PHONE_REGEX = /^09\d{9}$/;
