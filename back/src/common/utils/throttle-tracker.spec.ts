import { JwtService, JwtSignOptions } from '@nestjs/jwt';

import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from './auth-cookie.util';
import {
  readUserIdFromToken,
  resolveRequestTracker,
  trackerFromIp,
} from './throttle-tracker.util';

const ACCESS_SECRET = 'test-access-secret';
const REFRESH_SECRET = 'test-refresh-secret';

/** بدون سکرت پیش‌فرض؛ مثل JwtServiceای که در گارد استفاده می‌شود. */
const jwtService = new JwtService({});

type ExpiresIn = NonNullable<JwtSignOptions['expiresIn']>;

function signAccess(payload: object, expiresIn: ExpiresIn = '6h') {
  return jwtService.signAsync(payload, { secret: ACCESS_SECRET, expiresIn });
}

function signRefresh(payload: object, expiresIn: ExpiresIn = '30d') {
  return jwtService.signAsync(payload, { secret: REFRESH_SECRET, expiresIn });
}

describe('throttle tracker (شمارش درخواست بر اساس کاربر به‌جای IP مشترک)', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.JWT_ACCESS_SECRET = ACCESS_SECRET;
    process.env.JWT_REFRESH_SECRET = REFRESH_SECRET;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('درخواستِ دارای توکن دسترسی را با شناسهٔ کاربر می‌شمارد', async () => {
    const token = await signAccess({ id: 7, roles: ['user'] });

    await expect(
      resolveRequestTracker(jwtService, {
        cookies: { [ACCESS_TOKEN_COOKIE]: token },
        ip: '10.0.0.1',
      }),
    ).resolves.toBe('user:7');
  });

  it('توکنِ منقضی هم همان کاربر را شناسایی می‌کند (لحظهٔ /auth/refresh)', async () => {
    // عدد = ثانیه؛ مقدار منفی یعنی همین حالا منقضی شده است
    const expired = await signAccess({ id: 7 }, -10);

    await expect(
      resolveRequestTracker(jwtService, {
        cookies: { [ACCESS_TOKEN_COOKIE]: expired },
        ip: '10.0.0.1',
      }),
    ).resolves.toBe('user:7');
  });

  it('وقتی فقط رفرش‌توکن موجود است، از روی آن کاربر را شناسایی می‌کند', async () => {
    const refreshToken = await signRefresh({ sub: 42 });

    await expect(
      resolveRequestTracker(jwtService, {
        cookies: { [REFRESH_TOKEN_COOKIE]: refreshToken },
        ip: '10.0.0.1',
      }),
    ).resolves.toBe('user:42');
  });

  it('هدر Authorization هم مثل کوکی در نظر گرفته می‌شود', async () => {
    const token = await signAccess({ id: 7 });

    await expect(
      resolveRequestTracker(jwtService, {
        headers: { authorization: `Bearer ${token}` },
        ip: '10.0.0.1',
      }),
    ).resolves.toBe('user:7');
  });

  it('درخواست بدون توکن با IP شمرده می‌شود (محافظت brute-force دست‌نخورده)', async () => {
    await expect(
      resolveRequestTracker(jwtService, { cookies: {}, ip: '10.0.0.1' }),
    ).resolves.toBe('ip:10.0.0.1');
    expect(trackerFromIp({ ips: ['1.1.1.1', '10.0.0.1'] })).toBe('ip:1.1.1.1');
    expect(trackerFromIp({})).toBe('ip:unknown');
  });

  it('توکنِ جعلی/با امضای اشتباه به سطل کاربر نمی‌رسد', async () => {
    const forged = await jwtService.signAsync(
      { id: 1 },
      { secret: 'attacker-secret' },
    );
    // توکنی که با سکرتِ access امضا شده ولی در کوکی refresh گذاشته شده است
    const wrongSecret = await signAccess({ id: 1 });

    await expect(
      resolveRequestTracker(jwtService, {
        cookies: {
          [ACCESS_TOKEN_COOKIE]: forged,
          [REFRESH_TOKEN_COOKIE]: wrongSecret,
        },
        ip: '10.0.0.9',
      }),
    ).resolves.toBe('ip:10.0.0.9');
  });

  it('payload بدون شناسهٔ معتبر نادیده گرفته می‌شود', async () => {
    const token = await signAccess({ phone: '09120000000' });

    await expect(
      resolveRequestTracker(jwtService, {
        cookies: { [ACCESS_TOKEN_COOKIE]: token },
        ip: '10.0.0.2',
      }),
    ).resolves.toBe('ip:10.0.0.2');
  });

  it('اگر سکرت‌ها در سرور تنظیم نشده باشند، خطا نمی‌دهد و به IP برمی‌گردد', async () => {
    delete process.env.JWT_ACCESS_SECRET;
    delete process.env.JWT_REFRESH_SECRET;
    const token = await jwtService.signAsync(
      { id: 7 },
      { secret: ACCESS_SECRET },
    );

    await expect(
      readUserIdFromToken(jwtService, token, 'access'),
    ).resolves.toBeNull();
    await expect(
      resolveRequestTracker(jwtService, {
        cookies: { [ACCESS_TOKEN_COOKIE]: token },
        ip: '10.0.0.3',
      }),
    ).resolves.toBe('ip:10.0.0.3');
  });
});
