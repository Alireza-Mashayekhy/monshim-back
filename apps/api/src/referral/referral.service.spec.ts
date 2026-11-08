import { Referral, ReferralStatus } from './entities/referral.entity';
import { ReferralService } from './referral.service';

describe('ReferralService rewards', () => {
  const REQUIRED_PAID_BOOKINGS = 30;

  const createService = (
    paidBookingsCount: number,
    hasPurchasedPage: boolean,
  ) => {
    const referrals: Referral[] = [
      {
        id: 'ref-1',
        referrerUserId: 10,
        referredUserId: 20,
        referrerProfileId: 'profile-10',
        referredProfileId: 'profile-20',
        status: ReferralStatus.PENDING,
        completedBookingsCount: 0,
        rewardPaid: false,
      } as Referral,
    ];
    const referralRepo = {
      find: jest.fn().mockResolvedValue(referrals),
      save: jest.fn((referral: Referral) => Promise.resolve(referral)),
    };
    const barberProfileRepo = {
      findOne: jest.fn().mockResolvedValue({ id: 'profile-10', userId: 10 }),
    };
    const publicPageService = {
      countSuccessfulPaidBookings: jest
        .fn()
        .mockResolvedValue(paidBookingsCount),
      hasPurchasedPackageByUserId: jest
        .fn()
        .mockResolvedValue(hasPurchasedPage),
    };
    const managerReferralRepo = {
      findOne: jest.fn().mockResolvedValue(referrals[0]),
      save: jest.fn((referral: Referral) => Promise.resolve(referral)),
    };
    const dataSource = {
      transaction: jest.fn(async (callback: (manager: any) => Promise<void>) =>
        callback({ getRepository: () => managerReferralRepo }),
      ),
    };
    const walletService = {
      depositOnceWithManager: jest.fn().mockResolvedValue({}),
    };
    const service = new ReferralService(
      referralRepo as any,
      barberProfileRepo as any,
      publicPageService as any,
      dataSource as any,
      walletService as any,
    );
    return {
      service,
      referrals,
      referralRepo,
      barberProfileRepo,
      publicPageService,
      walletService,
      managerReferralRepo,
    };
  };

  it('تا زمانی که هیچ‌یک از دو شرط (۳۰ رزرو موفق یا خرید صفحه) محقق نشود پاداشی واریز نمی‌کند', async () => {
    const insufficientBookings = createService(
      REQUIRED_PAID_BOOKINGS - 1,
      false,
    );
    await insufficientBookings.service.onReferrerBookingActivity('profile-10');
    expect(
      insufficientBookings.walletService.depositOnceWithManager,
    ).not.toHaveBeenCalled();

    const noBookingsNoPurchase = createService(0, false);
    await noBookingsNoPurchase.service.onReferrerBookingActivity('profile-10');
    expect(
      noBookingsNoPurchase.walletService.depositOnceWithManager,
    ).not.toHaveBeenCalled();
  });

  it('با رسیدن به ۳۰ رزرو موفقِ پرداخت‌شده، حتی بدون خرید صفحه، پاداش را می‌پردازد', async () => {
    const { service, referrals, walletService, managerReferralRepo } =
      createService(REQUIRED_PAID_BOOKINGS, false);

    await service.onReferrerBookingActivity('profile-10');

    expect(walletService.depositOnceWithManager).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        userId: 10,
        amount: 300_000,
        description: expect.stringContaining('۳۰ رزرو موفق'),
        paymentId: 'referral-ref-1',
        legacyReference: 'ref-1',
      }),
    );
    expect(referrals[0]).toMatchObject({
      status: ReferralStatus.COMPLETED,
      rewardPaid: true,
      completedBookingsCount: REQUIRED_PAID_BOOKINGS,
    });
    expect(managerReferralRepo.save).toHaveBeenCalled();
  });

  it('با خرید صفحهٔ اختصاصی، حتی زیر ۳۰ رزرو، پاداش را می‌پردازد (شرط «یا»)', async () => {
    const { service, walletService, referrals } = createService(3, true);

    await service.onReferrerBookingActivity('profile-10');

    expect(walletService.depositOnceWithManager).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ userId: 10, amount: 300_000 }),
    );
    expect(referrals[0]).toMatchObject({
      status: ReferralStatus.COMPLETED,
      rewardPaid: true,
      completedBookingsCount: 3,
    });
  });

  it('پس از خرید صفحهٔ عمومی، شرط‌ها دوباره ارزیابی و پاداش پرداخت می‌شود', async () => {
    const { service, walletService, publicPageService } = createService(
      0,
      true,
    );

    await service.onPublicPagePurchased(10);

    expect(publicPageService.countSuccessfulPaidBookings).toHaveBeenCalledWith(
      'profile-10',
    );
    expect(walletService.depositOnceWithManager).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ userId: 10, amount: 300_000 }),
    );
  });

  it('اطلاعات شرایط را با حد نصاب ۳۰ رزرو و پرچم isEligible برمی‌گرداند', async () => {
    const notEligible = createService(REQUIRED_PAID_BOOKINGS - 1, false);
    const notEligibleInfo = await notEligible.service.getMyReferrals(10);
    expect(notEligibleInfo.eligibility).toMatchObject({
      completedPaidBookingsCount: REQUIRED_PAID_BOOKINGS - 1,
      requiredPaidBookings: REQUIRED_PAID_BOOKINGS,
      hasPurchasedPublicPage: false,
      isEligible: false,
    });

    const eligibleByBookings = createService(REQUIRED_PAID_BOOKINGS, false);
    const eligibleByBookingsInfo =
      await eligibleByBookings.service.getMyReferrals(10);
    expect(eligibleByBookingsInfo.eligibility).toMatchObject({
      requiredPaidBookings: REQUIRED_PAID_BOOKINGS,
      isEligible: true,
    });

    const eligibleByPurchase = createService(2, true);
    const eligibleByPurchaseInfo =
      await eligibleByPurchase.service.getMyReferrals(10);
    expect(eligibleByPurchaseInfo.eligibility).toMatchObject({
      hasPurchasedPublicPage: true,
      isEligible: true,
    });
  });
  it('پس از ثبت دعوت جدید، اگر دعوت‌کننده از قبل ۳۰ رزرو یا خرید صفحه داشته باشد پاداش فوری پرداخت می‌شود', async () => {
    const alreadyEligibleByPage = createService(0, true);
    await alreadyEligibleByPage.service.onReferralCreated(10);

    expect(
      alreadyEligibleByPage.publicPageService.hasPurchasedPackageByUserId,
    ).toHaveBeenCalledWith(10);
    expect(
      alreadyEligibleByPage.walletService.depositOnceWithManager,
    ).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ userId: 10, amount: 300_000 }),
    );

    const notYetEligible = createService(REQUIRED_PAID_BOOKINGS - 1, false);
    await notYetEligible.service.onReferralCreated(10);
    expect(
      notYetEligible.walletService.depositOnceWithManager,
    ).not.toHaveBeenCalled();
  });
});
