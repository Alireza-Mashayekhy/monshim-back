import { InternalServerErrorException } from '@nestjs/common';

export const ACCESS_TOKEN_EXPIRES_IN = '6h' as const;
export const REFRESH_TOKEN_EXPIRES_IN = '30d' as const;

export const ACCESS_TOKEN_TTL_MS = 6 * 60 * 60 * 1000; // ۶ ساعت
export const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // ۳۰ روز

export function getAccessTokenSecret(): string {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret) {
    throw new InternalServerErrorException(
      'کلید JWT_ACCESS_SECRET در سرور تنظیم نشده است',
    );
  }
  return secret;
}

export function getRefreshTokenSecret(): string {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) {
    throw new InternalServerErrorException(
      'کلید JWT_REFRESH_SECRET در سرور تنظیم نشده است',
    );
  }
  return secret;
}
