import { jwtVerify } from 'jose';
import { NextRequest, NextResponse } from 'next/server';

import {
  buildAuthHref,
  canAccessPath,
  getAuthDestination,
  getRoleLandingPath,
  isAuthPagePath,
  isPublicAuthPath,
} from './lib/auth';
import { normalizeRoles } from './lib/roles';

/**
 * مسیرهای قدیمیِ «barber» → «provider».
 *
 * چرا ۳۰۱ و چرا اینجا؟
 * ---------------------
 * نامِ مسیرها عمومی شد تا بعداً بتوان شغل‌های دیگری غیر از آرایشگر هم اضافه
 * کرد. لینک‌های قدیمی در گوگل ایندکس شده‌اند، در پیامک/ربات بله/QR و صفحهٔ
 * اشتراک‌گذاری پخش شده‌اند و `sitemap` قبلی هم به آن‌ها اشاره می‌کرد؛ بدون
 * ریدایرکت، همهٔ آن‌ها ۴۰۴ (یا بدتر: ۳۰۷ به `/login`) می‌شدند و سئوی صفحهٔ
 * عمومی هر آرایشگر از بین می‌رفت.
 *
 * ریدایرکت عمداً در این لایه است و نه `redirects()` در `next.config`: آنجا با
 * `permanent: true` کد **۳۰۸** برمی‌گردد، ولی اینجا ۳۰۱ واقعی ارسال می‌شود و
 * query string هم عیناً حفظ می‌شود. همچنین چون **پیش از** منطقِ احراز هویت
 * اجرا می‌شود، مسیر خصوصیِ قدیمی (مثل `/panel/barber/42`) به‌جای پریدن به
 * صفحهٔ ورود، به مسیر جدید می‌رود و آنجا به‌صورت طبیعی بررسی می‌شود.
 *
 * نکته: `/barber-management` با قاعدهٔ `/barber` اشتباه گرفته نمی‌شود، چون
 * تطبیق فقط روی خودِ مسیر یا زیرمسیرِ آن (`/barber/...`) انجام می‌شود.
 */
const LEGACY_PATH_REDIRECTS = [
  { from: '/panel/barber', to: '/panel/provider' },
  { from: '/admin/barbers', to: '/admin/providers' },
  { from: '/barber-management', to: '/provider-management' },
  { from: '/online-barber-booking', to: '/online-provider-booking' },
  { from: '/barbaer-signup', to: '/provider-signup' },
  { from: '/barber', to: '/provider' },
] as const;

function legacyPathRedirect(request: NextRequest, pathname: string) {
  for (const { from, to } of LEGACY_PATH_REDIRECTS) {
    if (pathname !== from && !pathname.startsWith(`${from}/`)) continue;
    const url = request.nextUrl.clone();
    url.pathname = to + pathname.slice(from.length);
    return NextResponse.redirect(url, 301);
  }
  return null;
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  const legacyRedirect = legacyPathRedirect(request, pathname);
  if (legacyRedirect) return legacyRedirect;

  // Fast path: public pages (everything except the auth pages) are reachable by
  // everyone, so there is no need to read cookies or verify a JWT for them.
  // Skipping that work on every request lowers the TTFB of the marketing pages.
  // Auth pages are excluded here because a signed-in user must be redirected
  // away from them (handled below).
  if (isPublicAuthPath(pathname) && !isAuthPagePath(pathname)) {
    // Never trust a client-supplied identity header.
    const publicHeaders = new Headers(request.headers);
    publicHeaders.delete('X-User-Payload');
    return NextResponse.next({ request: { headers: publicHeaders } });
  }

  // Never trust a client-supplied identity header, including expired-token paths.
  const headers = new Headers(request.headers);
  headers.delete('X-User-Payload');
  const next = () => NextResponse.next({ request: { headers } });
  const token = request.cookies.get('access_token')?.value;
  const refreshToken = request.cookies.get('refresh_token')?.value;
  const secret = process.env.JWT_ACCESS_SECRET;

  let user: { roles: string[] } | null = null;
  if (token && secret) {
    try {
      const { payload } = await jwtVerify(
        token,
        new TextEncoder().encode(secret),
      );
      user = { roles: normalizeRoles(payload.roles) };
    } catch {
      // The client guard waits for /auth/me (and refresh) before rendering.
    }
  }

  // Keep auth pages public for guests, but don't show them to authenticated users.
  // A valid callback still wins; the role landing page is the default destination.
  if (user && isAuthPagePath(pathname)) {
    const destination = getAuthDestination(
      request.nextUrl.searchParams.get('callbackUrl'),
      getRoleLandingPath(user),
    );
    return NextResponse.redirect(new URL(destination, request.url));
  }

  // Public pages stay reachable with stale/invalid cookies. Only /auth/me on the
  // client decides whether to redirect; a refresh cookie is NOT authentication.
  if (isPublicAuthPath(pathname)) return next();
  if (!token && !refreshToken) {
    const callbackUrl = `${pathname}${request.nextUrl.search}`;
    const loginUrl = new URL(buildAuthHref('/login', callbackUrl), request.url);
    return NextResponse.redirect(loginUrl);
  }
  if (user && !canAccessPath(pathname, user)) {
    return NextResponse.redirect(
      new URL(getRoleLandingPath(user), request.url),
    );
  }
  return next();
}

export const config = {
  matcher: [
    // `monitoring` تونل Sentry است (rewrite در next.config)؛ اگر از proxy رد شود،
    // کاربر مهمان با ۳۰۷ به /login می‌رود و خطاهای سمت کلاینت گم می‌شوند.
    //
    // `/.well-known/*` هم عمداً از این لایه خارج است: این مسیرها استانداردِ
    // discovery هستند (ai-catalog.json، ard.json، security.txt و ...) و
    // ریدایرکت‌شدن‌شان به صفحهٔ لاگین باعث می‌شود ربات‌ها/ایجنت‌ها به‌جای «فایل
    // وجود ندارد» یک صفحهٔ HTML با کد ۳۰۷/۲۰۰ بگیرند — که همان چیزی است که
    // ممیزی «ai-catalog.json schema is valid» در PageSpeed را می‌شکند.
    // با خارج‌بودن از matcher، این درخواست‌ها طبیعی و بدون ریدایرکت ۴۰۴ می‌شوند.
    '/((?!api(?:/|$)|\\.well-known/|_next/|monitoring(?:/|$)|favicon.ico|robots.txt|sitemap.xml|manifest.webmanifest|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|woff2?|ttf|mov|mp4|txt)$).*)',
  ],
};
