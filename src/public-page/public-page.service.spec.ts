import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { ACTIVE_BOOKING_STATUSES } from 'src/booking/entities/booking.entity';
import {
  PaymentPurpose,
  PaymentStatus,
} from 'src/payment/entities/payment.entity';
import { TransactionType } from 'src/wallet/entities/transaction.entity';

import { PUBLIC_PAGE_REQUIRED_PAID_BOOKINGS } from './constants';
import { PublicPageService } from './public-page.service';
import { normalizePublicPageSlug, validatePublicPageSlug } from './slug.util';

describe('PublicPage slug utility', () => {
  it('نرمال‌سازی حروف بزرگ و ارقام فارسی/عربی را انجام می‌دهد', () => {
    expect(normalizePublicPageSlug('  Aria-Salon-۱۲۳  ')).toBe(
      'aria-salon-123',
    );
    expect(normalizePublicPageSlug('Salon-٤٥')).toBe('salon-45');
  });

  it('اسلاگ‌های معتبر انگلیسی را می‌پذیرد و موارد نامعتبر را رد می‌کند', () => {
    expect(validatePublicPageSlug('aria-vip-24')).toEqual({
      valid: true,
      slug: 'aria-vip-24',
    });

    // فقط عدد نباید پذیرفته شود (جلوگیری از تداخل با user.id)
    expect(validatePublicPageSlug('12345').valid).toBe(false);

    // کوتاه‌تر از ۳ کاراکتر
    expect(validatePublicPageSlug('ab').valid).toBe(false);

    // خط تیره در ابتدا/انتها یا دو خط تیره متوالی
    expect(validatePublicPageSlug('-aria').valid).toBe(false);
    expect(validatePublicPageSlug('aria-').valid).toBe(false);
    expect(validatePublicPageSlug('aria--salon').valid).toBe(false);

    // حروف غیرانگلیسی و کاراکترهای غیرمجاز
    expect(validatePublicPageSlug('سالن-آریا').valid).toBe(false);
    expect(validatePublicPageSlug('aria_salon').valid).toBe(false);

    // کلمات رزروشده
    expect(validatePublicPageSlug('admin').valid).toBe(false);
    expect(validatePublicPageSlug('directory').valid).toBe(false);
  });
});

describe('PublicPageService', () => {
  function createMockBookingQb(options?: { count?: number; rawRows?: any[] }) {
    const subQb: any = {
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getQuery: jest
        .fn()
        .mockReturnValue(
          '(SELECT 1 FROM payments gatewayPayment WHERE gatewayPayment.status = :paidPaymentStatus)',
        ),
    };

    const qb: any = {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orWhere: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      having: jest.fn().mockReturnThis(),
      subQuery: jest.fn(() => subQb),
      getCount: jest.fn().mockResolvedValue(options?.count ?? 0),
      getRawMany: jest.fn().mockResolvedValue(options?.rawRows ?? []),
      __subQb: subQb,
    };

    return qb;
  }

  function createService(params?: {
    profile?: any;
    profiles?: any[];
    existingSlugOwner?: any;
    purchase?: any;
    paidBookingsCount?: number;
    qualifiedRows?: any[];
    purchaseDirectoryRows?: any[];
    duplicateDbError?: boolean;
  }) {
    const bookingQb = createMockBookingQb({
      count: params?.paidBookingsCount ?? 0,
      rawRows: params?.qualifiedRows ?? [],
    });

    const purchaseQb: any = {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      getRawMany: jest
        .fn()
        .mockResolvedValue(params?.purchaseDirectoryRows ?? []),
    };

    const purchaseRepo: any = {
      findOne: jest.fn().mockResolvedValue(params?.purchase ?? null),
      createQueryBuilder: jest.fn(() => purchaseQb),
      create: jest.fn(x => x),
      save: jest.fn(x => Promise.resolve(x)),
    };

    const profileRepo: any = {
      findOne: jest.fn(({ where }: any) => {
        if (where?.userId !== undefined) {
          return Promise.resolve(params?.profile ?? null);
        }
        if (where?.slug !== undefined) {
          if (params?.existingSlugOwner !== undefined) {
            return Promise.resolve(params.existingSlugOwner);
          }
          if (params?.profile && params.profile.slug === where.slug) {
            return Promise.resolve(params.profile);
          }
          return Promise.resolve(null);
        }
        return Promise.resolve(null);
      }),
      find: jest.fn().mockResolvedValue(params?.profiles ?? []),
      update: jest.fn(() => {
        if (params?.duplicateDbError) {
          const err = Object.assign(new Error('Duplicate entry'), {
            driverError: { code: 'ER_DUP_ENTRY', errno: 1062 },
          });
          return Promise.reject(err);
        }
        return Promise.resolve({ affected: 1 });
      }),
    };

    const bookingRepo: any = {
      createQueryBuilder: jest.fn(() => bookingQb),
    };

    const barberService: any = {
      findPublicOne: jest.fn((userId: number) =>
        Promise.resolve({
          id: userId,
          salonName: 'سالن آریا',
          services: [
            { id: 's-1', name: 'اصلاح', price: 200000, durationMinutes: 30 },
          ],
        }),
      ),
      getPublicDirectory: jest.fn(() =>
        Promise.resolve({
          barbers: (params?.profiles ?? []).map(p => ({ id: p.userId })),
          cities: [],
        }),
      ),
    };

    const configService: any = {
      get: jest.fn((key: string) =>
        key === 'FRONT_URL' ? 'https://monshiim.ir' : undefined,
      ),
    };

    const service = new PublicPageService(
      purchaseRepo,
      profileRepo,
      bookingRepo,
      barberService,
      configService,
    );

    return {
      service,
      bookingQb,
      profileRepo,
      purchaseRepo,
      barberService,
    };
  }

  it('فقط رزروهای غیروضعیتِ لغو/رد و دارای پرداخت موفقِ برگشت‌نخوردهٔ درگاه را می‌شمارد (هم‌راستا با امور مالی)', async () => {
    const { service, bookingQb } = createService({
      profile: {
        id: 'prof-1',
        userId: 42,
        isApproved: true,
        salonName: 'سالن آریا',
        slug: null,
      },
      paidBookingsCount: 15,
    });

    const status = await service.getStatusByUserId(42);
    expect(status.packagePriceTomans).toBe(799_000);
    expect(status.paidBookingsCount).toBe(15);
    expect(status.isActive).toBe(false);
    expect(status.publicUrl).toBeNull();

    // ۱) حذف رزروهای لغوشده و ردشده
    expect(bookingQb.andWhere).toHaveBeenCalledWith(
      'booking.status IN (:...activeBookingStatuses)',
      { activeBookingStatuses: ACTIVE_BOOKING_STATUSES },
    );

    // ۲) بررسی وجود رکورد پرداخت موفق درگاه و برگشت‌نخورده (مشابه امور مالی)
    const existsCall = bookingQb.andWhere.mock.calls.find(
      ([sql]: [unknown]) =>
        typeof sql === 'string' && sql.startsWith('EXISTS '),
    );
    expect(existsCall).toBeTruthy();
    expect(existsCall[1]).toEqual(
      expect.objectContaining({
        bookingPaymentPurpose: PaymentPurpose.BOOKING,
        paidPaymentStatus: PaymentStatus.PAID,
        refundTxType: TransactionType.REFUND,
      }),
    );

    const subQb = bookingQb.__subQb;
    const notRefundedSubCall = subQb.andWhere.mock.calls.find(
      ([sql]: [unknown]) =>
        typeof sql === 'string' && sql.includes('SELECT refund_tx.referenceId'),
    );
    expect(notRefundedSubCall).toBeTruthy();
  });

  it('وقتی صفحه فعال است اما هنوز اسلاگ ثبت نشده، آیدی را در publicUrl نشان نمی‌دهد', async () => {
    const { service } = createService({
      profile: {
        id: 'prof-1',
        userId: 42,
        isApproved: true,
        salonName: 'سالن آریا',
        slug: null,
      },
      paidBookingsCount: PUBLIC_PAGE_REQUIRED_PAID_BOOKINGS,
    });

    const status = await service.getStatusByUserId(42);
    expect(status.isActive).toBe(true);
    expect(status.reason).toBe('PAID_BOOKINGS');
    expect(status.slug).toBeNull();
    expect(status.publicUrl).toBeNull();
  });

  it('اجازهٔ ثبت اسلاگ قبل از فعال شدن صفحهٔ اختصاصی را نمی‌دهد', async () => {
    const { service } = createService({
      profile: {
        id: 'prof-1',
        userId: 42,
        isApproved: true,
        salonName: 'سالن آریا',
        slug: null,
      },
      paidBookingsCount: 10,
    });

    await expect(
      service.updateSlugByUserId(42, 'aria-salon'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('اسلاگ تکراری را رد می‌کند و اسلاگ یکتا را ذخیره و در لینک عمومی قرار می‌دهد', async () => {
    const { service: dupService } = createService({
      profile: {
        id: 'prof-1',
        userId: 42,
        isApproved: true,
        salonName: 'سالن آریا',
        slug: null,
      },
      existingSlugOwner: { id: 'prof-other', userId: 99 },
      purchase: { id: 'pur-1', createdAt: new Date('2026-01-01T00:00:00Z') },
    });

    const availability = await dupService.checkSlugAvailability(
      42,
      'aria-salon',
    );
    expect(availability.valid).toBe(true);
    expect(availability.available).toBe(false);

    await expect(
      dupService.updateSlugByUserId(42, 'aria-salon'),
    ).rejects.toBeInstanceOf(ConflictException);

    const { service: okService, profileRepo } = createService({
      profile: {
        id: 'prof-1',
        userId: 42,
        isApproved: true,
        salonName: 'سالن آریا',
        slug: null,
      },
      purchase: { id: 'pur-1', createdAt: new Date('2026-01-01T00:00:00Z') },
    });

    const updated = await okService.updateSlugByUserId(42, '  Aria-Salon  ');
    expect(profileRepo.update).toHaveBeenCalledWith(
      { id: 'prof-1' },
      { slug: 'aria-salon' },
    );
    expect(updated.slug).toBe('aria-salon');
    expect(updated.publicUrl).toBe('https://monshiim.ir/barber/aria-salon');
  });

  it('در خطای هم‌زمانی یکتایی دیتابیس (ER_DUP_ENTRY) خطای Conflict برمی‌گرداند', async () => {
    const { service } = createService({
      profile: {
        id: 'prof-1',
        userId: 42,
        isApproved: true,
        salonName: 'سالن آریا',
        slug: null,
      },
      purchase: { id: 'pur-1', createdAt: new Date() },
      duplicateDbError: true,
    });

    await expect(
      service.updateSlugByUserId(42, 'aria-salon'),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('صفحهٔ عمومی را با اسلاگ باز می‌کند و بدون اسلاگ ۴۰۴ برمی‌گرداند', async () => {
    const { service: withoutSlug } = createService({
      profile: {
        id: 'prof-1',
        userId: 42,
        isApproved: true,
        salonName: 'سالن آریا',
        slug: null,
      },
      purchase: { id: 'pur-1', createdAt: new Date() },
    });

    await expect(withoutSlug.getPublicBarberPage('42')).rejects.toBeInstanceOf(
      NotFoundException,
    );

    const { service: withSlug } = createService({
      profile: {
        id: 'prof-1',
        userId: 42,
        isApproved: true,
        salonName: 'سالن آریا',
        slug: 'aria-salon',
      },
      purchase: { id: 'pur-1', createdAt: new Date() },
    });

    const page = await withSlug.getPublicBarberPage('aria-salon');
    expect(page.slug).toBe('aria-salon');
    expect(page.publicPage.url).toBe('https://monshiim.ir/barber/aria-salon');
  });

  it('در دایرکتوری sitemap فقط آرایشگرهای فعالِ دارای اسلاگ را قرار می‌دهد', async () => {
    const { service } = createService({
      profiles: [
        { id: 'prof-1', userId: 10, slug: 'aria-salon' },
        { id: 'prof-2', userId: 20, slug: null },
      ],
      purchaseDirectoryRows: [
        { barberProfileId: 'prof-1', updatedAt: '2026-02-01T00:00:00.000Z' },
        { barberProfileId: 'prof-2', updatedAt: '2026-02-01T00:00:00.000Z' },
      ],
    });

    const directory = await service.getActiveDirectory();
    expect(directory).toEqual([
      {
        id: 10,
        slug: 'aria-salon',
        updatedAt: '2026-02-01T00:00:00.000Z',
      },
    ]);
  });
});
