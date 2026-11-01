import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import {
  isSessionId,
  SessionRevocationService,
} from 'src/redis/session-revocation.service';
import { UsersService } from 'src/users/users.service';

import { getAccessTokenSecret } from '../config/jwt.config';
import { extractAccessToken } from '../utils/auth-cookie.util';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
    private readonly sessionRevocations: SessionRevocationService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    const token = extractAccessToken(request);

    if (!token) {
      throw new UnauthorizedException('توکن دسترسی ارسال نشده است');
    }

    // Misconfiguration is a server error, not proof that the user is logged out.
    const accessSecret = getAccessTokenSecret();
    let userId: number;
    let sessionId: unknown;
    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: accessSecret,
      });
      // Refresh tokens contain `sub`, not `id`; never accept one as access.
      userId = Number(payload.id);
      sessionId = payload.sid;
    } catch {
      throw new UnauthorizedException('توکن دسترسی نامعتبر یا منقضی شده است');
    }

    if (
      !Number.isInteger(userId) ||
      userId <= 0 ||
      (sessionId !== undefined && !isSessionId(sessionId))
    ) {
      throw new UnauthorizedException('توکن دسترسی نامعتبر است');
    }
    // Legacy access tokens have no sid and continue until their 6h expiry.
    if (
      isSessionId(sessionId) &&
      (await this.sessionRevocations.isSessionRevoked(sessionId))
    ) {
      throw new UnauthorizedException('نشست شما پایان یافته است');
    }

    const user = await this.usersService.findOne(userId);

    if (!user) {
      throw new UnauthorizedException('کاربر یافت نشد');
    }

    if (!user.isActive) {
      throw new UnauthorizedException(
        'حساب کاربری شما غیرفعال است. با پشتیبانی تماس بگیرید',
      );
    }

    request['user'] = {
      id: user.id,
      fullName: user.fullName,
      phone: user.phone,
      email: user.email,
      gender: user.gender ?? null,
      roles: user.roles,
      isActive: user.isActive,
    };

    return true;
  }
}
