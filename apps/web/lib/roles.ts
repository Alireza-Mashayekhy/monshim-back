import type { UserResponse } from '@/services/features/auth/types';

/**
 * کاربر ممکن است از جاهای مختلفی برسد:
 * - پاسخ /auth/me (تک‌کاربر یا آرایه)
 * - payload هدر middleware
 * - کش react-query
 * این تابع همهٔ حالت‌ها را به یک شیء یکسان تبدیل می‌کند.
 */
export type MaybeUser =
  | UserResponse
  | UserResponse[]
  | { data?: unknown }
  | null
  | undefined;

/** استخراج اولین کاربر از پاسخ (آرایه، بسته‌ی پاسخ یا خود کاربر) */
export function extractUser(payload: MaybeUser | unknown): UserResponse | null {
  if (!payload || typeof payload !== 'object') return null;

  if (Array.isArray(payload)) {
    return extractUser(payload[0]);
  }

  const value = payload as Record<string, unknown>;

  // بسته‌ی استاندارد پاسخ { status, message, data }
  if (value.data && typeof value.data === 'object') {
    return extractUser(value.data);
  }

  if (!('id' in value) && !('roles' in value) && !('phone' in value)) {
    return null;
  }

  return {
    ...(value as unknown as UserResponse),
    roles: normalizeRoles(value.roles),
  };
}

/**
 * نرمال‌سازی نقش‌ها به آرایه‌ای از رشته‌های کوچک:
 * پشتیبانی از 'barber' | 'admin,barber' | ['barber'] | [{ name: 'barber' }]
 */
export function normalizeRoles(input: unknown): string[] {
  if (!input) return [];

  const items: unknown[] = Array.isArray(input)
    ? input
    : typeof input === 'string'
      ? input.split(',')
      : [input];

  return items
    .flatMap(item => {
      if (!item) return [];
      if (typeof item === 'string') return item.split(',');
      if (typeof item === 'object' && 'name' in item) {
        const name = (item as { name: unknown }).name;
        return typeof name === 'string' ? name.split(',') : [];
      }
      return [];
    })
    .map(role => role.toLowerCase().trim())
    .filter(Boolean);
}

/** نقش‌های کاربر (بدون نیاز به دانستن نوع ورودی) */
export const rolesOf = (user: MaybeUser | unknown): string[] =>
  normalizeRoles((extractUser(user) as UserResponse | null)?.roles);

export const hasRole = (user: MaybeUser | unknown, role: string): boolean =>
  rolesOf(user).includes(role.toLowerCase().trim());

export const isBarber = (user: MaybeUser | unknown): boolean =>
  hasRole(user, 'barber');

export const isAdmin = (user: MaybeUser | unknown): boolean =>
  hasRole(user, 'admin') || hasRole(user, 'editor');
