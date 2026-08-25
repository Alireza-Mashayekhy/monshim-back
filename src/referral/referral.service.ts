// src/referral/referral.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { BarberProfile } from 'src/barber/entities/barber.entity';
import { Booking, BookingStatus } from 'src/booking/entities/booking.entity';
import { WalletService } from 'src/wallet/wallet.service';
import { Repository } from 'typeorm';

import { Referral, ReferralStatus } from './entities/referral.entity';

@Injectable()
export class ReferralService {
  private readonly logger = new Logger(ReferralService.name);
  private readonly REQUIRED_BOOKINGS = 5; // تعداد رزروهای مورد نیاز
  private readonly REWARD_AMOUNT = 50000; // مبلغ پاداش (تومان)

  constructor(
    @InjectRepository(Referral)
    private referralRepo: Repository<Referral>,
    @InjectRepository(BarberProfile)
    private barberProfileRepo: Repository<BarberProfile>,
    @InjectRepository(Booking)
    private bookingRepo: Repository<Booking>,
    private walletService: WalletService,
  ) {}

  /**
   * ثبت یک رکورد دعوت وقتی آرایشگر جدید با کد معرف ثبت‌نام می‌کند
   */
  async createReferral(
    referrerUserId: number,
    referredUserId: number,
  ): Promise<Referral | null> {
    // پیدا کردن پروفایل دعوت‌کننده
    const referrerProfile = await this.barberProfileRepo.findOne({
      where: { userId: referrerUserId },
    });

    // پیدا کردن پروفایل دعوت‌شده
    const referredProfile = await this.barberProfileRepo.findOne({
      where: { userId: referredUserId },
    });

    if (!referrerProfile || !referredProfile) {
      this.logger.warn(
        `Could not create referral: referrer=${referrerUserId}, referred=${referredUserId}`,
      );
      return null;
    }

    // بررسی تکراری نبودن
    const existing = await this.referralRepo.findOne({
      where: {
        referrerProfileId: referrerProfile.id,
        referredProfileId: referredProfile.id,
      },
    });

    if (existing) {
      return existing;
    }

    const referral = this.referralRepo.create({
      referrerUserId,
      referredUserId,
      referrerProfileId: referrerProfile.id,
      referredProfileId: referredProfile.id,
      status: ReferralStatus.PENDING,
      completedBookingsCount: 0,
    });

    return this.referralRepo.save(referral);
  }

  /**
   * بررسی و به‌روزرسانی تعداد رزروهای تکمیل شده
   * این متد هنگام تکمیل هر رزرو فراخوانی می‌شود
   */
  async onBookingCompleted(referredUserId: number): Promise<void> {
    // پیدا کردن رکورد فعال (PENDING) برای این کاربر
    const referral = await this.referralRepo.findOne({
      where: {
        referredUserId,
        status: ReferralStatus.PENDING,
      },
    });

    if (!referral) {
      return; // رکورد دعوتی وجود ندارد یا قبلاً پاداش دریافت شده
    }

    // شمارش رزروهای تکمیل شده توسط دعوت‌شده
    const completedCount = await this.bookingRepo.count({
      where: {
        customerId: referredUserId,
        status: BookingStatus.COMPLETED,
      },
    });

    // به‌روزرسانی تعداد
    referral.completedBookingsCount = completedCount;

    // اگر به تعداد کافی رسید، پاداش بده
    if (completedCount >= this.REQUIRED_BOOKINGS && !referral.rewardPaid) {
      await this.awardReward(referral);
    } else {
      await this.referralRepo.save(referral);
    }
  }

  /**
   * پرداخت پاداش به دعوت‌کننده
   */
  private async awardReward(referral: Referral): Promise<void> {
    try {
      // افزایش موجودی کیف پول دعوت‌کننده
      await this.walletService.deposit(
        referral.referrerUserId,
        this.REWARD_AMOUNT,
        `پاداش دعوت آرایشگر - تکمیل ${this.REQUIRED_BOOKINGS} رزرو`,
        referral.id,
      );

      // به‌روزرسانی وضعیت
      referral.status = ReferralStatus.COMPLETED;
      referral.rewardPaid = true;
      await this.referralRepo.save(referral);

      this.logger.log(
        `Referral reward of ${this.REWARD_AMOUNT} Tomans awarded to user ${referral.referrerUserId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to award referral reward to user ${referral.referrerUserId}: ${error.message}`,
      );
    }
  }

  /**
   * دریافت لیست دعوت‌های انجام شده توسط یک آرایشگر
   */
  async getMyReferrals(userId: number) {
    const profile = await this.barberProfileRepo.findOne({
      where: { userId },
    });

    if (!profile) {
      return { referrals: [], stats: { total: 0, completed: 0, pending: 0 } };
    }

    const referrals = await this.referralRepo.find({
      where: { referrerProfileId: profile.id },
      relations: {
        referredProfile: true,
      },
      order: { createdAt: 'DESC' },
    });

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
        status: r.status,
        completedBookingsCount: r.completedBookingsCount,
        rewardPaid: r.rewardPaid,
        createdAt: r.createdAt,
      })),
      stats,
    };
  }

  /**
   * بررسی اینکه آیا کاربر قبلاً با کد معرف ثبت‌نام کرده
   */
  async isAlreadyReferred(referredUserId: number): Promise<boolean> {
    const count = await this.referralRepo.count({
      where: { referredUserId },
    });
    return count > 0;
  }
}
