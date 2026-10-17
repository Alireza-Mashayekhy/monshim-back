import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Booking, BookingStatus } from 'src/booking/entities/booking.entity';
import {
  PUBLIC_PAGE_MIN_DEPOSIT_BOOKINGS,
  PUBLIC_PAGE_PACKAGE_PRICE,
} from 'src/common/constants/constants';
import {
  Payment,
  PaymentPurpose,
  PaymentStatus,
} from 'src/payment/entities/payment.entity';
import { User } from 'src/users/entities/user.entity';
import { Repository } from 'typeorm';

import { BarberProfile } from './entities/barber.entity';

export type PublicPageActivationReason = 'package' | 'deposits';

export interface PublicPageStatus {
  /** آیا صفحهٔ عمومی این آرایشگر فعال است */
  active: boolean;
  /** علت فعالیت: خرید پکیج یا تعداد رزروهای بیعانه‌دار */
  reason: PublicPageActivationReason | null;
  /** آیا پکیج صفحه عمومی را خریده است */
  purchased: boolean;
  purchasedAt: string | null;
  /** تعداد رزروهای فعال با بیعانه */
  depositBookingsCount: number;
  requiredDepositBookings: number;
  packagePrice: number;
  /** نشانی صفحهٔ عمومی در صورت فعال بودن */
  publicUrl: string | null;
}

/**
 * منطق فعال‌سازی «صفحهٔ عمومی» آرایشگر.
 *
 * صفحهٔ عمومی آرایشگر (/barber/{userId}) فقط زمانی فعال و قابل سئو است
 * که یکی از این دو شرط برقرار باشد:
 *
 * ۱) آرایشگر پکیج صفحه عمومی (یک‌باره و دائمی) را با موفقیت خریده باشد؛
 * ۲) تعداد رزروهای فعالِ بیعانه‌دارش به حد مجاز برسد. رزرو بیعانه‌دار
 *    یعنی رزروی که مشتری بیعانه‌اش را پرداخت کرده (depositPaidAt) یا
 *    آرایشگر آن را دستی با دکمهٔ لینک بیعانه ثبت کرده (sendDepositLink).
 */
@Injectable()
export class PublicPageService {
  constructor(
    @InjectRepository(BarberProfile)
    private readonly barberProfileRepo: Repository<BarberProfile>,

    @InjectRepository(Booking)
    private readonly bookingRepo: Repository<Booking>,

    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,

    @InjectRepository(User)
    private readonly userRepo: Repository<User>,

    private readonly configService: ConfigService,
  ) {}

  private getFrontUrl(): string {
    return (
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000'
    ).replace(/\/+$/, '');
  }

  /** رکورد پرداخت موفق خرید پکیج صفحه عمومی (در صورت وجود) */
  async findPackagePurchase(userId: number): Promise<Payment | null> {
    return this.paymentRepo.findOne({
      where: {
        userId,
        purpose: PaymentPurpose.PUBLIC_PAGE,
        status: PaymentStatus.PAID,
      },
      order: { paidAt: 'DESC' },
    });
  }

  /**
   * تعداد رزروهای فعال با بیعانهٔ این آرایشگر.
   * رزروهای لغو یا ردشده حساب نمی‌شوند.
   */
  async countDepositBookings(userId: number): Promise<number> {
    return this.bookingRepo
      .createQueryBuilder('booking')
      .innerJoin(BarberProfile, 'profile', 'profile.id = booking.barberId')
      .where('profile.userId = :userId', { userId })
      .andWhere('booking.status NOT IN (:...inactiveStatuses)', {
        inactiveStatuses: [BookingStatus.CANCELED, BookingStatus.REJECTED],
      })
      .andWhere(
        '(booking.depositPaidAt IS NOT NULL OR booking.sendDepositLink = :linkSent)',
        { linkSent: true },
      )
      .getCount();
  }

  async isPublicPageActive(userId: number): Promise<boolean> {
    if (await this.findPackagePurchase(userId)) {
      return true;
    }

    const depositBookings = await this.countDepositBookings(userId);
    return depositBookings >= PUBLIC_PAGE_MIN_DEPOSIT_BOOKINGS;
  }

  async getStatus(userId: number): Promise<PublicPageStatus> {
    const profile = await this.barberProfileRepo.findOne({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException('پروفایل آرایشگری یافت نشد');
    }

    const purchase = await this.findPackagePurchase(userId);
    const depositBookingsCount = await this.countDepositBookings(userId);
    const depositsEligible =
      depositBookingsCount >= PUBLIC_PAGE_MIN_DEPOSIT_BOOKINGS;
    const active = Boolean(purchase) || depositsEligible;

    return {
      active,
      reason: purchase ? 'package' : depositsEligible ? 'deposits' : null,
      purchased: Boolean(purchase),
      purchasedAt: purchase?.paidAt
        ? new Date(purchase.paidAt).toISOString()
        : null,
      depositBookingsCount,
      requiredDepositBookings: PUBLIC_PAGE_MIN_DEPOSIT_BOOKINGS,
      packagePrice: PUBLIC_PAGE_PACKAGE_PRICE,
      publicUrl: active ? `${this.getFrontUrl()}/barber/${userId}` : null,
    };
  }

  /**
   * شناسهٔ کاربری آرایشگرهایی که صفحهٔ عمومی‌شان فعال است
   * (برای sitemap و دایرکتوری عمومی). فقط پروفایل‌های تأییدشده
   * با حساب فعال، همچون خود صفحهٔ عمومی.
   */
  async findActivePublicPageIds(): Promise<{ id: number }[]> {
    const [purchased, depositsQualified] = await Promise.all([
      this.paymentRepo
        .createQueryBuilder('payment')
        .innerJoin(BarberProfile, 'profile', 'profile.userId = payment.userId')
        .innerJoin(User, 'user', 'user.id = payment.userId')
        .select('DISTINCT payment.userId', 'id')
        .where('payment.purpose = :purpose', {
          purpose: PaymentPurpose.PUBLIC_PAGE,
        })
        .andWhere('payment.status = :status', { status: PaymentStatus.PAID })
        .andWhere('profile.isApproved = :approved', { approved: true })
        .andWhere('user.isActive = :userActive', { userActive: true })
        .getRawMany<{ id: number | string }>(),
      this.bookingRepo
        .createQueryBuilder('booking')
        .innerJoin(BarberProfile, 'profile', 'profile.id = booking.barberId')
        .innerJoin(User, 'user', 'user.id = profile.userId')
        .select('profile.userId', 'id')
        .where('booking.status NOT IN (:...inactiveStatuses)', {
          inactiveStatuses: [BookingStatus.CANCELED, BookingStatus.REJECTED],
        })
        .andWhere(
          '(booking.depositPaidAt IS NOT NULL OR booking.sendDepositLink = :linkSent)',
          { linkSent: true },
        )
        .andWhere('profile.isApproved = :approved', { approved: true })
        .andWhere('user.isActive = :userActive', { userActive: true })
        .groupBy('profile.userId')
        .having('COUNT(booking.id) >= :required', {
          required: PUBLIC_PAGE_MIN_DEPOSIT_BOOKINGS,
        })
        .getRawMany<{ id: number | string }>(),
    ]);

    const ids = new Set<number>();
    for (const row of [...purchased, ...depositsQualified]) {
      const id = Number(row.id);
      if (Number.isInteger(id) && id > 0) ids.add(id);
    }

    return [...ids].map(id => ({ id }));
  }
}
