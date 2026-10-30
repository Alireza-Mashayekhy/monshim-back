/**
 * تستِ منطقِ تازه‌سازی نشست.
 *
 * اجرا (بدون نیاز به jest/vitest؛ با type-stripping خودِ Node):
 *   node --test services/api/session-refresh.test.ts
 * یا:  pnpm test:session-refresh
 */
import assert from 'node:assert/strict';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import test, { afterEach } from 'node:test';

import axios from 'axios';

import {
  createSessionRefresher,
  errorStatus,
  isCanceledError,
  isSessionExpiredError,
  isTransientAuthError,
  REFRESH_RETRY_DELAYS_MS,
  resolveUnauthorizedOutcome,
} from './session-refresh.ts';

/** خطای axios-مانند با وضعیتِ مشخص. */
function httpError(status: number, message = `Request failed with ${status}`) {
  return Object.assign(new Error(message), {
    isAxiosError: true,
    response: { status, data: { message } },
  });
}

/** خطای بدون پاسخ (قطعی شبکه / timeout). */
function networkError(code = 'ERR_NETWORK') {
  return Object.assign(new Error('Network Error'), {
    isAxiosError: true,
    code,
  });
}

interface Harness {
  calls: number;
  delays: number[];
  expired: number;
  unrecoverable: unknown[];
}

/** refresher با sleep ساختگی تا تست‌ها میلی‌ثانیه‌ای تمام شوند. */
function makeRefresher(
  responder: (callIndex: number) => unknown,
): ReturnType<typeof createSessionRefresher> & { harness: Harness } {
  const harness: Harness = {
    calls: 0,
    delays: [],
    expired: 0,
    unrecoverable: [],
  };
  const refresher = createSessionRefresher(
    async () => {
      harness.calls += 1;
      await responder(harness.calls);
    },
    {
      onExpired: () => {
        harness.expired += 1;
      },
      onUnrecoverable: error => {
        harness.unrecoverable.push(error);
      },
      sleep: async ms => {
        harness.delays.push(ms);
      },
    },
  );
  return Object.assign(refresher, { harness });
}

/** سرور واقعی HTTP برای تست با axios (شکلِ واقعیِ خطاها). */
let server: http.Server | undefined;

afterEach(async () => {
  if (!server) return;
  await new Promise<void>(resolve => server?.close(() => resolve()));
  server = undefined;
});

async function startStub(responses: number[]) {
  let index = 0;
  server = http.createServer((_req, res) => {
    const status = responses[Math.min(index, responses.length - 1)];
    index += 1;
    res.statusCode = status;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ status, message: 'stub', data: null }));
  });
  await new Promise<void>(resolve => server?.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  return axios.create({ baseURL: `http://127.0.0.1:${port}` });
}

test('errorStatus: وضعیت از پاسخ، و undefined برای خطای شبکه', () => {
  assert.equal(errorStatus(httpError(429)), 429);
  assert.equal(errorStatus(networkError()), undefined);
  assert.equal(errorStatus(null), undefined);
  assert.equal(errorStatus(new Error('boom')), undefined);
});

test('فقط ۴۰۱ و ۴۰۳ انقضای نشست هستند', () => {
  assert.equal(isSessionExpiredError(httpError(401)), true);
  assert.equal(isSessionExpiredError(httpError(403)), true);
  for (const status of [400, 404, 408, 425, 429, 500, 502, 503, 504]) {
    assert.equal(
      isSessionExpiredError(httpError(status)),
      false,
      `status ${status} نباید انقضا حساب شود`,
    );
  }
  assert.equal(isSessionExpiredError(networkError()), false);
});

test('۴۲۹، ۴۰۸، ۵xx و خطای شبکه گذرا هستند؛ ۴۰۰/۴۰۴ نه', () => {
  for (const status of [408, 425, 429, 500, 502, 503]) {
    assert.equal(isTransientAuthError(httpError(status)), true);
  }
  assert.equal(isTransientAuthError(networkError()), true);
  assert.equal(isTransientAuthError(httpError(400)), false);
  assert.equal(isTransientAuthError(httpError(404)), false);
});

test('رفرش موفق: یک درخواست، بدون پاک‌سازی', async () => {
  const refresher = makeRefresher(() => undefined);

  const result = await refresher.refresh();

  assert.deepEqual(result, { ok: true, expired: false });
  assert.equal(refresher.harness.calls, 1);
  assert.equal(refresher.harness.expired, 0);
  assert.equal(refresher.harness.unrecoverable.length, 0);
  assert.equal(refresher.getInflight(), null);
});

test('۴۰۱ روی رفرش: فوراً انقضا، بدون تلاش مجدد', async () => {
  const refresher = makeRefresher(() => {
    throw httpError(401);
  });

  const result = await refresher.refresh();

  assert.equal(result.ok, false);
  assert.equal(result.expired, true);
  assert.equal(refresher.harness.calls, 1);
  assert.equal(refresher.harness.expired, 1);
  assert.equal(refresher.harness.delays.length, 0);
});

test('۴۰۳ روی رفرش (کاربر غیرفعال): انقضا، بدون تلاش مجدد', async () => {
  const refresher = makeRefresher(() => {
    throw httpError(403);
  });

  const result = await refresher.refresh();

  assert.equal(result.expired, true);
  assert.equal(refresher.harness.calls, 1);
  assert.equal(refresher.harness.expired, 1);
});

test('۴۲۹ (محدودیت نرخ): تلاش مجدد با فاصله، بدون لاگ‌اوت', async () => {
  const refresher = makeRefresher(() => {
    throw httpError(429);
  });

  const result = await refresher.refresh();

  assert.equal(result.ok, false);
  assert.equal(result.expired, false);
  assert.equal(refresher.harness.expired, 0, 'نباید نشست را منقضی کند');
  assert.equal(
    refresher.harness.calls,
    REFRESH_RETRY_DELAYS_MS.length + 1,
    'یک تلاش اولیه + تلاش‌های مجدد',
  );
  assert.deepEqual(refresher.harness.delays, [...REFRESH_RETRY_DELAYS_MS]);
  assert.equal(refresher.harness.unrecoverable.length, 1);
});

test('۵۰۰ و بعد موفقیت: نشست حفظ می‌شود', async () => {
  const refresher = makeRefresher(call => {
    if (call === 1) throw httpError(500);
  });

  const result = await refresher.refresh();

  assert.equal(result.ok, true);
  assert.equal(refresher.harness.calls, 2);
  assert.deepEqual(refresher.harness.delays, [REFRESH_RETRY_DELAYS_MS[0]]);
  assert.equal(refresher.harness.expired, 0);
  assert.equal(refresher.harness.unrecoverable.length, 0);
});

test('قطعی شبکه و بعد موفقیت: نشست حفظ می‌شود', async () => {
  const refresher = makeRefresher(call => {
    if (call <= 2) throw networkError();
  });

  const result = await refresher.refresh();

  assert.equal(result.ok, true);
  assert.equal(refresher.harness.calls, 3);
});

test('لغوِ درخواست: بدون تلاش مجدد و بدون اعلام انقضا', async () => {
  const canceled = Object.assign(new Error('canceled'), {
    isAxiosError: true,
    code: 'ERR_CANCELED',
  });
  assert.equal(isCanceledError(canceled), true);
  assert.equal(isTransientAuthError(canceled), false);

  const refresher = makeRefresher(() => {
    throw canceled;
  });

  const result = await refresher.refresh();

  assert.equal(result.ok, false);
  assert.equal(result.expired, false);
  assert.equal(refresher.harness.calls, 1);
  assert.equal(refresher.harness.expired, 0);
});

test('۴۰۰ (خطای غیرمنتظره): بدون تلاش مجدد و بدون اعلام انقضا', async () => {
  const refresher = makeRefresher(() => {
    throw httpError(400);
  });

  const result = await refresher.refresh();

  assert.equal(result.ok, false);
  assert.equal(result.expired, false);
  assert.equal(refresher.harness.calls, 1);
  assert.equal(refresher.harness.expired, 0);
  assert.equal(refresher.harness.unrecoverable.length, 1);
  assert.equal(errorStatus(result.error), 400);
});

test('درخواست‌های هم‌زمان فقط یک بار رفرش می‌زنند (single-flight)', async () => {
  let release: (() => void) | undefined;
  const gate = new Promise<void>(resolve => {
    release = resolve;
  });
  const refresher = makeRefresher(async () => {
    await gate;
  });

  const first = refresher.refresh();
  const second = refresher.refresh();
  assert.notEqual(
    refresher.getInflight(),
    null,
    'هنگام اجرا باید در جریان باشد',
  );
  release?.();
  const results = await Promise.all([first, second]);

  assert.equal(refresher.harness.calls, 1);
  assert.equal(results[0].ok, true);
  assert.deepEqual(results[1], results[0]);

  // بعد از پایان، درخواستِ تازهٔ بعدی واقعاً ارسال می‌شود
  await refresher.refresh();
  assert.equal(refresher.harness.calls, 2);
  assert.equal(refresher.getInflight(), null);
});

test('با axios واقعی: ۴۲۹ و بعد ۲۰۱ → نشست تازه می‌شود', async () => {
  const client = await startStub([429, 201]);
  const refresher = makeRefresher(() => client.post('/auth/refresh'));

  const result = await refresher.refresh();

  assert.equal(result.ok, true);
  assert.equal(result.expired, false);
  assert.equal(refresher.harness.expired, 0);
  assert.equal(refresher.harness.calls, 2);
});

test('با axios واقعی: ۴۲۹ پشت‌سرهم → انقضا اعلام نمی‌شود', async () => {
  const client = await startStub([429]);
  const refresher = makeRefresher(() => client.post('/auth/refresh'));

  const result = await refresher.refresh();

  assert.equal(result.ok, false);
  assert.equal(result.expired, false);
  assert.equal(refresher.harness.expired, 0);
  assert.equal(errorStatus(result.error), 429);
});

test('با axios واقعی: ۴۰۱ → انقضای نشست', async () => {
  const client = await startStub([401]);
  const refresher = makeRefresher(() => client.post('/auth/refresh'));

  const result = await refresher.refresh();

  assert.equal(result.expired, true);
  assert.equal(refresher.harness.expired, 1);
  assert.equal(refresher.harness.calls, 1, '۴۰۱ نباید دوباره تلاش شود');
});

test('تصمیمِ ۴۰۱: رفرش موفق → اجرای دوبارهٔ درخواست', () => {
  assert.deepEqual(
    resolveUnauthorizedOutcome({ ok: true, expired: false }, httpError(401)),
    { type: 'retry' },
  );
});

test('تصمیمِ ۴۰۱: انقضای واقعی → همان ۴۰۱ اصلی', () => {
  const original = httpError(401);
  const outcome = resolveUnauthorizedOutcome(
    { ok: false, expired: true, error: httpError(401) },
    original,
  );
  assert.equal(outcome.type, 'reject');
  assert.equal(
    outcome.type === 'reject' ? errorStatus(outcome.error) : null,
    401,
  );
});

test('تصمیمِ ۴۰۱: خطای گذرا (۴۲۹/۵xx/شبکه) → خطای رفرش، نه ۴۰۱', () => {
  const original = httpError(401);
  for (const failure of [httpError(429), httpError(503), networkError()]) {
    const outcome = resolveUnauthorizedOutcome(
      { ok: false, expired: false, error: failure },
      original,
    );
    assert.equal(outcome.type, 'reject');
    assert.equal(
      outcome.type === 'reject' ? outcome.error : null,
      failure,
      'نباید ۴۰۱ اصلی برگردانده شود (وگرنه کاربر لاگ‌اوت می‌شود)',
    );
  }
});
