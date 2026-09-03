import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { ROLES_KEY } from '../decorators/roles.decorator';
import { Role } from '../enum/role.enum';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles) {
      return true;
    }
    const { user } = context.switchToHttp().getRequest();
    if (!user) return false;

    const rawRoles = user.roles;
    const roles: string[] = Array.isArray(rawRoles)
      ? rawRoles.map((role: string) => String(role).trim())
      : typeof rawRoles === 'string'
        ? rawRoles.split(',').map(role => role.trim())
        : [];

    return requiredRoles.some(role => roles.includes(role));
  }
}
