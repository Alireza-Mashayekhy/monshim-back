'use server';

import { revalidateBarberPublicCache } from '@/lib/public-cache';
import { extractUser, isAdmin, isBarber } from '@/lib/roles';
import { getMe } from '@/services/features/auth/server.api';

/**
 * پاک‌سازیِ on-demand کشِ صفحه‌های عمومی آرایشگر.
 *
 * مسئله‌ای که این فایل حل می‌کند:
 *   صفحهٔ عمومی `/provider/[slug]` (و فهرست‌ها و sitemap) با ISR پویا کش می‌شود
 *   (`revalidate = 300`). وقتی ادمین در پنل، پروفایلِ آرایشگر را تایید می‌کند،
 *   دیتابیس همان لحظه به‌روز می‌شود ولی تا پایانِ آن بازه صفحهٔ عمومی همان
 *   اطلاعاتِ قدیمی (یا برای آرایشگرِ تازه‌تاییدشده، ۴۰۴) را نشان می‌داد.
 *
 * امنیت:
 *   هویت و نقش‌های جاری از `/auth/me` بررسی می‌شوند؛ امضای JWT به‌تنهایی
 *   کافی نیست، چون حساب ممکن است غیرفعال، نشست باطل یا نقش تغییر کرده باشد.
 *     • ادمین → هر آرایشگری را می‌تواند تازه کند.
 *     • آرایشگر → فقط صفحهٔ عمومی خودش.
 *   اگر کوکی روی هاست دیگری است، Server Action آن را دریافت نمی‌کند و
 *   وبهوک برای تغییرات پشتیبانی‌شده، یا بازهٔ revalidate، کش را تازه می‌کند.
 */
async function readActor() {
  try {
    const user = extractUser(await getMe());
    if (!user) return null;
    const id = Number(user.id);
    if (!Number.isInteger(id) || id <= 0) return null;
    return {
      userId: id,
      isAdmin: isAdmin(user),
      isBarber: isBarber(user),
    };
  } catch {
    // The API rejects invalid/expired/revoked sessions and may be temporarily
    // unavailable. Fail closed; the backend webhook or ISR can refresh later.
    return null;
  }
}

/**
 * پس از تایید/اعمال تغییرات توسط ادمین (یا ویرایش خود آرایشگر) کشِ صفحه‌های
 * عمومی آرایشگر بلافاصله تازه می‌شود.
 *
 * @param userId شناسهٔ کاربری آرایشگر (`User.id`)
 * @param slugs  اسلاگ‌های صفحهٔ عمومی آرایشگر (اختیاری؛ مسیر داینامیک
 *               `/provider/[id]` بدون آن هم پاک می‌شود)
 */
export async function revalidatePublicBarberCache(input?: {
  userId?: number | string | null;
  slugs?: Array<string | null | undefined>;
}): Promise<boolean> {
  const actor = await readActor();
  if (!actor) return false;

  const requested = Number(input?.userId);
  const requestedUserId =
    Number.isInteger(requested) && requested > 0 ? requested : null;

  // ادمین اجازهٔ تازه‌کردن هر آرایشگری را دارد؛ آرایشگر فقط خودش.
  const isAllowed =
    actor.isAdmin ||
    (actor.isBarber &&
      Boolean(requestedUserId) &&
      actor.userId === requestedUserId);

  if (!isAllowed) return false;

  // ادمین ممکن است فقط بخواهد کشِ عمومی «به‌طور کلی» تازه شود (مثلاً پس از
  // تایید یک نظر)؛ در آن حالت شناسهٔ خودِ ادمین را به‌عنوان آرایشگر پاک نمی‌کنیم.
  const targetUserId =
    requestedUserId ?? (actor.isBarber ? actor.userId : null);

  return revalidateBarberPublicCache({
    userId: targetUserId,
    slugs: input?.slugs,
  });
}

/**
 * مسیرِ قدیمی (سازگاری با فراخوانی‌های موجود): پس از خرید موفق پکیج یا
 * ثبت/تغییر اسلاگ، صفحهٔ عمومی آرایشگرِ لاگین‌کرده باید بلافاصله در دسترس
 * باشد؛ در غیر این صورت تا پایان زمان `revalidate` مسیر، کاربر ۴۰۴ یا نسخهٔ
 * قبلی را می‌بیند.
 *
 * این Server Action فقط برای آرایشگرِ لاگین‌کرده اجرا می‌شود و اسلاگ‌های ورودی
 * قبل از پاک‌سازی کش اعتبارسنجی می‌شوند تا مسیر دلخواه پاک نشود.
 */
export async function revalidateMyPublicBarberPage(
  slugs?: Array<string | null | undefined>,
) {
  const actor = await readActor();
  if (!actor?.isBarber || !actor.userId) return;

  revalidateBarberPublicCache({ userId: actor.userId, slugs });
}
