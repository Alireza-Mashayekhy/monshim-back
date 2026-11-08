import { RedisService } from './redis.service';

/**
 * تست خاموشی تمیز Redis.
 *
 * چرا اهمیت دارد: `pm2 restart` و `docker stop` اول SIGTERM می‌فرستند و
 * منتظر می‌مانند. اگر اتصال Redis بسته نشود، Node خارج نمی‌شود، PM2 بعد از
 * مهلت SIGKILL می‌زند و درخواست‌های در حال پردازش نیمه‌کاره رها می‌شوند.
 *
 * این تست‌ها رفتار `onModuleDestroy` را با یک کلاینت ساختگی بررسی می‌کنند؛
 * به Redis واقعی نیاز ندارند.
 */
type FakeClient = {
  isOpen: boolean;
  quit?: () => Promise<string>;
  destroy?: () => void;
};

function serviceWith(client: FakeClient | undefined): RedisService {
  const service = new RedisService();
  // دسترسی به فیلد خصوصی فقط در تست
  (service as unknown as { client: FakeClient }).client = client as FakeClient;
  return service;
}

describe('RedisService.onModuleDestroy', () => {
  it('اتصال باز را با quit() تمیز می‌بندد', async () => {
    const quit = jest.fn(() => Promise.resolve('OK'));
    const destroy = jest.fn();

    await serviceWith({ isOpen: true, quit, destroy }).onModuleDestroy();

    expect(quit).toHaveBeenCalledTimes(1);
    expect(destroy).not.toHaveBeenCalled();
  });

  it('اگر اتصال از قبل بسته است کاری نمی‌کند', async () => {
    const quit = jest.fn(() => Promise.resolve('OK'));

    await serviceWith({ isOpen: false, quit }).onModuleDestroy();

    expect(quit).not.toHaveBeenCalled();
  });

  it('اگر هیچ اتصالی ساخته نشده باشد خطا نمی‌دهد', async () => {
    await expect(
      serviceWith(undefined).onModuleDestroy(),
    ).resolves.toBeUndefined();
  });

  /**
   * اگر `quit()` شکست بخورد (مثلاً شبکه قطع است)، باید اتصال را به‌زور
   * قطع کنیم؛ وگرنه پروسه هرگز خارج نمی‌شود و PM2 مجبور به SIGKILL می‌شود.
   */
  it('اگر quit() شکست بخورد، اتصال را destroy می‌کند', async () => {
    const quit = jest.fn(() => Promise.reject(new Error('socket closed')));
    const destroy = jest.fn();

    await serviceWith({ isOpen: true, quit, destroy }).onModuleDestroy();

    expect(quit).toHaveBeenCalledTimes(1);
    expect(destroy).toHaveBeenCalledTimes(1);
  });
});
