'use server';

import { jwtVerify } from 'jose';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';

import { isBarber, normalizeRoles } from '@/lib/roles';

/**
 * پس از خرید موفق پکیج، صفحهٔ عمومی آرایشگر باید بلافاصله در دسترس باشد؛
 * در غیر این صورت تا پایان زمان `revalidate` همان مسیر، کاربر ۴۰۴ می‌بیند.
 *
 * این Server Action فقط مسیرِ صفحهٔ عمومیِ **خودِ آرایشگرِ لاگین‌کرده** را
 * revalidate می‌کند (شناسه از توکن گرفته می‌شود، نه از ورودی کاربر) تا کسی
 * نتواند کشِ صفحهٔ سالنِ دیگری را پاک کند یا به‌صورت ناشناس درخواست بزند.
 */
export async function revalidateMyPublicBarberPage() {
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
  } catch {
    // توکن نامعتبر/منقضی: کاری انجام نمی‌دهیم؛ کش بعد از revalidate خودکار
    // به‌روز می‌شود.
  }
}
