'use server';

import { jwtVerify } from 'jose';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';

import { validatePublicPageSlug } from '@/lib/public-page-slug';
import { isBarber, normalizeRoles } from '@/lib/roles';

/**
 * پس از خرید موفق پکیج یا ثبت/تغییر اسلاگ، صفحهٔ عمومی آرایشگر باید بلافاصله
 * در دسترس باشد؛ در غیر این صورت تا پایان زمان `revalidate` مسیر، کاربر ۴۰۴
 * یا نسخهٔ قبلی را می‌بیند.
 *
 * این Server Action فقط برای آرایشگرِ لاگین‌کرده اجرا می‌شود و اسلاگ‌های ورودی
 * قبل از `revalidatePath` اعتبارسنجی می‌شوند تا مسیر دلخواه پاک نشود.
 */
export async function revalidateMyPublicBarberPage(
  slugs?: Array<string | null | undefined>,
) {
  const token = (await cookies()).get('access_token')?.value;
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!token || !secret) return;

  try {
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(secret),
    );
    const roles = normalizeRoles(payload.roles);
    const userId = Number(payload.id ?? payload.sub);

    if (!Number.isInteger(userId) || userId <= 0) return;
    if (!isBarber({ roles })) return;

    revalidatePath(`/barber/${userId}`);
    revalidatePath('/sitemap.xml');

    if (Array.isArray(slugs)) {
      for (const candidate of slugs) {
        if (!candidate) continue;
        const checked = validatePublicPageSlug(candidate);
        if (checked.valid) {
          revalidatePath(`/barber/${checked.slug}`);
        }
      }
    }
  } catch {
    // توکن نامعتبر/منقضی: کاری انجام نمی‌دهیم؛ کش بعد از revalidate خودکار
    // به‌روز می‌شود.
  }
}
