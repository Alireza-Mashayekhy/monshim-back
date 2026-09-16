import { jwtVerify } from 'jose';
import { NextRequest, NextResponse } from 'next/server';

import { canAccessPath, isPublicAuthPath } from './lib/auth';
import { normalizeRoles } from './lib/roles';

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
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

  // Public pages stay reachable with stale/invalid cookies. Only /auth/me on the
  // client decides whether to redirect; a refresh cookie is NOT authentication.
  if (isPublicAuthPath(pathname)) return next();
  if (!token && !refreshToken)
    return NextResponse.redirect(new URL('/', request.url));
  if (user && !canAccessPath(pathname, user)) {
    return NextResponse.redirect(new URL('/home', request.url));
  }
  return next();
}

export const config = {
  matcher: [
    '/((?!api(?:/|$)|_next/|favicon.ico|robots.txt|sitemap.xml|manifest.webmanifest|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|woff2?|ttf|mov|mp4|txt)$).*)',
  ],
};
