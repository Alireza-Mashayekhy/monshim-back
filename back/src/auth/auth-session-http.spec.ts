import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import { BarberService } from 'src/barber/barber.service';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { ResponseInterceptor } from 'src/common/interceptors/response.interceptor';
import { FilesService } from 'src/files/files.service';
import { OtpService } from 'src/otp/otp.service';
import { RedisModule } from 'src/redis/redis.module';
import { RedisService } from 'src/redis/redis.service';
import { ReferralService } from 'src/referral/referral.service';
import { ServicesService } from 'src/services/services.service';
import { UsersService } from 'src/users/users.service';
import request from 'supertest';
import { DataSource } from 'typeorm';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

const ACCESS_SECRET = 'test-access-secret';
const REFRESH_SECRET = 'test-refresh-secret';
const DAY_SECONDS = 24 * 60 * 60;

function cookiesFrom(response: request.Response) {
  return (response.headers['set-cookie'] ?? []) as unknown as string[];
}

function cookieValue(response: request.Response, name: string): string {
  const cookie = cookiesFrom(response).find(value =>
    value.startsWith(`${name}=`),
  );
  if (!cookie) throw new Error(`Missing cookie ${name}`);
  return decodeURIComponent(cookie.slice(name.length + 1).split(';')[0]);
}

function cookieHeader(name: string, value: string) {
  return `${name}=${encodeURIComponent(value)}`;
}

describe('authentication session over HTTP', () => {
  let app: INestApplication;
  let jwt: JwtService;
  let redisDown = false;
  const redisValues = new Map<string, string>();
  const redis = {
    isReady: true,
    get: jest.fn((key: string) => {
      if (redisDown) return Promise.reject(new Error('Redis unavailable'));
      return Promise.resolve(redisValues.get(key) ?? null);
    }),
    set: jest.fn((key: string, value: string) => {
      if (redisDown) return Promise.reject(new Error('Redis unavailable'));
      redisValues.set(key, value);
      return Promise.resolve('OK');
    }),
  };
  const user = {
    id: 42,
    fullName: 'کاربر آزمایشی',
    phone: '09121234567',
    roles: ['user', 'barber'],
    isActive: true,
  };
  const users = {
    findWithPhone: jest.fn().mockResolvedValue(user),
    findOne: jest.fn().mockResolvedValue(user),
  };
  const originalAccessSecret = process.env.JWT_ACCESS_SECRET;
  const originalRefreshSecret = process.env.JWT_REFRESH_SECRET;

  beforeAll(async () => {
    process.env.JWT_ACCESS_SECRET = ACCESS_SECRET;
    process.env.JWT_REFRESH_SECRET = REFRESH_SECRET;
    const module = await Test.createTestingModule({
      // Exercise the real global module export and constructor injection. The
      // Redis connection and unrelated user/database services remain isolated.
      imports: [RedisModule],
      controllers: [AuthController],
      providers: [
        AuthService,
        AuthGuard,
        JwtService,
        { provide: UsersService, useValue: users },
        {
          provide: OtpService,
          useValue: { verifyOtp: jest.fn().mockResolvedValue(true) },
        },
        { provide: BarberService, useValue: {} },
        { provide: ServicesService, useValue: {} },
        { provide: ReferralService, useValue: {} },
        { provide: DataSource, useValue: {} },
        { provide: FilesService, useValue: {} },
      ],
    })
      .overrideProvider(RedisService)
      .useValue({ getClient: () => redis })
      .compile();
    jwt = module.get(JwtService);
    app = module.createNestApplication();
    app.setGlobalPrefix('api');
    app.use(cookieParser());
    app.useGlobalInterceptors(new ResponseInterceptor());
    await app.init();
  });

  beforeEach(() => {
    redisValues.clear();
    redisDown = false;
    redis.isReady = true;
    redis.get.mockClear();
    redis.set.mockClear();
    user.isActive = true;
    process.env.JWT_ACCESS_SECRET = ACCESS_SECRET;
    process.env.JWT_REFRESH_SECRET = REFRESH_SECRET;
  });

  afterAll(async () => {
    await app.close();
    if (originalAccessSecret === undefined)
      delete process.env.JWT_ACCESS_SECRET;
    else process.env.JWT_ACCESS_SECRET = originalAccessSecret;
    if (originalRefreshSecret === undefined)
      delete process.env.JWT_REFRESH_SECRET;
    else process.env.JWT_REFRESH_SECRET = originalRefreshSecret;
  });

  async function login() {
    const response = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ phone: user.phone, code: '1111' })
      .expect(201);
    return {
      response,
      access: cookieValue(response, 'access_token'),
      refresh: cookieValue(response, 'refresh_token'),
    };
  }

  it('issues HttpOnly cookies and JWTs for 6 hours and 30 days', async () => {
    const { response, access, refresh } = await login();
    const accessHeader = cookiesFrom(response).find(c =>
      c.startsWith('access_token='),
    )!;
    const refreshHeader = cookiesFrom(response).find(c =>
      c.startsWith('refresh_token='),
    )!;
    for (const header of [accessHeader, refreshHeader]) {
      expect(header).toContain('HttpOnly');
      expect(header).toContain('SameSite=Lax');
      expect(header).toContain('Path=/');
    }
    expect(accessHeader).toContain('Max-Age=21600');
    expect(refreshHeader).toContain('Max-Age=2592000');

    const accessPayload = await jwt.verifyAsync<any>(access, {
      secret: ACCESS_SECRET,
    });
    const refreshPayload = await jwt.verifyAsync<any>(refresh, {
      secret: REFRESH_SECRET,
    });
    expect(accessPayload.exp - accessPayload.iat).toBe(6 * 60 * 60);
    expect(refreshPayload.exp - refreshPayload.iat).toBe(30 * DAY_SECONDS);
    expect(refreshPayload.sid).toBe(accessPayload.sid);
    expect(refreshPayload.sub).toBe(user.id);
    await expect(
      jwt.verifyAsync(refresh, {
        secret: REFRESH_SECRET,
        clockTimestamp: refreshPayload.iat + 29 * DAY_SECONDS,
      }),
    ).resolves.toBeDefined();
    await expect(
      jwt.verifyAsync(refresh, {
        secret: REFRESH_SECRET,
        clockTimestamp: refreshPayload.iat + 30 * DAY_SECONDS,
      }),
    ).rejects.toThrow();
    await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Cookie', cookieHeader('access_token', access))
      .expect(200);
  });

  it('recovers an expired access token and renews the 30-day window', async () => {
    const { refresh } = await login();
    const original = jwt.decode(refresh);
    const expiredAccess = await jwt.signAsync(
      { id: user.id, sid: original.sid },
      { secret: ACCESS_SECRET, expiresIn: -1 },
    );
    await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Cookie', cookieHeader('access_token', expiredAccess))
      .expect(401);

    const now = Date.now();
    const clock = jest
      .spyOn(Date, 'now')
      .mockReturnValue(now + 29 * DAY_SECONDS * 1000);
    try {
      const renewed = await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .set('Cookie', cookieHeader('refresh_token', refresh))
        .expect(201);
      const newAccess = cookieValue(renewed, 'access_token');
      const newRefresh = cookieValue(renewed, 'refresh_token');
      const payload = jwt.decode(newRefresh);
      expect(payload.sid).toBe(original.sid);
      expect(payload.iat - original.iat).toBe(29 * DAY_SECONDS);
      expect(payload.exp - payload.iat).toBe(30 * DAY_SECONDS);
      await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Cookie', cookieHeader('access_token', newAccess))
        .expect(200);
    } finally {
      clock.mockRestore();
    }
  });

  it('rejects a refresh token after 30 days of inactivity', async () => {
    const { refresh } = await login();
    const clock = jest
      .spyOn(Date, 'now')
      .mockReturnValue(Date.now() + 30 * DAY_SECONDS * 1000 + 1000);
    try {
      const response = await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .set('Cookie', cookieHeader('refresh_token', refresh))
        .expect(401);
      expect(cookiesFrom(response)).toHaveLength(0);
    } finally {
      clock.mockRestore();
    }
  });

  it('does not clear cookies for missing, invalid, expired, or disabled sessions', async () => {
    const missing = await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .expect(401);
    expect(cookiesFrom(missing)).toHaveLength(0);
    const invalid = await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .set('Cookie', cookieHeader('refresh_token', 'broken'))
      .expect(401);
    expect(cookiesFrom(invalid)).toHaveLength(0);
    const expired = await jwt.signAsync(
      { sub: user.id },
      { secret: REFRESH_SECRET, expiresIn: -1 },
    );
    const expiry = await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .set('Cookie', cookieHeader('refresh_token', expired))
      .expect(401);
    expect(cookiesFrom(expiry)).toHaveLength(0);
    const { refresh } = await login();
    user.isActive = false;
    const disabled = await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .set('Cookie', cookieHeader('refresh_token', refresh))
      .expect(403);
    expect(cookiesFrom(disabled)).toHaveLength(0);
  });

  it('treats missing secrets and Redis failures as server errors, not logout', async () => {
    const { access, refresh } = await login();
    delete process.env.JWT_REFRESH_SECRET;
    const refreshMisconfigured = await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .set('Cookie', cookieHeader('refresh_token', refresh))
      .expect(500);
    expect(cookiesFrom(refreshMisconfigured)).toHaveLength(0);
    process.env.JWT_REFRESH_SECRET = REFRESH_SECRET;
    delete process.env.JWT_ACCESS_SECRET;
    await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Cookie', cookieHeader('access_token', access))
      .expect(500);
    process.env.JWT_ACCESS_SECRET = ACCESS_SECRET;
    redisDown = true;
    await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Cookie', cookieHeader('access_token', access))
      .expect(500);
    const refreshUnavailable = await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .set('Cookie', cookieHeader('refresh_token', refresh))
      .expect(500);
    expect(cookiesFrom(refreshUnavailable)).toHaveLength(0);
    const logoutUnavailable = await request(app.getHttpServer())
      .post('/api/auth/logout')
      .set('Cookie', cookieHeader('refresh_token', refresh))
      .expect(500);
    expect(cookiesFrom(logoutUnavailable)).toHaveLength(0);
  });

  it('fails closed without queuing commands while Redis is reconnecting', async () => {
    const { access, refresh } = await login();
    redis.isReady = false;
    redis.get.mockClear();
    redis.set.mockClear();

    await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Cookie', cookieHeader('access_token', access))
      .expect(503);
    for (const endpoint of ['/api/auth/refresh', '/api/auth/logout']) {
      const response = await request(app.getHttpServer())
        .post(endpoint)
        .set('Cookie', cookieHeader('refresh_token', refresh))
        .expect(503);
      expect(cookiesFrom(response)).toHaveLength(0);
    }
    expect(redis.get).not.toHaveBeenCalled();
    expect(redis.set).not.toHaveBeenCalled();

    redis.isReady = true;
    await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Cookie', cookieHeader('access_token', access))
      .expect(200);
  });

  it('revokes all tokens for only the logged-out session, including older refreshes', async () => {
    const first = await login();
    const second = await login();
    const firstPayload = jwt.decode(first.refresh);
    const olderRefresh = await jwt.signAsync(
      {
        sub: user.id,
        sid: firstPayload.sid,
        iat: Math.floor(Date.now() / 1000) - 3600,
      },
      { secret: REFRESH_SECRET, expiresIn: '30d' },
    );
    const logout = await request(app.getHttpServer())
      .post('/api/auth/logout')
      .set('Cookie', cookieHeader('refresh_token', first.refresh))
      .expect(201);
    expect(cookiesFrom(logout)).toHaveLength(2);
    expect(
      cookiesFrom(logout).every(c => c.includes('Expires=Thu, 01 Jan 1970')),
    ).toBe(true);
    expect(redis.set).toHaveBeenCalledWith(
      expect.stringContaining(firstPayload.sid),
      '1',
      { EX: 31 * DAY_SECONDS },
    );
    await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Cookie', cookieHeader('access_token', first.access))
      .expect(401);
    for (const token of [first.refresh, olderRefresh]) {
      const rejected = await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .set('Cookie', cookieHeader('refresh_token', token))
        .expect(401);
      expect(cookiesFrom(rejected)).toHaveLength(0);
    }
    await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Cookie', cookieHeader('access_token', second.access))
      .expect(200);
    await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .set('Cookie', cookieHeader('refresh_token', second.refresh))
      .expect(201);
  });

  it('allows concurrent refreshes but revokes every result when that session logs out', async () => {
    const { refresh } = await login();
    const attempts = await Promise.all(
      [1, 2, 3].map(() =>
        request(app.getHttpServer())
          .post('/api/auth/refresh')
          .set('Cookie', cookieHeader('refresh_token', refresh))
          .expect(201),
      ),
    );
    const issued = attempts.map(response =>
      cookieValue(response, 'refresh_token'),
    );
    const originalSid = jwt.decode(refresh).sid;
    for (const token of issued) {
      expect(jwt.decode(token).sid).toBe(originalSid);
    }
    await request(app.getHttpServer())
      .post('/api/auth/logout')
      .set('Cookie', cookieHeader('refresh_token', issued[0]))
      .expect(201);
    for (const token of [refresh, ...issued]) {
      await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .set('Cookie', cookieHeader('refresh_token', token))
        .expect(401);
    }
  });

  it('revokes a session on logout even when only the access token is available', async () => {
    const { access, refresh } = await login();
    await request(app.getHttpServer())
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${access}`)
      .expect(201);
    await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Cookie', cookieHeader('access_token', access))
      .expect(401);
    await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .set('Cookie', cookieHeader('refresh_token', refresh))
      .expect(401);
  });

  it('accepts and upgrades existing pre-deployment tokens without logging users out', async () => {
    const legacyAccess = await jwt.signAsync(
      { id: user.id },
      { secret: ACCESS_SECRET, expiresIn: '6h' },
    );
    const legacyRefresh = await jwt.signAsync(
      { sub: user.id },
      { secret: REFRESH_SECRET, expiresIn: '30d' },
    );
    await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Cookie', cookieHeader('access_token', legacyAccess))
      .expect(200);
    const upgraded = await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .set('Cookie', cookieHeader('refresh_token', legacyRefresh))
      .expect(201);
    const payload = jwt.decode(cookieValue(upgraded, 'refresh_token'));
    expect(payload.sid).toMatch(/^[0-9a-f-]{36}$/);
    await request(app.getHttpServer())
      .post('/api/auth/logout')
      .set('Cookie', cookieHeader('refresh_token', legacyRefresh))
      .expect(201);
    await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .set('Cookie', cookieHeader('refresh_token', legacyRefresh))
      .expect(401);
  });

  it('never accepts a refresh token as an access token, even with matching secrets', async () => {
    process.env.JWT_ACCESS_SECRET = REFRESH_SECRET;
    const { refresh } = await login();
    await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Cookie', cookieHeader('access_token', refresh))
      .expect(401);
  });
});
