/**
 * نرمال‌سازی و اعتبارسنجی اسلاگ «صفحهٔ اختصاصی آرایشگاه» (`/barber/[slug]`).
 * هم‌راستا با قواعد بک‌اند (`back/src/public-page/slug.util.ts`).
 */

export const MIN_PUBLIC_PAGE_SLUG_LENGTH = 3;
export const MAX_PUBLIC_PAGE_SLUG_LENGTH = 60;

const PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';

export const RESERVED_PUBLIC_PAGE_SLUGS = new Set([
  'admin',
  'api',
  'auth',
  'barber',
  'barbers',
  'dashboard',
  'deposit',
  'directory',
  'edit',
  'explore',
  'home',
  'login',
  'logout',
  'me',
  'new',
  'null',
  'panel',
  'pricing',
  'privacy',
  'profile',
  'public-page',
  'register',
  'robots',
  'settings',
  'sitemap',
  'slug',
  'support',
  'terms',
  'undefined',
]);

export type PublicPageSlugValidation =
  | { valid: true; slug: string }
  | { valid: false; slug: string; reason: string };

export function normalizePublicPageSlug(raw: unknown): string {
  if (typeof raw !== 'string') return '';

  return raw
    .trim()
    .replace(/[۰-۹]/g, char => String(PERSIAN_DIGITS.indexOf(char)))
    .replace(/[٠-٩]/g, char => String(ARABIC_DIGITS.indexOf(char)))
    .toLowerCase();
}

/** تبدیل فاصله به خط تیره، ارقام فارسی/عربی به انگلیسی و حروف بزرگ به کوچک حین تایپ */
export function sanitizePublicPageSlugInput(raw: string): string {
  return raw
    .replace(/[۰-۹]/g, char => String(PERSIAN_DIGITS.indexOf(char)))
    .replace(/[٠-٩]/g, char => String(ARABIC_DIGITS.indexOf(char)))
    .replace(/\s+/g, '-')
    .replace(/-{2,}/g, '-')
    .toLowerCase();
}

export function validatePublicPageSlug(raw: unknown): PublicPageSlugValidation {
  const slug = normalizePublicPageSlug(raw);

  if (!slug) {
    return {
      valid: false,
      slug,
      reason: 'وارد کردن اسلاگ الزامی است',
    };
  }

  if (slug.length < MIN_PUBLIC_PAGE_SLUG_LENGTH) {
    return {
      valid: false,
      slug,
      reason: 'اسلاگ باید حداقل ۳ کاراکتر باشد',
    };
  }

  if (slug.length > MAX_PUBLIC_PAGE_SLUG_LENGTH) {
    return {
      valid: false,
      slug,
      reason: 'اسلاگ نمی‌تواند بیشتر از ۶۰ کاراکتر باشد',
    };
  }

  if (/[^a-z0-9-]/.test(slug)) {
    return {
      valid: false,
      slug,
      reason:
        'اسلاگ فقط می‌تواند شامل حروف انگلیسی کوچک، اعداد و خط تیره (-) باشد',
    };
  }

  if (slug.startsWith('-') || slug.endsWith('-') || slug.includes('--')) {
    return {
      valid: false,
      slug,
      reason:
        'اسلاگ نباید با خط تیره شروع یا تمام شود یا دو خط تیره پشت سر هم داشته باشد',
    };
  }

  if (/^\d+$/.test(slug)) {
    return {
      valid: false,
      slug,
      reason:
        'اسلاگ نمی‌تواند فقط شامل عدد باشد؛ حداقل از یک حرف انگلیسی استفاده کنید',
    };
  }

  if (RESERVED_PUBLIC_PAGE_SLUGS.has(slug)) {
    return {
      valid: false,
      slug,
      reason: 'این اسلاگ رزرو شده است؛ لطفاً عبارت دیگری انتخاب کنید',
    };
  }

  return { valid: true, slug };
}
