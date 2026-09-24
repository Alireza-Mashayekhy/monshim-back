import { isAdmin, isBarber } from '@/lib/roles';

export const authKeys = { me: ['me'] as const };
export const SESSION_EXPIRED_EVENT = 'auth:session-expired';

export function isPathWithin(pathname: string, path: string) {
  return pathname === path || pathname.startsWith(`${path}/`);
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
