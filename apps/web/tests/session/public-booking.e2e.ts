import { type BrowserContext, expect, type Page, test } from '@playwright/test';

const mockBase = 'http://127.0.0.1:43101';
const crossHost = process.env.SESSION_E2E_CROSS_HOST === '1';
const cookieBase = crossHost
  ? 'http://api.monshim.test:43101'
  : 'http://127.0.0.1:43100';
const publicUrl = '/provider/salon-test';
const bookingPath = '/panel/provider/73';

type Event = {
  path: string;
  phase: string;
  body?: Record<string, unknown>;
};

async function resetMock(options: Record<string, unknown> = {}) {
  const reset = await fetch(`${mockBase}/__test/reset`, { method: 'POST' });
  if (!reset.ok) throw new Error('Could not reset mock API');
  const response = await fetch(`${mockBase}/__test/config`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(options),
  });
  if (!response.ok) throw new Error('Could not configure mock API');
}

async function events(): Promise<Event[]> {
  const response = await fetch(`${mockBase}/__test/events`);
  return ((await response.json()) as { data: Event[] }).data;
}

async function setCookies(context: BrowserContext, access: boolean) {
  await context.addCookies([
    ...(access
      ? [{ name: 'access_token', value: 'valid', url: cookieBase }]
      : []),
    { name: 'refresh_token', value: 'valid', url: cookieBase },
  ]);
}

async function openPublicPage(page: Page) {
  await page.goto(publicUrl);
  await expect(
    page.getByRole('heading', { name: 'سالن آزمایشی', level: 1 }),
  ).toBeVisible();
}

function floatingButton(page: Page) {
  return page.getByRole('button', { name: /رزرو نوبت آنلاین در سالن آزمایشی/ });
}

function serviceButton(page: Page) {
  return page.getByRole('button', { name: /کوتاهی مو/ });
}

async function enterPhone(page: Page, phone = '۰۹۱۲۳۴۵۶۷۸۹') {
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await dialog.getByLabel('شماره موبایل').fill(phone);
  await dialog.getByRole('button', { name: 'دریافت کد تأیید' }).click();
  await expect(dialog.getByLabel('کد تأیید')).toBeVisible();
}

async function enterCode(page: Page) {
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('کد تأیید').fill('۱۲۳۴');
  await dialog.getByRole('button', { name: 'تأیید و ادامه رزرو' }).click();
}

test.beforeEach(async () => {
  await resetMock();
});

test('public salon and service remain in server HTML', async ({ request }) => {
  const response = await request.get(`http://127.0.0.1:43100${publicUrl}`);
  expect(response.ok()).toBe(true);
  const html = await response.text();
  expect(html).toContain('سالن آزمایشی');
  expect(html).toContain('کوتاهی مو');
  expect(html).toContain(
    crossHost
      ? 'http://api.monshim.test:43101/uploads/booking-test.png'
      : 'https://monshiim.ir/uploads/booking-test.png',
  );
});

test('same-origin public images load through the uploads proxy', async ({
  page,
}) => {
  test.skip(
    crossHost,
    'The synthetic API hostname is only mapped inside Chromium.',
  );
  await openPublicPage(page);
  const logo = page.getByRole('img', { name: 'لوگوی سالن سالن آزمایشی' });
  await expect(logo).toBeVisible();
  await expect
    .poll(() => logo.evaluate((image: HTMLImageElement) => image.naturalWidth))
    .toBeGreaterThan(0);
  const portfolio = page.getByRole('img', {
    name: 'نمونه‌کار سالن سالن آزمایشی',
  });
  await expect(portfolio).toHaveAttribute('src', '/uploads/booking-test.png');
});

test('valid session goes directly from floating button to this barber', async ({
  page,
  context,
}) => {
  await setCookies(context, true);
  await openPublicPage(page);
  await floatingButton(page).click();
  await expect(page).toHaveURL(new RegExp(`${bookingPath}$`));
  await expect(page.getByText('انتخاب خدمات', { exact: true })).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(
    (await events()).some(event => event.path === '/api/auth/send-otp'),
  ).toBe(false);
});

test('refresh-only session is restored before booking from service card', async ({
  page,
  context,
}) => {
  await setCookies(context, false);
  await openPublicPage(page);
  await serviceButton(page).click();
  await expect(page).toHaveURL(new RegExp(`${bookingPath}$`));
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(
    (await events()).some(
      event => event.path === '/api/auth/refresh' && event.phase === 'end',
    ),
  ).toBe(true);
});

test('existing guest enters phone and code in dialog then books same barber', async ({
  page,
}) => {
  await openPublicPage(page);
  await floatingButton(page).click();
  await enterPhone(page, '+۹۸ ۹۱۲ ۳۴۵ ۶۷۸۹');
  await enterCode(page);
  await expect(page).toHaveURL(new RegExp(`${bookingPath}$`));
  await expect(page.getByText('انتخاب خدمات', { exact: true })).toBeVisible();
  const all = await events();
  expect(
    all.find(
      event => event.path === '/api/auth/login' && event.phase === 'body',
    )?.body,
  ).toMatchObject({
    phone: '09123456789',
    code: '1234',
  });
  expect(all.some(event => event.path === '/api/auth/sign-up')).toBe(false);
});

test('new guest completes required profile after code and books same barber', async ({
  page,
}) => {
  await resetMock({ otpNewUser: true });
  await openPublicPage(page);
  await serviceButton(page).click();
  await enterPhone(page);
  await enterCode(page);

  const dialog = page.getByRole('dialog');
  await expect(dialog.getByText('تکمیل اطلاعات حساب')).toBeVisible();
  await dialog.getByRole('button', { name: 'ثبت‌نام و ادامه رزرو' }).click();
  await expect(dialog.getByRole('alert')).toContainText('نام و نام خانوادگی');
  await dialog.getByLabel('نام', { exact: true }).fill('سارا');
  await dialog.getByLabel('نام خانوادگی').fill('نمونه');
  await dialog.getByRole('button', { name: 'ثبت‌نام و ادامه رزرو' }).click();
  await expect(dialog.getByRole('alert')).toContainText('جنسیت');
  await dialog.getByLabel('خانم', { exact: true }).check();
  await dialog.getByRole('button', { name: 'ثبت‌نام و ادامه رزرو' }).click();

  await expect(page).toHaveURL(new RegExp(`${bookingPath}$`));
  await expect(page.getByText('انتخاب خدمات', { exact: true })).toBeVisible();
  const all = await events();
  expect(
    all.find(
      event => event.path === '/api/auth/sign-up' && event.phase === 'body',
    )?.body,
  ).toMatchObject({
    phone: '09123456789',
    code: '1234',
    fullName: 'سارا نمونه',
    gender: 'female',
  });
});

test('signup conflict recovers by logging into the newly existing account', async ({
  page,
}) => {
  await resetMock({
    otpNewUser: true,
    signUpStatus: 409,
    conflictBecomesExisting: true,
  });
  await openPublicPage(page);
  await floatingButton(page).click();
  await enterPhone(page);
  await enterCode(page);
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('نام', { exact: true }).fill('سارا');
  await dialog.getByLabel('نام خانوادگی').fill('نمونه');
  await dialog.getByLabel('خانم', { exact: true }).check();
  await dialog.getByRole('button', { name: 'ثبت‌نام و ادامه رزرو' }).click();
  await expect(page).toHaveURL(new RegExp(`${bookingPath}$`));
  const all = await events();
  expect(
    all.filter(
      event => event.path === '/api/auth/login' && event.phase === 'body',
    ),
  ).toHaveLength(2);
});

test('invalid input and expired code provide recovery without leaving the dialog', async ({
  page,
}) => {
  await resetMock({ otpLoginStatus: 400 });
  await openPublicPage(page);
  await floatingButton(page).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('شماره موبایل').fill('123');
  await dialog.getByRole('button', { name: 'دریافت کد تأیید' }).click();
  await expect(dialog.getByRole('alert')).toContainText('شماره موبایل معتبر');
  // Do not silently truncate an extra digit and send to a different number.
  await dialog.getByLabel('شماره موبایل').fill('091234567890');
  await dialog.getByRole('button', { name: 'دریافت کد تأیید' }).click();
  await expect(dialog.getByRole('alert')).toContainText('شماره موبایل معتبر');
  expect(
    (await events()).some(event => event.path === '/api/auth/send-otp'),
  ).toBe(false);
  await enterPhone(page);
  await enterCode(page);
  await expect(dialog.getByRole('alert')).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`${publicUrl}$`));
  await dialog.getByRole('button', { name: 'ویرایش شماره' }).click();
  await expect(dialog.getByLabel('شماره موبایل')).toBeVisible();
  await dialog.getByRole('button', { name: 'بستن' }).click();
  await floatingButton(page).click();
  await expect(page.getByRole('dialog').getByLabel('شماره موبایل')).toHaveValue(
    '',
  );
});

test('resend becomes available after the real cooldown and clears the old code', async ({
  page,
}) => {
  await page.clock.install();
  await openPublicPage(page);
  await floatingButton(page).click();
  await enterPhone(page);
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('کد تأیید').fill('1234');
  await expect(
    dialog.getByRole('button', { name: /ارسال دوباره تا/ }),
  ).toBeDisabled();
  await page.clock.fastForward('01:00');
  await dialog.getByRole('button', { name: 'ارسال دوباره کد' }).click();
  await expect(dialog.getByLabel('کد تأیید')).toHaveValue('');
  expect(
    (await events()).filter(event => event.path === '/api/auth/send-otp'),
  ).toHaveLength(2);
});

test('OTP rate limiting stays in the dialog and permits a retry', async ({
  page,
}) => {
  await resetMock({ sendOtpStatus: 429 });
  await openPublicPage(page);
  await floatingButton(page).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('شماره موبایل').fill('09123456789');
  await dialog.getByRole('button', { name: 'دریافت کد تأیید' }).click();
  await expect(dialog.getByRole('alert')).toContainText(
    'تعداد درخواست‌ها زیاد است',
  );
  await expect(dialog.getByLabel('شماره موبایل')).toBeVisible();
  await resetMock();
  await dialog.getByRole('button', { name: 'دریافت کد تأیید' }).click();
  await expect(dialog.getByLabel('کد تأیید')).toBeVisible();
});

test('rate-limited refresh does not turn a recoverable session into a guest', async ({
  page,
  context,
}) => {
  await resetMock({ refreshStatus: 429 });
  await setCookies(context, false);
  await openPublicPage(page);
  await serviceButton(page).click();
  await expect(
    page.getByText(
      'تعداد درخواست‌ها زیاد است. کمی صبر کنید و دوباره تلاش کنید.',
    ),
  ).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(
    (await context.cookies()).some(cookie => cookie.name === 'refresh_token'),
  ).toBe(true);
  await resetMock();
  await serviceButton(page).click();
  await expect(page).toHaveURL(new RegExp(`${bookingPath}$`));
});

test('temporary session failure never opens guest form and retry succeeds', async ({
  page,
  context,
}) => {
  await resetMock({ meStatus: 503 });
  await setCookies(context, true);
  await openPublicPage(page);
  await floatingButton(page).click();
  await expect(
    page.getByText('سرور موقتاً در دسترس نیست. لطفاً بعداً تلاش کنید.'),
  ).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(
    (await context.cookies()).some(cookie => cookie.name === 'refresh_token'),
  ).toBe(true);
  await resetMock();
  await floatingButton(page).click();
  await expect(page).toHaveURL(new RegExp(`${bookingPath}$`));
});
