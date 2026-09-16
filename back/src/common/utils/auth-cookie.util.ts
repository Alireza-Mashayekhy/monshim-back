/**
 * کوکیهای احراز هویت: یک نقطهٔ واحد برای نام و تنظیمات کوکیها،
 * تا هنگام پاککردن (logout) هم دقیقاً با همان تنظیمات پاک شوند.
 */
import type { CookieOptions, Request, Response } from 'express';

import {
  ACCESS_TOKEN_TTL_MS,
  REFRESH_TOKEN_TTL_MS,
} from '../config/jwt.config';

export const ACCESS_TOKEN_COOKIE = 'access_token';
export const REFRESH_TOKEN_COOKIE = 'refresh_token';

// در زمان فراخوانی خوانده میشود (نه هنگام import) تا NODE_ENV درست باشد
export function baseCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  };
}

export function setAuthCookies(
  response: Response,
  accessToken: string,
  refreshToken: string,
): void {
  response.cookie(ACCESS_TOKEN_COOKIE, accessToken, {
    ...baseCookieOptions(),
    maxAge: ACCESS_TOKEN_TTL_MS,
  });
  response.cookie(REFRESH_TOKEN_COOKIE, refreshToken, {
    ...baseCookieOptions(),
    maxAge: REFRESH_TOKEN_TTL_MS,
  });
}

/**
 * کوکیها با همان مسیر و همان تنظیمات امنیتی پاک میشوند،
 * در غیر این صورت مرورگر کوکی را حذف نمیکند.
 */
export function clearAuthCookies(response: Response): void {
  const options = baseCookieOptions();
  response.clearCookie(ACCESS_TOKEN_COOKIE, options);
  response.clearCookie(REFRESH_TOKEN_COOKIE, options);
}

export function extractAccessToken(request: Request): string | undefined {
  const cookieToken = request.cookies?.[ACCESS_TOKEN_COOKIE];
  if (cookieToken) {
    return cookieToken as string;
  }

  const header = request.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    return header.slice(7);
  }

  return undefined;
}

export function extractRefreshToken(request: Request): string | undefined {
  return request.cookies?.[REFRESH_TOKEN_COOKIE] as string | undefined;
}
