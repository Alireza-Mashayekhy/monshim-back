import { isAdmin, isBarber } from '@/lib/roles';

export const authKeys = { me: ['me'] as const };
export const SESSION_EXPIRED_EVENT = 'auth:session-expired';

const CALLBACK_URL_BASE = 'https://monshim.invalid';
const AUTH_PAGE_PATHS = [
  '/login',
  '/login-otp',
  '/register',
  '/barbaer-signup',
];

export type CallbackUrlValue = string | string[] | null | undefined;

export function isPathWithin(pathname: string, path: string) {
  return pathname === path || pathname.startsWith(`${path}/`);
}

export function sanitizeCallbackUrl(value: CallbackUrlValue): string | null {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (
    typeof candidate !== 'string' ||
    !candidate.startsWith('/') ||
    candidate.startsWith('//') ||
    candidate.includes('\\')
  ) {
    return null;
  }

  try {
    const url = new URL(candidate, CALLBACK_URL_BASE);
    if (
      url.origin !== CALLBACK_URL_BASE ||
      AUTH_PAGE_PATHS.some(path => isPathWithin(url.pathname, path))
    ) {
      return null;
    }

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}

export function getAuthDestination(
  callbackUrl: CallbackUrlValue,
  fallback = '/home',
) {
  return sanitizeCallbackUrl(callbackUrl) ?? fallback;
}

/** Build an auth-page link while keeping its callback and any extra parameters. */
export function buildAuthHref(
  pathname: string,
  callbackUrl?: CallbackUrlValue,
  params: Record<string, string | undefined> = {},
) {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) searchParams.set(key, value);
  }

  const safeCallbackUrl = sanitizeCallbackUrl(callbackUrl);
  if (safeCallbackUrl) searchParams.set('callbackUrl', safeCallbackUrl);

  const query = searchParams.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function isPublicAuthPath(pathname: string) {
  return (
    pathname === '/' ||
    isPathWithin(pathname, '/login') ||
    isPathWithin(pathname, '/login-otp') ||
    isPathWithin(pathname, '/register') ||
    isPathWithin(pathname, '/barbaer-signup') ||
    // صفحات لندینگ عمومی (سئو) — باید برای مهمان‌ها و موتورهای جست‌وجو آزاد باشند
    isPathWithin(pathname, '/barber-management') ||
    isPathWithin(pathname, '/online-barber-booking') ||
    isPathWithin(pathname, '/pricing')
  );
}

export function canAccessPath(pathname: string, user: unknown) {
  if (isPathWithin(pathname, '/admin')) return isAdmin(user);
  if (isPathWithin(pathname, '/dashboard')) return isBarber(user);
  return true;
}
