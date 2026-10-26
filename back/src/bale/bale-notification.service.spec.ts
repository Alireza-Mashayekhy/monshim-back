import { AuthService } from 'src/auth/auth.service';
import { Role } from 'src/common/enum/role.enum';

import { BaleNotificationService } from './bale-notification.service';

describe('BaleNotificationService', () => {
  function buildSetup(enabled = true) {
    const baleClient: any = {
      isEnabled: jest.fn().mockReturnValue(enabled),
      broadcastToAdmins: jest.fn().mockResolvedValue(1),
    };
    const userRepo: any = {
      findOne: jest.fn().mockResolvedValue({
        id: 10,
        fullName: 'علی رضایی',
        phone: '09121112233',
        barberProfile: {
          id: 'bp-1',
          salonName: 'پیرایش رویال',
          activityType: 'men',
          address: 'تهران، سعادت‌آباد، میدان کاج',
          province: { name: 'تهران' },
          city: { name: 'تهران' },
          createdAt: new Date('2026-10-23T12:00:00.000Z'),
          pendingChanges: null,
        },
      }),
    };
    const barberProfileRepo: any = {
      findOne: jest.fn().mockResolvedValue({
        id: 'bp-1',
        userId: 10,
        salonName: 'پیرایش رویال',
      }),
    };
    const bookingRepo: any = {
      find: jest.fn().mockResolvedValue([
        {
          id: 'bk-1',
          date: '2026-10-23',
          time: '16:30:00',
          price: 300000,
          customer: { fullName: 'محمد کریمی', phone: '09350001122' },
          service: { name: 'اصلاح مو و ریش' },
          barber: {
            salonName: 'پیرایش رویال',
            user: { fullName: 'علی رضایی', phone: '09121112233' },
          },
        },
      ]),
      findOne: jest.fn(),
    };
    const planRepo: any = {
      findOne: jest.fn().mockResolvedValue({
        id: 'plan-1',
        name: 'پلن حرفه‌ای ۳ ماهه',
        durationDays: 90,
        smsCount: 300,
      }),
    };

    const service = new BaleNotificationService(
      baleClient,
      userRepo,
      barberProfileRepo,
      bookingRepo,
      planRepo,
    );

    return {
      service,
      baleClient,
      userRepo,
      barberProfileRepo,
      bookingRepo,
      planRepo,
    };
  }

  it('پیام درخواست برداشت آرایشگر را با جزئیات کامل حساب ارسال می‌کند', async () => {
    const { service, baleClient } = buildSetup(true);

    await service.notifyWithdrawalRequested({
      userId: 10,
      transaction: {
        id: 'tx-99',
        amount: 1_200_000,
        createdAt: new Date('2026-10-23T12:00:00.000Z'),
      } as any,
      card: {
        bankName: 'ملت',
        ownerName: 'علی رضایی',
        cardNumber: '6104337700001111',
        shebaNumber: 'IR120120000000001234567890',
      } as any,
      remainingBalance: 350_000,
      note: 'تسویه هفتگی',
    });

    expect(baleClient.broadcastToAdmins).toHaveBeenCalledTimes(1);
    const sentText = baleClient.broadcastToAdmins.mock.calls[0][0] as string;
    expect(sentText).toContain('درخواست برداشت جدید آرایشگر');
    expect(sentText).toContain('پیرایش رویال');
    expect(sentText).toContain('۱,۲۰۰,۰۰۰ تومان');
    expect(sentText).toContain('۳۵۰,۰۰۰ تومان');
    expect(sentText).toContain('IR120120000000001234567890');
  });

  it('تمام ۵ نوع پرداخت موفق را با عنوان «پرداخت موفق جدید» و ذکر صریح «بابت پرداخت» ارسال می‌کند', async () => {
    const { service, baleClient } = buildSetup(true);

    // ۱. پرداخت رزرو آنلاین نوبت
    await service.notifyOnlineBookingPaid(
      {
        id: 'pay-1',
        userId: 20,
        amount: 110_000,
        orderId: 'BOOK-1001',
        refNumber: '987654321',
        paidAt: new Date('2026-10-23T12:00:00.000Z'),
        metadata: JSON.stringify({
          totalPrice: 300_000,
          depositAmount: 100_000,
          commissionAmount: 10_000,
        }),
      } as any,
      ['bk-1'],
    );

    // ۲. پرداخت لینک بیعانه
    await service.notifyDepositPaid(
      {
        id: 'pay-2',
        userId: 20,
        amount: 150_000,
        orderId: 'DEP-1002',
        refNumber: '987654322',
        paidAt: new Date('2026-10-23T12:05:00.000Z'),
        metadata: JSON.stringify({
          depositAmount: 136_364,
          commissionAmount: 13_636,
        }),
      } as any,
      ['bk-1'],
    );

    // ۳. خرید اشتراک
    await service.notifySubscriptionPurchased(
      {
        id: 'pay-3',
        userId: 10,
        amount: 450_000,
        orderId: 'SUB-2002',
        refNumber: '11223344',
        paidAt: new Date('2026-10-23T12:10:00.000Z'),
      } as any,
      'plan-1',
    );

    // ۴. خرید پکیج صفحه اختصاصی آرایشگاه
    await service.notifyPublicPagePurchased({
      id: 'pay-4',
      userId: 10,
      amount: 390_000,
      orderId: 'PUB-3003',
      refNumber: '55667788',
      paidAt: new Date('2026-10-23T12:15:00.000Z'),
    } as any);

    // ۵. شارژ کیف پول
    await service.notifyWalletCharged({
      id: 'pay-5',
      userId: 10,
      amount: 250_000,
      orderId: 'WAL-4004',
      refNumber: '99001122',
      paidAt: new Date('2026-10-23T12:20:00.000Z'),
    } as any);

    expect(baleClient.broadcastToAdmins).toHaveBeenCalledTimes(5);
    const messages = baleClient.broadcastToAdmins.mock.calls.map(
      (call: [string]) => call[0],
    );

    for (const msg of messages) {
      expect(msg).toContain('✅ پرداخت موفق جدید');
      expect(msg).toContain('📌 بابت پرداخت:');
    }

    expect(messages[0]).toContain('بابت پرداخت: رزرو آنلاین نوبت آرایشگاه');
    expect(messages[1]).toContain('بابت پرداخت: بیعانه نوبت (لینک پرداخت)');
    expect(messages[2]).toContain(
      'بابت پرداخت: خرید اشتراک (پلن حرفه‌ای ۳ ماهه)',
    );
    expect(messages[3]).toContain(
      'بابت پرداخت: خرید پکیج صفحه اختصاصی آرایشگاه',
    );
    expect(messages[4]).toContain('بابت پرداخت: شارژ آنلاین کیف پول');
  });

  it('اعلان ثبت‌نام آرایشگر جدید و اعلان ویرایش پروفایل آرایشگر را برای تایید ادمین ارسال می‌کند', async () => {
    const { service, baleClient, userRepo } = buildSetup(true);

    await service.notifyBarberRegistered(10);

    userRepo.findOne.mockResolvedValueOnce({
      id: 10,
      fullName: 'علی رضایی',
      phone: '09121112233',
      barberProfile: {
        id: 'bp-1',
        salonName: 'پیرایش رویال',
        pendingChanges: {
          salonName: 'پیرایش رویال پلاس',
          profileImage: '/uploads/profiles/new.webp',
        },
      },
    });

    await service.notifyBarberProfileEdited({
      userId: 10,
      changedFields: ['نام سالن', 'تصویر پروفایل'],
      isApprovedBarber: true,
    });

    expect(baleClient.broadcastToAdmins).toHaveBeenCalledTimes(2);

    const registerMsg = baleClient.broadcastToAdmins.mock.calls[0][0] as string;
    expect(registerMsg).toContain('🆕 ثبت‌نام آرایشگر جدید (در انتظار تایید)');
    expect(registerMsg).toContain('پیرایش رویال');
    expect(registerMsg).toContain('مردانه');
    expect(registerMsg).toContain('استان تهران، شهر تهران');
    expect(registerMsg).toContain('جهت بررسی و تایید پروفایل');

    const editMsg = baleClient.broadcastToAdmins.mock.calls[1][0] as string;
    expect(editMsg).toContain('✏️ ویرایش پروفایل آرایشگر (در انتظار تایید)');
    expect(editMsg).toContain('پیرایش رویال (پیشنهادی: پیرایش رویال پلاس)');
    expect(editMsg).toContain('نام سالن، تصویر پروفایل');
    expect(editMsg).toContain('نسخهٔ تاییدشدهٔ قبلی همچنان برای کاربران فعال');
    expect(editMsg).toContain('جهت بررسی و تایید تغییرات');
  });

  it('AuthService.registerBarber پس از ثبت موفق تراکنش، اعلان بله ثبت‌نام آرایشگر را ارسال می‌کند و در صورت شکست تراکنش ارسال نمی‌کند', async () => {
    const prevAccess = process.env.JWT_ACCESS_SECRET;
    const prevRefresh = process.env.JWT_REFRESH_SECRET;
    process.env.JWT_ACCESS_SECRET = 'test-access-secret-key';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key';

    try {
      const notifyBarberRegistered = jest.fn().mockResolvedValue(undefined);
      const transactionMock = jest.fn(
        (cb: (manager: unknown) => Promise<unknown>) => cb({}),
      );
      const authService = new AuthService(
        { signAsync: jest.fn().mockResolvedValue('jwt-token') } as any,
        {
          findWithPhone: jest.fn().mockResolvedValue(null),
          findWithNationalCode: jest.fn().mockResolvedValue(null),
          createWithRoles: jest.fn().mockResolvedValue({
            id: 77,
            fullName: 'رضا محمدی',
            phone: '09123334455',
            roles: [Role.User, Role.Barber],
            isActive: true,
          }),
        } as any,
        { verifyOtp: jest.fn().mockResolvedValue(true) } as any,
        { create: jest.fn().mockResolvedValue({ id: 'bp-77' }) } as any,
        { create: jest.fn().mockResolvedValue({ id: 'svc-1' }) } as any,
        { createReferral: jest.fn() } as any,
        { transaction: transactionMock } as any,
        { notifyBarberRegistered } as any,
      );

      const mockRes = { cookie: jest.fn() } as any;
      const dto = {
        fullName: 'رضا محمدی',
        phone: '09123334455',
        code: '12345',
        salonName: 'سالن مدرن',
        activityType: 'men',
        provinceId: 8,
        cityId: 101,
        address: 'تهران، ونک',
        services: [{ name: 'اصلاح مو', price: 250_000, durationMinutes: 30 }],
      } as any;

      await authService.registerBarber(dto, mockRes);

      expect(notifyBarberRegistered).toHaveBeenCalledTimes(1);
      expect(notifyBarberRegistered).toHaveBeenCalledWith(77);

      // در صورت خطا و rollback تراکنش، نباید پیام بله ارسال شود
      transactionMock.mockRejectedValueOnce(new Error('DB rollback'));
      await expect(authService.registerBarber(dto, mockRes)).rejects.toThrow(
        'DB rollback',
      );
      expect(notifyBarberRegistered).toHaveBeenCalledTimes(1);
    } finally {
      if (prevAccess === undefined) delete process.env.JWT_ACCESS_SECRET;
      else process.env.JWT_ACCESS_SECRET = prevAccess;
      if (prevRefresh === undefined) delete process.env.JWT_REFRESH_SECRET;
      else process.env.JWT_REFRESH_SECRET = prevRefresh;
    }
  });

  it('در صورت بروز خطا در ارسال، خطا را مهار می‌کند و جریان اصلی را نمی‌شکند', async () => {
    const { service, baleClient } = buildSetup(true);
    baleClient.broadcastToAdmins.mockRejectedValueOnce(
      new Error('Bale timeout'),
    );

    await expect(
      service.notifyWalletCharged({
        id: 'pay-3',
        userId: 10,
        amount: 200_000,
        orderId: 'WAL-3003',
      } as any),
    ).resolves.toBeUndefined();
  });
});
