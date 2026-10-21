import type { Request } from 'express';

import {
  DEFAULT_FRONT_ORIGIN,
  getRequestOrigin,
  isLocalOrigin,
  normalizeOrigin,
  resolvePublicOrigin,
} from './public-url.util';

const buildRequest = (headers: Record<string, string>): Request =>
  ({
    headers,
    protocol: 'http',
    get: (name: string) => headers[name.toLowerCase()],
  }) as unknown as Request;

describe('normalizeOrigin', () => {
  it('مسیر و اسلش انتهایی را حذف می‌کند', () => {
    expect(normalizeOrigin('https://monshiim.ir/')).toBe('https://monshiim.ir');
    expect(normalizeOrigin('https://monshiim.ir/panel/')).toBe(
      'https://monshiim.ir',
    );
    expect(normalizeOrigin('https://monshiim.ir/api')).toBe(
      'https://monshiim.ir',
    );
    expect(normalizeOrigin('  https://monshiim.ir//?a=1  ')).toBe(
      'https://monshiim.ir',
    );
  });

  it('پورت را نگه می‌دارد', () => {
    expect(normalizeOrigin('http://localhost:3000/panel')).toBe(
      'http://localhost:3000',
    );
  });

  it('مقدار خالی یا نامعتبر را null می‌دهد', () => {
    expect(normalizeOrigin('')).toBeNull();
    expect(normalizeOrigin(undefined)).toBeNull();
    expect(normalizeOrigin('monshiim.ir')).toBeNull();
    expect(normalizeOrigin('ftp://monshiim.ir')).toBeNull();
  });
});

describe('isLocalOrigin', () => {
  it('میزبان‌های محلی را تشخیص می‌دهد', () => {
    expect(isLocalOrigin('http://localhost:3000')).toBe(true);
    expect(isLocalOrigin('http://127.0.0.1:4000')).toBe(true);
    expect(isLocalOrigin('https://monshiim.ir')).toBe(false);
  });
});

describe('resolvePublicOrigin', () => {
  it('مقدار درست env را ترجیح می‌دهد', () => {
    expect(
      resolvePublicOrigin({
        configured: 'https://monshiim.ir/',
        requestOrigin: 'https://api.monshiim.ir',
        fallback: DEFAULT_FRONT_ORIGIN,
        isProduction: true,
      }),
    ).toEqual({ origin: 'https://monshiim.ir', source: 'config' });
  });

  it('مسیر اضافه `/panel` در env را حذف می‌کند (باگ ریدایرکت تکراری)', () => {
    expect(
      resolvePublicOrigin({
        configured: 'https://monshiim.ir/panel',
        fallback: DEFAULT_FRONT_ORIGIN,
        isProduction: true,
      }),
    ).toEqual({ origin: 'https://monshiim.ir', source: 'config' });
  });

  it('در production به localhost ریدایرکت نمی‌کند و از origin درخواست استفاده می‌کند', () => {
    expect(
      resolvePublicOrigin({
        configured: 'http://localhost:3000',
        requestOrigin: 'https://monshiim.ir',
        fallback: DEFAULT_FRONT_ORIGIN,
        isProduction: true,
      }),
    ).toEqual({ origin: 'https://monshiim.ir', source: 'request' });
  });

  it('در توسعه، localhost معتبر است', () => {
    expect(
      resolvePublicOrigin({
        configured: 'http://localhost:3000',
        requestOrigin: 'http://localhost:4000',
        fallback: DEFAULT_FRONT_ORIGIN,
        isProduction: false,
      }),
    ).toEqual({ origin: 'http://localhost:3000', source: 'config' });
  });

  it('اگر env ست نشده باشد از origin درخواست استفاده می‌کند', () => {
    expect(
      resolvePublicOrigin({
        configured: undefined,
        requestOrigin: 'https://monshiim.ir',
        fallback: DEFAULT_FRONT_ORIGIN,
        isProduction: true,
      }),
    ).toEqual({ origin: 'https://monshiim.ir', source: 'request' });
  });

  it('بدون env و بدون درخواست، پیش‌فرض را برمی‌گرداند', () => {
    expect(
      resolvePublicOrigin({
        fallback: DEFAULT_FRONT_ORIGIN,
        isProduction: true,
      }),
    ).toEqual({ origin: DEFAULT_FRONT_ORIGIN, source: 'default' });
  });
});

describe('getRequestOrigin', () => {
  it('هدرهای پروکسی (nginx) را ترجیح می‌دهد', () => {
    expect(
      getRequestOrigin(
        buildRequest({
          'x-forwarded-proto': 'https',
          'x-forwarded-host': 'monshiim.ir',
          host: '127.0.0.1:3000',
        }),
      ),
    ).toBe('https://monshiim.ir');
  });

  it('لیست هدرهای پروکسی را به اولین مقدار محدود می‌کند', () => {
    expect(
      getRequestOrigin(
        buildRequest({
          'x-forwarded-proto': 'https, http',
          'x-forwarded-host': 'monshiim.ir, 127.0.0.1',
        }),
      ),
    ).toBe('https://monshiim.ir');
  });

  it('بدون هدر پروکسی از host و پروتکل درخواست استفاده می‌کند', () => {
    expect(getRequestOrigin(buildRequest({ host: 'localhost:4000' }))).toBe(
      'http://localhost:4000',
    );
  });

  it('درخواست خالی را مدیریت می‌کند', () => {
    expect(getRequestOrigin(null)).toBeNull();
    expect(getRequestOrigin(undefined)).toBeNull();
    expect(getRequestOrigin(buildRequest({}))).toBeNull();
  });
});
