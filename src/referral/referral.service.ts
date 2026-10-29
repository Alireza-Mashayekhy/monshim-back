// src/referral/referral.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { BarberProfile } from 'src/barber/entities/barber.entity';
import { PublicPageService } from 'src/public-page/public-page.service';
import { WalletService } from 'src/wallet/wallet.service';
import { DataSource, EntityManager, Repository } from 'typeorm';

import { Referral, ReferralStatus } from './entities/referral.entity';

@Injectable()
export class ReferralService {
  private readonly logger = new Logger(ReferralService.name);
  private readonly REQUIRED_BOOKINGS = 5;
  private readonly REWARD_AMOUNT = 300_000; // تومان

  constructor(
    @InjectRepository(Referral)
    private referralRepo: Repository<Referral>,
    @InjectRepository(BarberProfile)
    private barberProfileRepo: Repository<BarberProfile>,
    private readonly publicPageService: PublicPageService,
    private readonly dataSource: DataSource,
    private walletService: WalletService,
  ) {}

  /** ثبت دعوت هنگام ثبت‌نام آرایشگر جدید با کد معرف */
  async createReferral(
    referrerUserId: number,
    referredUserId: number,
    manager?: EntityManager,
  ): Promise<Referral | null> {
    const barberProfileRepo = manager
      ? manager.getRepository(BarberProfile)
      : this.barberProfileRepo;
    const referralRepo = manager
      ? manager.getRepository(Referral)
      : this.referralRepo;

    const referrerProfile = await barberProfileRepo.findOne({
      where: { userId: referrerUserId },
    });
    const referredProfile = await barberProfileRepo.findOne({
      where: { userId: referredUserId },
    });

    if (!referrerProfile || !referredProfile) {
      this.logger.warn(
        `Could not create referral: referrer=${referrerUserId}, referred=${referredUserId}`,
      );
      return null;
    }

    const existing = await referralRepo.findOne({
      where: {
        referrerProfileId: referrerProfile.id,
        referredProfileId: referredProfile.id,
      },
    });
    if (existing) return existing;

    const referral = referralRepo.create({
      referrerUserId,
      referredUserId,
      referrerProfileId: referrerProfile.id,
      referredProfileId: referredProfile.id,
      status: ReferralStatus.PENDING,
      completedBookingsCount: 0,
    });

    return referralRepo.save(referral);
  }

  /**
   * فراخوانی پس از تکمیل رزرو یا پرداخت موفق رزروِ آرایشگر.
   * پاداش برای دعوت‌کننده است و به پنج رزرو پرداخت‌شدهٔ خود او نیاز دارد.
   */
  async onReferrerBookingActivity(referrerProfileId: string): Promise<void> {
    try {
      const referrals = await this.referralRepo.find({
        where: { referrerProfileId, status: ReferralStatus.PENDING },
      });
      if (referrals.length === 0) return;

      const [paidBookingsCount, hasPurchasedPage] = await Promise.all([
        this.publicPageService.countSuccessfulPaidBookings(referrerProfileId),
        this.publicPageService.hasPurchasedPackageByUserId(
          referrals[0].referrerUserId,
        ),
      ]);
      await this.updateProgressAndAward(
        referrals,
        paidBookingsCount,
        hasPurchasedPage,
      );
    } catch (error) {
      this.logger.error(
        `Failed to update referral progress for referrer profile ${referrerProfileId}: ${String(error)}`,
      );
    }
  }

  /** ارزیابی دوبارهٔ شرط‌ها پس از خرید صفحهٔ عمومی توسط دعوت‌کننده */
  async onPublicPagePurchased(referrerUserId: number): Promise<void> {
    try {
      const referrals = await this.referralRepo.find({
        where: { referrerUserId, status: ReferralStatus.PENDING },
      });
      if (referrals.length === 0) return;

      const referrerProfileId = referrals[0].referrerProfileId;
      const paidBookingsCount =
        await this.publicPageService.countSuccessfulPaidBookings(
          referrerProfileId,
        );
      await this.updateProgressAndAward(referrals, paidBookingsCount, true);
    } catch (error) {
      this.logger.error(
        `Failed to award referral after public page purchase by user ${referrerUserId}: ${String(error)}`,
      );
    }
  }

  private async updateProgressAndAward(
    referrals: Referral[],
    paidBookingsCount: number,
    hasPurchasedPage: boolean,
  ) {
    for (const referral of referrals) {
      referral.completedBookingsCount = paidBookingsCount;
      if (
        paidBookingsCount >= this.REQUIRED_BOOKINGS &&
        hasPurchasedPage &&
        !referral.rewardPaid
      ) {
        await this.awardReward(referral);
      } else {
        await this.referralRepo.save(referral);
      }
    }
  }

  /** واریز پاداش به کیف پول دعوت‌کننده */
  private async awardReward(referral: Referral): Promise<void> {
    try {
      await this.dataSource.transaction(async manager => {
        const referralRepo = manager.getRepository(Referral);
        const lockedReferral = await referralRepo.findOne({
          where: { id: referral.id },
          lock: { mode: 'pessimistic_write' },
        });
        if (
          !lockedReferral ||
          lockedReferral.rewardPaid ||
          lockedReferral.status !== ReferralStatus.PENDING
        ) {
          return;
        }

        await this.walletService.depositOnceWithManager(manager, {
          userId: lockedReferral.referrerUserId,
          amount: this.REWARD_AMOUNT,
          description: 'پاداش دعوت آرایشگر - ۵ رزرو موفق و خرید صفحهٔ عمومی',
          paymentId: `referral-${lockedReferral.id}`,
          legacyReference: lockedReferral.id,
        });

        lockedReferral.status = ReferralStatus.COMPLETED;
        lockedReferral.rewardPaid = true;
        await referralRepo.save(lockedReferral);
      });

      this.logger.log(
        `Referral reward of ${this.REWARD_AMOUNT} Tomans awarded to user ${referral.referrerUserId}`,
      );
    } catch (error: any) {
      this.logger.error(
        `Failed to award referral reward to user ${referral.referrerUserId}: ${error.message}`,
      );
    }
  }

  /** دریافت دعوت‌های آرایشگر و وضعیت تحقق شرایط پاداش */
  async getMyReferrals(userId: number) {
    const profile = await this.barberProfileRepo.findOne({ where: { userId } });

    if (!profile) {
      return {
        referrals: [],
        stats: { total: 0, completed: 0, pending: 0 },
        eligibility: {
          completedPaidBookingsCount: 0,
          requiredPaidBookings: this.REQUIRED_BOOKINGS,
          hasPurchasedPublicPage: false,
        },
      };
    }

    const [referrals, completedPaidBookingsCount, hasPurchasedPublicPage] =
      await Promise.all([
        this.referralRepo.find({
          where: { referrerProfileId: profile.id },
          relations: { referredProfile: { user: true } },
          order: { createdAt: 'DESC' },
        }),
        this.publicPageService.countSuccessfulPaidBookings(profile.id),
        this.publicPageService.hasPurchasedPackageByUserId(userId),
      ]);

    const stats = {
      total: referrals.length,
      completed: referrals.filter(r => r.status === ReferralStatus.COMPLETED)
        .length,
      pending: referrals.filter(r => r.status === ReferralStatus.PENDING)
        .length,
    };

    return {
      referrals: referrals.map(r => ({
        id: r.id,
        referredUserId: r.referredUserId,
        referredFullName: r.referredProfile?.user?.fullName ?? null,
        referredSalonName: r.referredProfile?.salonName ?? null,
        status: r.status,
        completedBookingsCount: completedPaidBookingsCount,
        rewardPaid: r.rewardPaid,
        createdAt: r.createdAt,
      })),
      stats,
      eligibility: {
        completedPaidBookingsCount,
        requiredPaidBookings: this.REQUIRED_BOOKINGS,
        hasPurchasedPublicPage,
      },
    };
  }

  /** بررسی ثبت‌نام با کد معرف */
  async isAlreadyReferred(referredUserId: number): Promise<boolean> {
    return (await this.referralRepo.count({ where: { referredUserId } })) > 0;
  }
}
