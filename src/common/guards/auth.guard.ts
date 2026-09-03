import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { UsersService } from 'src/users/users.service';

import { jwtConstants } from '../constants/constants';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('Access token not found');
    }

    try {
      const secret = process.env.JWT_ACCESS_SECRET || jwtConstants.secret;
      const payload = await this.jwtService.verifyAsync(token, { secret });
      const userId = Number(payload.id ?? payload.sub);

      if (!Number.isInteger(userId)) {
        throw new UnauthorizedException('Invalid token');
      }

      const user = await this.usersService.findOne(userId);

      if (!user || !user.isActive) {
        throw new UnauthorizedException('Invalid token');
      }

      request['user'] = {
        id: user.id,
        fullName: user.fullName,
        phone: user.phone,
        email: user.email,
        roles: user.roles,
        isActive: user.isActive,
      };

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid token');
    }
  }

  private extractToken(request: Request): string | undefined {
    const cookieToken = request.cookies?.access_token;
    if (cookieToken) {
      return cookieToken;
    }

    const header = request.headers.authorization;
    if (header?.startsWith('Bearer ')) {
      return header.slice(7);
    }

    return undefined;
  }
}
