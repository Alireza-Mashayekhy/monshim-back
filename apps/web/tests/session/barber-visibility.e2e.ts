import { type BrowserContext, expect, type Page, test } from '@playwright/test';

const mockBase = 'http://127.0.0.1:43101';
const crossHost = process.env.SESSION_E2E_CROSS_HOST === '1';
const cookieBase = crossHost
  ? 'http://api.monshim.test:43101'
  : 'http://127.0.0.1:43100';

type Event = { path: string; phase: string; body?: Record<string, unknown> };

async function reset(options: Record<string, unknown>) {
  await fetch(`${mockBase}/__test/reset`, { method: 'POST' });
  const response = await fetch(`${mockBase}/__test/config`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(options),
  });
  expect(response.ok).toBe(true);
}

async function events(): Promise<Event[]> {
  const response = await fetch(`${mockBase}/__test/events`);
  return ((await response.json()) as { data: Event[] }).data;
}

async function signIn(context: BrowserContext) {
  await context.addCookies([
    { name: 'access_token', value: 'valid', url: cookieBase },
    { name: 'refresh_token', value: 'valid', url: cookieBase },
  ]);
}

async function openManagement(page: Page) {
  await page.goto('/admin/providers');
  await expect(
    page.getByRole('heading', { name: 'مدیریت آرایشگرها' }),
  ).toBeVisible();
  const row = page.getByRole('row').filter({ hasText: 'سالن آزمایشی' });
  await expect(row).toBeVisible();
  return row;
}

test('admin hides and re-enables display without suggesting account login is blocked', async ({
  page,
  context,
}) => {
  await reset({ roles: ['admin'] });
  await signIn(context);
  const row = await openManagement(page);

  await row.getByRole('button', { name: 'غیرفعال', exact: true }).click();
  const dialog = page.getByRole('alertdialog');
  await expect(dialog).toContainText('ورود به حساب');
  await expect(dialog).toContainText('تغییری نمی‌کنند');
  await dialog
    .getByRole('button', { name: 'غیرفعال‌کردن', exact: true })
    .click();
  await expect(dialog).toBeHidden();
  await expect(row.getByRole('button', { name: 'فعال‌سازی' })).toBeVisible();
  expect(
    (await events()).find(
      event =>
        event.path === '/api/admin/barber/73/active' && event.phase === 'body',
    )?.body,
  ).toEqual({ isActive: false });
  await expect(
    row.getByText('ورود حساب غیرفعال است؛ نیازمند بررسی'),
  ).toHaveCount(0);

  await row.getByRole('button', { name: 'فعال‌سازی' }).click();
  await expect(dialog).toContainText('تأیید پروفایل');
  await dialog.getByRole('button', { name: 'فعال‌کردن', exact: true }).click();
  await expect(
    row.getByRole('button', { name: 'غیرفعال', exact: true }),
  ).toBeVisible();
  expect(
    (await events())
      .filter(
        event =>
          event.path === '/api/admin/barber/73/active' &&
          event.phase === 'body',
      )
      .map(event => event.body),
  ).toEqual([{ isActive: false }, { isActive: true }]);
});

test('legacy account requires an explicit review; restoring login keeps display disabled', async ({
  page,
  context,
}) => {
  await reset({
    roles: ['admin'],
    managementAccountActive: false,
    managementAdminAccount: true,
  });
  await signIn(context);
  const row = await openManagement(page);
  await expect(row).toContainText('ورود حساب غیرفعال است');
  await expect(row).toContainText('دارای نقش مدیر');
  await expect(row.getByRole('button', { name: 'فعال‌سازی' })).toHaveCount(0);

  await row.getByRole('button', { name: 'بررسی و بازکردن ورود' }).click();
  const dialog = page.getByRole('alertdialog');
  await expect(dialog).toContainText('فقط پس از بررسی علت');
  await expect(dialog).toContainText('این حساب نقش مدیر نیز دارد');
  await expect(dialog).toContainText('نشست‌های معتبر قبلی');
  await expect(dialog).toContainText('سالن همچنان پنهان می‌ماند');
  await dialog.getByRole('button', { name: 'انصراف' }).click();
  expect(
    (await events()).some(
      event => event.path === '/api/admin/barber/73/restore-account',
    ),
  ).toBe(false);

  await row.getByRole('button', { name: 'بررسی و بازکردن ورود' }).click();
  await dialog
    .getByRole('button', { name: 'بازکردن ورود', exact: true })
    .click();
  await expect(row.getByRole('button', { name: 'فعال‌سازی' })).toBeVisible();
  await expect(row).not.toContainText('ورود حساب غیرفعال است');
  expect(
    (await events()).filter(
      event =>
        event.path === '/api/admin/barber/73/restore-account' &&
        event.phase === 'body',
    ),
  ).toHaveLength(1);
  expect(
    (await events()).some(
      event => event.path === '/api/admin/barber/73/active',
    ),
  ).toBe(false);
});

test('barber dashboard explains that visibility is off while the account and purchased page remain available', async ({
  page,
  context,
}) => {
  await reset({ roles: ['barber', 'user'], profileVisible: false });
  await signIn(context);
  await page.goto('/dashboard/profile');
  await expect(
    page.getByText(
      'نمایش عمومی سالن شما توسط مدیریت غیرفعال شده است. ورود به حساب و دسترسی به پنل همچنان برقرار است.',
    ),
  ).toBeVisible();
  await expect(
    page.getByText(
      'اطلاعات فعلی پروفایل شما تایید شده و برای همهٔ کاربران قابل مشاهده است.',
    ),
  ).toHaveCount(0);

  await page.goto('/dashboard/public-page');
  await expect(
    page.getByText('نمایش عمومی غیرفعال', { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(
      'امتیاز و آدرس صفحهٔ اختصاصی شما محفوظ است، اما نمایش عمومی سالن توسط مدیریت غیرفعال شده است.',
    ),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: 'مشاهده صفحه' })).toHaveCount(0);
});
