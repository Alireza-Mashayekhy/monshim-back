'use server';

import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';

import { revalidateBarberPublicCache } from '@/lib/public-cache';
import { isAdmin, isBarber, normalizeRoles } from '@/lib/roles';

/**
 * پاک‌سازیِ on-demand کشِ صفحه‌های عمومی آرایشگر.
 *
 * مسئله‌ای که این فایل حل می‌کند:
 *   صفحهٔ عمومی `/barber/[slug]` (و فهرست‌ها و sitemap) با ISR پویا کش می‌شود
 *   (`revalidate = 300`). وقتی ادمین در پنل، پروفایلِ آرایشگر را تایید می‌کند،
 *   دیتابیس همان لحظه به‌روز می‌شود ولی تا پایانِ آن بازه صفحهٔ عمومی همان
 *   اطلاعاتِ قدیمی (یا برای آرایشگرِ تازه‌تاییدشده، ۴۰۴) را نشان می‌داد.
 *
 * امنیت:
 *   این Server Actionها از کوکیِ `access_token` استفاده می‌کنند و JWT را با
 *   `JWT_ACCESS_SECRET` اعتبارسنجی می‌کنند؛ بنابراین هر کاربری نمی‌تواند با
 *   فراخوانیِ مستقیم، کشِ صفحات را پاک کند:
 *     • ادمین → هر آرایشگری را می‌تواند تازه کند.
 *     • آرایشگر → فقط صفحهٔ عمومی خودش.
 */

let warnedMissingSecret = false;

async function readActor() {
  const token = (await cookies()).get('access_token')?.value;
  const secret = process.env.JWT_ACCESS_SECRET;

  if (!secret && !warnedMissingSecret) {
    warnedMissingSecret = true;
    console.warn(
      '[public-cache] JWT_ACCESS_SECRET تنظیم نشده است؛ پاک‌سازی on-demand ' +
        'کشِ صفحهٔ عمومی انجام نمی‌شود و تغییرات پس از پایان بازهٔ کش ' +
        '(۵ دقیقه) دیده می‌شوند.',
    );
  }

  if (!token || !secret) return null;

  try {
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(secret),
    );
    const roles = normalizeRoles(payload.roles);
    const id = Number(payload.id ?? payload.sub);
    return {
      roles,
      userId: Number.isInteger(id) && id > 0 ? id : null,
      isAdmin: isAdmin({ roles }),
      isBarber: isBarber({ roles }),
    };
  } catch {
    // توکن نامعتبر/منقضی: کاری انجام نمی‌دهیم؛ کش بعد از revalidate خودکار
    // به‌روز می‌شود.
    return null;
  }
}

/**
 * پس از تایید/اعمال تغییرات توسط ادمین (یا ویرایش خود آرایشگر) کشِ صفحه‌های
 * عمومی آرایشگر بلافاصله تازه می‌شود.
 *
 * @param userId شناسهٔ کاربری آرایشگر (`User.id`)
 * @param slugs  اسلاگ‌های صفحهٔ عمومی آرایشگر (اختیاری؛ مسیر داینامیک
 *               `/barber/[id]` بدون آن هم پاک می‌شود)
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
