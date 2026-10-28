import { FrontendRevalidationService } from './frontend-revalidation.service';

const mockPost = jest.fn();
const mockIsAxiosError = jest.fn((_error?: unknown) => false);

jest.mock('axios', () => ({
  __esModule: true,
  default: {
    post: (url: string, body: unknown, config: unknown) =>
      mockPost(url, body, config),
    isAxiosError: (error: unknown) => mockIsAxiosError(error),
  },
}));

function configService(values: Record<string, string | undefined>) {
  return {
    get: jest.fn((key: string) => values[key]),
  } as any;
}

describe('FrontendRevalidationService', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    mockPost.mockReset();
    mockPost.mockResolvedValue({ data: { revalidated: true } });
    mockIsAxiosError.mockReturnValue(false);
    delete process.env.REVALIDATE_SECRET;
    delete process.env.FRONTEND_URL;
    delete process.env.FRONT_URL;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('اگر REVALIDATE_SECRET تنظیم نشده باشد هیچ درخواستی نمی‌فرستد و خطا نمی‌دهد', () => {
    const service = new FrontendRevalidationService(
      configService({ FRONTEND_URL: 'https://monshiim.ir' }),
    );

    expect(() =>
      service.notifyBarberProfileChanged({ userId: 42, slugs: ['salon'] }),
    ).not.toThrow();
    expect(mockPost).not.toHaveBeenCalled();
  });

  it('با تنظیمات کامل، وبهوک فرانت را با هدر امنیتی و اسلاگ صدا می‌زند', async () => {
    const service = new FrontendRevalidationService(
      configService({
        FRONTEND_URL: 'https://monshiim.ir/panel',
        REVALIDATE_SECRET: 'super-secret',
      }),
    );

    service.notifyBarberProfileChanged({
      userId: 42,
      slugs: [' salon-royal ', null, ''],
    });

    // فراخوانی عمداً fire-and-forget است؛ یک tick صبر می‌کنیم.
    await new Promise(resolve => setImmediate(resolve));

    // فقط origin استفاده می‌شود (نه مسیر اضافه‌ای مثل /panel)
    expect(mockPost).toHaveBeenCalledWith(
      'https://monshiim.ir/api/revalidate',
      { userId: 42, slugs: ['salon-royal'] },
      expect.objectContaining({
        timeout: expect.any(Number),
        headers: expect.objectContaining({
          'x-revalidate-secret': 'super-secret',
        }),
      }),
    );
  });

  it('شناسهٔ نامعتبر را نادیده می‌گیرد', async () => {
    const service = new FrontendRevalidationService(
      configService({
        FRONTEND_URL: 'https://monshiim.ir',
        REVALIDATE_SECRET: 'super-secret',
      }),
    );

    service.notifyBarberProfileChanged({ userId: Number.NaN });
    await new Promise(resolve => setImmediate(resolve));

    expect(mockPost).not.toHaveBeenCalled();
  });

  it('خطای شبکه در مسیر تایید پروفایل را نمی‌شکند', async () => {
    mockPost.mockRejectedValue(new Error('ECONNREFUSED'));

    const service = new FrontendRevalidationService(
      configService({
        FRONTEND_URL: 'https://monshiim.ir',
        REVALIDATE_SECRET: 'super-secret',
      }),
    );

    expect(() =>
      service.notifyBarberProfileChanged({ userId: 42 }),
    ).not.toThrow();
    await new Promise(resolve => setImmediate(resolve));
    expect(mockPost).toHaveBeenCalledTimes(1);
  });
});
