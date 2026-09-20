import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { UsersService } from 'src/users/users.service';

import { getAccessTokenSecret } from '../config/jwt.config';
import { extractAccessToken } from '../utils/auth-cookie.util';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    const token = extractAccessToken(request);

    if (!token) {
      throw new UnauthorizedException('توکن دسترسی ارسال نشده است');
    }

    let userId: number;
    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: getAccessTokenSecret(),
      });
      userId = Number(payload.id ?? payload.sub);
    } catch {
      throw new UnauthorizedException('توکن دسترسی نامعتبر یا منقضی شده است');
    }

    if (!Number.isInteger(userId) || userId <= 0) {
      throw new UnauthorizedException('توکن دسترسی نامعتبر است');
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
