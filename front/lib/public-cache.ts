import { revalidatePath, revalidateTag } from 'next/cache';

import { PUBLIC_API_CACHE_TAG } from './public-cache-tags';
import { validatePublicPageSlug } from './public-page-slug';

/**
 * پاک‌سازیِ on-demand کشِ صفحه‌های عمومیِ آرایشگر.
 *
 * چرا لازم است؟
 *   • دادهٔ عمومی سمت سرور با `next: { revalidate: 300 }` و `revalidate = 300`
 *     در Data Cache / Full Route Cache نگه داشته می‌شود.
 *   • وقتی ادمین پروفایلِ آرایشگر را **تایید** می‌کند (یا تغییراتِ در انتظارِ
 *     او را اعمال می‌کند) رکورد در دیتابیس بلافاصله به‌روز می‌شود، اما تا
 *     پایانِ آن ۳۰۰ ثانیه همان نسخهٔ قدیمی — یا صفحهٔ ۴۰۴ برای آرایشگرِ
 *     تازه‌تاییدشده — به کاربران نمایش داده می‌شد. این تابع همان شکاف را
 *     می‌بندد تا تغییرات «همان لحظه» در همه‌جا دیده شوند.
 *
 * چه چیزی پاک می‌شود؟
 *   ۱. الگوی مسیر داینامیکِ `/barber/[id]` و `/panel/barber/[id]` (نسخهٔ
 *      شناسهٔ عددی مثل `/barber/42`).
 *   ۲. مسیرهای صریحِ همان آرایشگر: `/barber/[slug]` (وقتی اسلاگ معلوم است)،
 *      `/barber/<id>` و `/panel/barber/<id>`.
 *   ۳. صفحهٔ اصلی، جست‌وجوی آرایشگرها و sitemap که فهرستِ آرایشگرها را نشان
 *      می‌دهند.
 *   ۴. تگِ مشترکِ دادهٔ عمومی؛ این تگ همهٔ صفحه‌هایی را که از `fetchPublicApi`
 *      ساخته شده‌اند پوشش می‌دهد — از جمله نسخهٔ اسلاگِ صفحهٔ عمومی وقتی
 *      اسلاگ در اختیار نیست (ر.ک. توضیح `expire: 0` پایین‌تر).
 *
 * این تابع فقط از کدِ سرور (Server Action یا Route Handler) قابل فراخوانی است.
 */
export interface BarberPublicCacheTarget {
  /** شناسهٔ کاربری آرایشگر (`User.id`) که صفحهٔ عمومی‌اش تغییر کرده است. */
  userId?: number | string | null;
  /** اسلاگ‌های صفحهٔ عمومی آرایشگر (فعلی و/یا قبلی) در صورت معلوم بودن. */
  slugs?: Array<string | null | undefined>;
  /** در صورت نیاز به پاک‌سازی مسیرهای دلخواه دیگر. */
  extraPaths?: Array<string | null | undefined>;
}

/** مسیرهای ثابتی که فهرست/خلاصهٔ آرایشگرها را نشان می‌دهند. */
const SHARED_PATHS = ['/', '/panel/explore', '/sitemap.xml'] as const;

/** مسیرهای داینامیکِ پروفایل که با الگو پاک می‌شوند (بدون نیاز به اسلاگ). */
const DYNAMIC_ROUTE_PATTERNS = ['/barber/[id]', '/panel/barber/[id]'] as const;

function normalizeUserId(value: number | string | null | undefined) {
  if (value === null || value === undefined) return null;
  const numeric =
    typeof value === 'number' ? value : Number(String(value).trim());
  return Number.isInteger(numeric) && numeric > 0 ? numeric : null;
}

function normalizeSlugs(slugs: Array<string | null | undefined> | undefined) {
  const result = new Set<string>();
  for (const candidate of slugs ?? []) {
    if (typeof candidate !== 'string' || !candidate.trim()) continue;
    const { valid, slug } = validatePublicPageSlug(candidate);
    if (valid && slug) result.add(slug);
  }
  return [...result];
}

/**
 * اجرای امنِ یک عملیاتِ کش: در زمان build/static generation ممکن است
 * استورِ کش در دسترس نباشد؛ در چنین حالتی فقط لاگ می‌کنیم تا رندرِ صفحه
 * به‌خاطر پاک‌سازیِ کش شکست نخورد.
 */
function safeRun(label: string, action: () => void): boolean {
  try {
    action();
    return true;
  } catch (error) {
    console.error(`[public-cache] پاک‌سازی کش ناموفق بود (${label}):`, error);
    return false;
  }
}

export function revalidateBarberPublicCache(
  target: BarberPublicCacheTarget = {},
): boolean {
  let ok = true;

  for (const pattern of DYNAMIC_ROUTE_PATTERNS) {
    ok =
      safeRun(`path:${pattern}`, () => revalidatePath(pattern, 'page')) && ok;
  }

  const userId = normalizeUserId(target.userId);
  const explicitPaths = new Set<string>();

  for (const path of SHARED_PATHS) explicitPaths.add(path);
  if (userId) {
    explicitPaths.add(`/barber/${userId}`);
    explicitPaths.add(`/panel/barber/${userId}`);
  }
  for (const slug of normalizeSlugs(target.slugs)) {
    explicitPaths.add(`/barber/${slug}`);
  }
  for (const path of target.extraPaths ?? []) {
    if (typeof path === 'string' && path.startsWith('/'))
      explicitPaths.add(path);
  }

  for (const path of explicitPaths) {
    ok = safeRun(`path:${path}`, () => revalidatePath(path)) && ok;
  }

  // تگِ مشترکِ دادهٔ عمومی؛ پوششِ نهایی برای صفحه‌های ناشناخته (مثل نسخهٔ
  // اسلاگِ صفحه‌های عمومی وقتی اسلاگ در اختیار نیست).
  //
  // نکتهٔ مهم (اندازه‌گیری‌شده): `revalidatePath('/barber/[id]', 'page')`
  // نسخهٔ اسلاگ را پاک نمی‌کند و `revalidateTag(tag, 'max')` هم
  // stale-while-revalidate است؛ یعنی اولین بازدیدِ بعد از تایید ممکن بود هنوز
  // نسخهٔ قدیمی را ببیند. با `expire: 0` تگ فوراً منقضی می‌شود و همان
  // بازدیدِ بعدی، صفحهٔ تازه را می‌سازد (هم در Server Action و هم در Route
  // Handler مجاز است، برخلاف `updateTag`).
  const invalidateTag = () =>
    revalidateTag(PUBLIC_API_CACHE_TAG, { expire: 0 });

  ok = safeRun(`tag:${PUBLIC_API_CACHE_TAG}`, invalidateTag) && ok;

  if (!ok) {
    console.warn(
      `[public-cache] برخی از عملیات‌های پاک‌سازی کش انجام نشد (user=${userId ?? '-'})`,
    );
  }

  return ok;
}
