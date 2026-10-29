import { Referral, ReferralStatus } from './entities/referral.entity';
import { ReferralService } from './referral.service';

describe('ReferralService rewards', () => {
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
      save: jest.fn(async (referral: Referral) => referral),
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
      save: jest.fn(async (referral: Referral) => referral),
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
      {} as any,
      publicPageService as any,
      dataSource as any,
      walletService as any,
    );
    return {
      service,
      referrals,
      referralRepo,
      publicPageService,
      walletService,
      managerReferralRepo,
    };
  };

  it('does not award the referrer until both five successful paid bookings and a page purchase are met', async () => {
    const insufficientBookings = createService(4, true);
    await insufficientBookings.service.onReferrerBookingActivity('profile-10');
    expect(
      insufficientBookings.walletService.depositOnceWithManager,
    ).not.toHaveBeenCalled();

    const missingPurchase = createService(5, false);
    await missingPurchase.service.onReferrerBookingActivity('profile-10');
    expect(
      missingPurchase.walletService.depositOnceWithManager,
    ).not.toHaveBeenCalled();
  });

  it('awards 300,000 tomans exactly once when both conditions are met', async () => {
    const { service, referrals, walletService, managerReferralRepo } =
      createService(5, true);

    await service.onReferrerBookingActivity('profile-10');

    expect(walletService.depositOnceWithManager).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        userId: 10,
        amount: 300_000,
        description: expect.stringContaining('۵ رزرو موفق'),
        paymentId: 'referral-ref-1',
        legacyReference: 'ref-1',
      }),
    );
    expect(referrals[0]).toMatchObject({
      status: ReferralStatus.COMPLETED,
      rewardPaid: true,
      completedBookingsCount: 5,
    });
    expect(managerReferralRepo.save).toHaveBeenCalled();
  });

  it('rechecks paid bookings when the referrer purchases the public page', async () => {
    const { service, walletService, publicPageService } = createService(
      5,
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
});
