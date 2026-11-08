import { type BrowserContext, expect, type Page, test } from '@playwright/test';

const api = 'http://127.0.0.1:43101';
const crossHost = process.env.SESSION_E2E_CROSS_HOST === '1';
const cookieDomain = crossHost ? 'api.monshim.test' : '127.0.0.1';

type ApiEvent = { path: string; phase: string };

async function configure(data: Record<string, unknown>) {
  await fetch(`${api}/__test/config`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

async function events(): Promise<ApiEvent[]> {
  const response = await fetch(`${api}/__test/events`);
  return (await response.json()).data;
}

async function setCookies(
  context: BrowserContext,
  access: boolean,
  refresh: string | null,
) {
  const expires = Date.now() / 1000 + 29 * 24 * 60 * 60;
  await context.addCookies([
    ...(access
      ? [
          {
            name: 'access_token',
            value: 'valid',
            domain: cookieDomain,
            path: '/',
            httpOnly: true,
            sameSite: 'Lax' as const,
            expires,
          },
        ]
      : []),
    ...(refresh
      ? [
          {
            name: 'refresh_token',
            value: refresh,
            domain: cookieDomain,
            path: '/',
            httpOnly: true,
            sameSite: 'Lax' as const,
            expires,
          },
        ]
      : []),
  ]);
}

async function submitOtp(page: Page) {
  const requestCode = page.getByRole('button', { name: 'دریافت کد تأیید' });
  await expect(requestCode).toBeEnabled();
  await page.getByLabel('شماره موبایل', { exact: false }).fill('09121234567');
  await requestCode.click();
  const confirm = page.getByRole('button', { name: 'تأیید و ورود' });
  await expect(confirm).toBeVisible();
  await page.locator('input[data-slot="input-otp"]').fill('1111');
  await expect(confirm).toBeEnabled();
  await confirm.click();
}

test.beforeEach(async () => {
  await fetch(`${api}/__test/reset`, { method: 'POST' });
});

test.describe('same-origin cookie flow', () => {
  test.skip(crossHost, 'The cross-host scenario has a separate API origin.');

  test('the marketing login button restores a refresh-only provider session', async ({
    page,
    context,
  }) => {
    await setCookies(context, false, 'valid');
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.locator('header a[href="/login"]').first().click();
    await expect(page).toHaveURL(/\/dashboard(?:\?.*)?$/);
    await expect(page.getByText('نوبت‌های اخیر')).toBeVisible();
    const log = await events();
    expect(log.some(event => event.path === '/api/auth/refresh')).toBe(true);
    const cookies = await context.cookies();
    expect(
      cookies.find(cookie => cookie.name === 'access_token')?.httpOnly,
    ).toBe(true);
    const refresh = cookies.find(cookie => cookie.name === 'refresh_token');
    expect(refresh?.httpOnly).toBe(true);
    expect(refresh!.expires - Date.now() / 1000).toBeGreaterThan(
      29 * 24 * 60 * 60,
    );
  });

  test('a guest sees login; an invalid refresh does not loop back into the dashboard', async ({
    page,
    context,
  }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await expect(
      page.getByRole('button', { name: 'ورود به حساب کاربری' }),
    ).toBeVisible();
    expect(
      (await events()).filter(event => event.path === '/api/auth/refresh'),
    ).toHaveLength(0);
    await setCookies(context, false, 'invalid');
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(
      page.getByRole('button', { name: 'ورود به حساب کاربری' }),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test('a disabled user with an unexpired access token can reach login without a redirect loop', async ({
    page,
    context,
  }) => {
    await configure({ meStatus: 401, refreshStatus: 403 });
    await setCookies(context, true, 'valid');
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await expect(
      page.getByRole('button', { name: 'ورود به حساب کاربری' }),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
    expect(
      (await events()).some(event => event.path === '/api/auth/refresh'),
    ).toBe(true);
  });

  test('a temporary refresh failure preserves cookies and can be retried', async ({
    page,
    context,
  }) => {
    await configure({ refreshStatus: 503 });
    await setCookies(context, false, 'valid');
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await expect(
      page.getByText('سرور موقتاً در دسترس نیست', { exact: false }),
    ).toBeVisible();
    expect(
      (await context.cookies()).some(cookie => cookie.name === 'refresh_token'),
    ).toBe(true);
    await expect(page).toHaveURL(/\/login/);
    await configure({ refreshStatus: null });
    await page.getByRole('button', { name: 'تلاش مجدد' }).click();
    await expect(page).toHaveURL(/\/dashboard(?:\?.*)?$/);
  });

  test('a second 401 after successful refresh is an error, not a logout', async ({
    page,
    context,
  }) => {
    await configure({ meStatus: 401 });
    await setCookies(context, false, 'valid');
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await expect(
      page.getByText('تأیید نشست پس از تمدید انجام نشد', { exact: false }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'ورود به حساب کاربری' }),
    ).toHaveCount(0);
    expect(
      (await context.cookies()).some(cookie => cookie.name === 'refresh_token'),
    ).toBe(true);
  });

  test('OTP login creates a session and follows the safe callback', async ({
    page,
    context,
  }) => {
    await configure({ roles: ['user'] });
    await page.goto('/login-otp?callbackUrl=%2Fpanel%2Fprofile', {
      waitUntil: 'domcontentloaded',
    });
    await submitOtp(page);
    await expect(page).toHaveURL(/\/panel\/profile$/);
    const cookies = await context.cookies();
    expect(
      cookies.some(cookie => cookie.name === 'access_token' && cookie.httpOnly),
    ).toBe(true);
    expect(
      cookies.some(
        cookie => cookie.name === 'refresh_token' && cookie.httpOnly,
      ),
    ).toBe(true);
  });

  test('a new OTP user is sent to registration without a fake session', async ({
    page,
    context,
  }) => {
    await configure({ otpNewUser: true });
    await page.goto('/login-otp?callbackUrl=%2Fpanel%2Fprofile', {
      waitUntil: 'domcontentloaded',
    });
    await submitOtp(page);
    await expect
      .poll(async () =>
        (await events()).some(event => event.path === '/api/auth/login'),
      )
      .toBe(true);
    await expect(page).toHaveURL(/\/register\?/);
    const url = new URL(page.url());
    expect(url.searchParams.get('phone')).toBe('09121234567');
    expect(url.searchParams.get('callbackUrl')).toBe('/panel/profile');
    expect(
      (await context.cookies()).filter(cookie =>
        ['access_token', 'refresh_token'].includes(cookie.name),
      ),
    ).toHaveLength(0);
  });

  test('password login keeps a safe callback and updates another open tab', async ({
    page,
    context,
  }) => {
    await configure({ roles: ['user'] });
    const other = await context.newPage();
    await page.goto('/login?callbackUrl=%2Fpanel%2Fprofile', {
      waitUntil: 'domcontentloaded',
    });
    await other.goto('/login', { waitUntil: 'domcontentloaded' });
    await expect(
      other.getByRole('button', { name: 'ورود به حساب کاربری' }),
    ).toBeEnabled();
    await expect(
      page.getByRole('button', { name: 'ورود به حساب کاربری' }),
    ).toBeEnabled();
    await page.getByLabel('شماره موبایل', { exact: false }).fill('09121234567');
    await page.locator('input[name="password"]').fill('password123');
    await expect(page.getByLabel('شماره موبایل', { exact: false })).toHaveValue(
      '09121234567',
    );
    await expect(page.locator('input[name="password"]')).toHaveValue(
      'password123',
    );
    await page.getByRole('button', { name: 'ورود به حساب کاربری' }).click();
    await expect(page).toHaveURL(/\/panel\/profile$/);
    await expect(other).toHaveURL(/\/panel\/home$/);
    await other.close();
  });

  test('logout in one tab updates another tab and does not race an ongoing refresh', async ({
    browser,
  }) => {
    await configure({ roles: ['user'] });
    const context = await browser.newContext();
    const first = await context.newPage();
    const second = await context.newPage();
    try {
      await setCookies(context, true, 'valid');
      await first.goto('/panel/profile', { waitUntil: 'domcontentloaded' });
      await expect(
        first.getByRole('button', { name: 'خروج از حساب' }),
      ).toBeVisible();
      await configure({ refreshDelayMs: 1500 });
      await context.clearCookies({ name: 'access_token' });
      await second.goto('/login', { waitUntil: 'domcontentloaded' });
      await expect
        .poll(async () =>
          (await events()).some(
            event =>
              event.path === '/api/auth/refresh' && event.phase === 'start',
          ),
        )
        .toBe(true);
      await first.getByRole('button', { name: 'خروج از حساب' }).click();
      await expect(first).toHaveURL(/\/login/);
      await expect(second).toHaveURL(/\/login/);
      await expect(
        second.getByRole('button', { name: 'ورود به حساب کاربری' }),
      ).toBeVisible();
      const log = await events();
      const refreshEnd = log.findIndex(
        event => event.path === '/api/auth/refresh' && event.phase === 'end',
      );
      const logoutStart = log.findIndex(
        event => event.path === '/api/auth/logout',
      );
      expect(refreshEnd).toBeGreaterThanOrEqual(0);
      expect(logoutStart).toBeGreaterThan(refreshEnd);
      expect(
        (await context.cookies()).filter(cookie =>
          ['access_token', 'refresh_token'].includes(cookie.name),
        ),
      ).toHaveLength(0);
    } finally {
      await context.close();
    }
  });
});

test.describe('API on a different same-site host', () => {
  test.skip(!crossHost, 'Run with SESSION_E2E_CROSS_HOST=1.');

  test('host-only refresh cookie restores the session on login and private pages', async ({
    page,
    context,
  }) => {
    await configure({ roles: ['user'] });
    await setCookies(context, false, 'valid');
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/panel\/home(?:\?.*)?$/);
    expect(
      (await events()).some(event => event.path === '/api/auth/refresh'),
    ).toBe(true);
    await page.goto('/panel/profile', { waitUntil: 'domcontentloaded' });
    await expect(
      page.getByRole('button', { name: 'خروج از حساب' }),
    ).toBeVisible();
  });
});
