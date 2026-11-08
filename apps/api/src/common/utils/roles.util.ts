/**
 * نرمالسازی نقشهای کاربر.
 * در دیتابیس ستون roles از نوع simple-array است و ممکن است
 * به صورت آرایه یا رشتهٔ جدا شده با کاما برگردد.
 */
import { Role } from '../enum/role.enum';

export function toRoleList(roles: unknown): string[] {
  if (Array.isArray(roles)) {
    return roles.map(role => String(role).trim()).filter(Boolean);
  }

  if (typeof roles === 'string') {
    return roles
      .split(',')
      .map(role => role.trim())
      .filter(Boolean);
  }

  return [];
}

export function hasRole(roles: unknown, role: Role): boolean {
  return toRoleList(roles).includes(role);
}

export function normalizeRoles(roles: unknown): Role[] {
  const valid = toRoleList(roles).filter((role): role is Role =>
    Object.values(Role).includes(role as Role),
  );

  return valid.length ? valid : [Role.User];
}
