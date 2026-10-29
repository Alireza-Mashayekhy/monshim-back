import { ConfigService } from '@nestjs/config';

// @nestjs/schedule فقط ESM است و jest 30 نمی‌تواند require کند؛
// دکوراتور کرون موضوع این تست نیست.
jest.mock('@nestjs/schedule', () => ({
  Cron: () => () => undefined,
  CronExpression: { EVERY_10_MINUTES: '0 */10 * * * *' },
}));

import { PaymentService } from './payment.service';

/**
 * تست انتخاب origin برای ریدایرکت پرداخت.
 *
 * باگ واقعی: مقدار `FRONTEND_URL=http://localhost:3000/panel` باعث می‌شد
 * کاربر بعد از پرداخت به `http://localhost:3000/panel/panel/payment/callback`
 * برود. حالا فقط origin استفاده می‌شود و در production مقدار لوکال کنار
 * گذاشته می‌شود.
 */
const buildService = (env: Record<string, string | undefined>) => {
  const configService = {
    get: jest.fn((key: string) => env[key]),
  } as unknown as ConfigService;

  const repository = {} as never;

  return new PaymentService(
    repository, // paymentRepo
    repository, // userRepo
    repository, // barberProfileRepo
    repository, // planRepo
    repository, // userSubscriptionRepo
    repository, // serviceRepo
    repository, // bookingRepo
    repository, // slotHoldRepo
    repository, // settingsRepo
    repository, // workHoursRepo
    {} as never, // bookingSmsService
    {} as never, // publicPageService
    {} as never, // referralService
    {} as never, // walletService
    configService,
    {} as never, // dataSource
  );
};

const callFrontUrl = (service: PaymentService, requestOrigin?: string) =>
  (service as any).getFrontUrl(requestOrigin) as string;

describe('PaymentService — آدرس ریدایرکت پرداخت', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  it('در production آدرس لوکال env را کنار می‌گذارد و از origin درخواست استفاده می‌کند', () => {
    process.env.NODE_ENV = 'production';

    const service = buildService({
      FRONTEND_URL: 'http://localhost:3000/panel',
    });

    expect(callFrontUrl(service, 'https://monshiim.ir')).toBe(
      'https://monshiim.ir',
    );
  });

  it('مسیر `/panel` در مقدار env را حذف می‌کند (جلوگیری از panel/panel)', () => {
    process.env.NODE_ENV = 'production';

    const service = buildService({
      FRONTEND_URL: 'https://monshiim.ir/panel/',
    });

    expect(callFrontUrl(service, 'https://api.monshiim.ir')).toBe(
      'https://monshiim.ir',
    );
  });

  it('مقدار درست env را نگه می‌دارد', () => {
    process.env.NODE_ENV = 'production';

    const service = buildService({ FRONTEND_URL: 'https://monshiim.ir/' });

    expect(callFrontUrl(service, 'https://other.example')).toBe(
      'https://monshiim.ir',
    );
  });

  it('در توسعه localhost را معتبر می‌داند', () => {
    process.env.NODE_ENV = 'development';

    const service = buildService({ FRONTEND_URL: 'http://localhost:3000' });

    expect(callFrontUrl(service, 'http://localhost:4000')).toBe(
      'http://localhost:3000',
    );
  });

  it('APP_URL مقدار env با مسیر `/api` را به origin تبدیل می‌کند', () => {
    process.env.NODE_ENV = 'production';

    const service = buildService({ APP_URL: 'https://monshiim.ir/api/' });

    expect((service as any).getAppUrl()).toBe('https://monshiim.ir');
  });

  it('لینک پیامک بیعانه کاربر را ابتدا به صفحهٔ صورت‌حساب `/deposit/:token` هدایت می‌کند', async () => {
    process.env.NODE_ENV = 'production';

    const service = buildService({ FRONTEND_URL: 'https://monshiim.ir' });

    const redirect = await service.getDepositRedirectUrl(
      'a1b2c3d4e5f60718293a4b5c:1',
    );
    expect(redirect).toBe(
      'https://monshiim.ir/deposit/a1b2c3d4e5f60718293a4b5c',
    );
  });

  it('توکن نامعتبر بیعانه را به صفحه خطای پرداخت می‌فرستد', async () => {
    process.env.NODE_ENV = 'production';

    const service = buildService({ FRONTEND_URL: 'https://monshiim.ir' });

    const redirect = await service.getDepositRedirectUrl('bad%token');
    expect(redirect).toContain(
      'https://monshiim.ir/panel/payment/callback?status=failed',
    );
  });
});
