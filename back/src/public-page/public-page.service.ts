import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { BarberService } from 'src/barber/barber.service';
import { BarberProfile } from 'src/barber/entities/barber.entity';
import { Booking } from 'src/booking/entities/booking.entity';
import {
  DEFAULT_FRONT_ORIGIN,
  resolvePublicOrigin,
} from 'src/common/utils/public-url.util';
import { Payment } from 'src/payment/entities/payment.entity';
import { Brackets, In, Repository, WhereExpressionBuilder } from 'typeorm';

import {
  PUBLIC_PAGE_PACKAGE_PRICE_TOMANS,
  PUBLIC_PAGE_REQUIRED_PAID_BOOKINGS,
  PublicPageActivationReason,
} from './constants';
import { BarberPublicPagePurchase } from './entities/barber-public-page-purchase.entity';

export interface PublicPageStatus {
  isActive: boolean;
  reason: PublicPageActivationReason | null;
  /** تعداد نوبت‌هایی که بیعانه یا کل مبلغ‌شان پرداخت شده است */
  paidBookingsCount: number;
  /** حد نصاب نوبت‌های پرداخت‌شده برای فعال‌سازی رایگان */
  requiredPaidBookings: number;
  /** قیمت پکیج به تومان */
  packagePriceTomans: number;
  /** زمان خرید پکیج (در صورت خرید) */
  purchasedAt: string | null;
  /** آدرس صفحهٔ عمومی آرایشگر در سایت */
  publicUrl: string;
  /**
   * آیا پروفایل آرایشگر تایید شده است؟ صفحهٔ عمومی حتی با خرید پکیج هم تا
   * زمانی که پروفایل تایید نشده باشد در دسترس عموم نیست (۴۰۴ می‌دهد).
   */
  isApproved: boolean;
}

interface ActivationState {
  isActive: boolean;
  reason: PublicPageActivationReason | null;
  purchase: BarberPublicPagePurchase | null;
  paidBookingsCount: number;
}

interface DirectoryRow {
  barberProfileId: string;
  updatedAt: Date | string | null;
}

function toDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'number' || typeof value === 'string') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
}

@Injectable()
export class PublicPageService {
  private readonly logger = new Logger(PublicPageService.name);

  constructor(
    @InjectRepository(BarberPublicPagePurchase)
    private readonly purchaseRepo: Repository<BarberPublicPagePurchase>,

    @InjectRepository(BarberProfile)
    private readonly profileRepo: Repository<BarberProfile>,

    @InjectRepository(Booking)
    private readonly bookingRepo: Repository<Booking>,

    private readonly barberService: BarberService,
    private readonly configService: ConfigService,
  ) {}

  private publicUrl(barberUserId: number) {
    // فقط origin استفاده می‌شود تا مقدار اضافه‌ای مثل `/panel` در FRONTEND_URL
    // باعث تولید لینک اشتباه (مثل `.../panel/barber/1`) نشود.
    const frontUrl = resolvePublicOrigin({
      configured: this.configService.get<string>('FRONT_URL'),
      fallback: DEFAULT_FRONT_ORIGIN,
      isProduction: process.env.NODE_ENV === 'production',
    }).origin;

    return `${frontUrl}/barber/${barberUserId}`;
  }

  /** پروفایل آرایشگر را بر اساس شناسهٔ کاربری پیدا می‌کند. */
  private async findProfileByUserId(userId: number) {
    return this.profileRepo.findOne({
      where: { userId },
      select: { id: true, userId: true, isApproved: true, salonName: true },
    });
  }

  /** آیا پکیج برای این پروفایل خریده شده است؟ */
  private async findPurchase(barberProfileId: string) {
    return this.purchaseRepo.findOne({
      where: { barberProfileId },
      order: { createdAt: 'DESC' },
    });
  }

  /** تعداد نوبت‌های پرداخت‌شدهٔ یک آرایشگر (تجمعی، بدون محدودیت زمانی). */
  private async countPaidBookings(barberProfileId: string) {
    return this.bookingRepo
      .createQueryBuilder('booking')
      .where('booking.barberId = :barberProfileId', { barberProfileId })
      .andWhere(
        new Brackets(qb => {
          qb.where('booking.depositPaidAt IS NOT NULL').orWhere(
            'booking.onlinePaidAt IS NOT NULL',
          );
        }),
      )
      .getCount();
  }

  /** شرط «نوبت پرداخت‌شده»: بیعانهٔ پرداخت‌شده یا پرداخت کامل آنلاین. */
  private paidBookingsFilter(qb: WhereExpressionBuilder) {
    return qb
      .where('booking.depositPaidAt IS NOT NULL')
      .orWhere('booking.onlinePaidAt IS NOT NULL');
  }

  /**
   * شرط فعال‌بودن: خرید پکیج **یا** رسیدن به حد نصاب نوبت‌های پرداخت‌شده.
   * همیشه هر دو را می‌خوانیم چون پنل آرایشگر باید تعداد نوبت‌های پرداخت‌شده را
   * (حتی پس از خرید پکیج) نمایش بدهد.
   */
  private async computeState(
    barberProfileId: string,
  ): Promise<ActivationState> {
    const purchase = await this.findPurchase(barberProfileId);
    const paidBookingsCount = await this.countPaidBookings(barberProfileId);
    const reachedThreshold =
      paidBookingsCount >= PUBLIC_PAGE_REQUIRED_PAID_BOOKINGS;

    return {
      isActive: Boolean(purchase) || reachedThreshold,
      reason: purchase ? 'PACKAGE' : reachedThreshold ? 'PAID_BOOKINGS' : null,
      purchase,
      paidBookingsCount,
    };
  }

  /** وضعیت صفحهٔ عمومی برای آرایشگرِ جاری (از روی شناسهٔ کاربری). */
  async getStatusByUserId(userId: number): Promise<PublicPageStatus> {
    const profile = await this.findProfileByUserId(userId);
    return this.buildStatus(profile, userId);
  }

  private async buildStatus(
    profile: Pick<BarberProfile, 'id' | 'userId' | 'isApproved'> | null,
    userId: number,
  ): Promise<PublicPageStatus> {
    const base: PublicPageStatus = {
      isActive: false,
      reason: null,
      paidBookingsCount: 0,
      requiredPaidBookings: PUBLIC_PAGE_REQUIRED_PAID_BOOKINGS,
      packagePriceTomans: PUBLIC_PAGE_PACKAGE_PRICE_TOMANS,
      purchasedAt: null,
      publicUrl: this.publicUrl(userId),
      isApproved: false,
    };

    if (!profile) return base;

    const state = await this.computeState(profile.id);

    return {
      ...base,
      isActive: state.isActive,
      reason: state.reason,
      paidBookingsCount: state.paidBookingsCount,
      purchasedAt: state.purchase?.createdAt
        ? state.purchase.createdAt.toISOString()
        : null,
      isApproved: Boolean(profile.isApproved),
    };
  }

  /**
   * پروفایل عمومی آرایشگر؛ فقط در صورتی که هم واجد شرایطِ نمایش عمومی باشد
   * (تأییدشده، فعال، دارای خدمت) و هم صفحهٔ عمومی‌اش فعال شده باشد.
   * در غیر این صورت ۴۰۴ می‌دهد تا نه ایندکس شود و نه با URL دستی باز شود.
   */
  async getPublicBarberPage(barberUserId: number) {
    // `findPublicOne` خودش شرط‌های تأیید/فعال‌بودن/خدمت را اعمال می‌کند و در
    // صورت عدم احراز، ۴۰۴ پرتاب می‌کند.
    const barber = await this.barberService.findPublicOne(barberUserId);

    const profile = await this.findProfileByUserId(barberUserId);
    if (!profile) {
      throw new NotFoundException('آرایشگاه یافت نشد');
    }

    // خرید پکیج اول بررسی می‌شود: در این صورت نیازی به شمارش نوبت‌ها نیست.
    const purchase = await this.findPurchase(profile.id);
    if (!purchase) {
      const paidBookingsCount = await this.countPaidBookings(profile.id);
      if (paidBookingsCount < PUBLIC_PAGE_REQUIRED_PAID_BOOKINGS) {
        throw new NotFoundException('صفحهٔ اختصاصی این آرایشگاه فعال نیست');
      }
    }

    return {
      ...barber,
      publicPage: {
        isActive: true,
        reason: purchase ? 'PACKAGE' : 'PAID_BOOKINGS',
        url: this.publicUrl(barberUserId),
      },
    };
  }

  /**
   * فهرست شناسهٔ کاربریِ آرایشگرهایی که صفحهٔ عمومی‌شان فعال است و باید در
   * sitemap بیایند. خروجی با فهرستِ آرایشگرهای واجد شرایطِ نمایش عمومی تلاقی
   * می‌خورد تا صفحه‌ای که قرار است ۴۰۴ بدهد وارد sitemap نشود.
   */
  async getActiveDirectory(): Promise<
    { id: number; updatedAt: string | null }[]
  > {
    const { barbers } = await this.barberService.getPublicDirectory();
    const eligibleUserIds = [
      ...new Set(barbers.map(item => Number(item.id)).filter(Number.isInteger)),
    ];
    if (eligibleUserIds.length === 0) return [];

    const profiles = await this.profileRepo.find({
      where: { userId: In(eligibleUserIds) },
      select: { id: true, userId: true },
    });
    if (profiles.length === 0) return [];

    const userIdByProfileId = new Map<string, number>();
    for (const profile of profiles) {
      userIdByProfileId.set(profile.id, profile.userId);
    }
    const profileIds = [...userIdByProfileId.keys()];

    const purchases = await this.purchaseRepo
      .createQueryBuilder('purchase')
      .select('purchase.barberProfileId', 'barberProfileId')
      .addSelect('MAX(purchase.createdAt)', 'updatedAt')
      .where('purchase.barberProfileId IN (:...profileIds)', { profileIds })
      .groupBy('purchase.barberProfileId')
      .getRawMany<DirectoryRow>();

    const qualified = await this.bookingRepo
      .createQueryBuilder('booking')
      .select('booking.barberId', 'barberProfileId')
      .addSelect('MAX(booking.updatedAt)', 'updatedAt')
      .where('booking.barberId IN (:...profileIds)', { profileIds })
      .andWhere(
        new Brackets(qb => {
          this.paidBookingsFilter(qb);
        }),
      )
      .groupBy('booking.barberId')
      .having('COUNT(booking.id) >= :required', {
        required: PUBLIC_PAGE_REQUIRED_PAID_BOOKINGS,
      })
      .getRawMany<DirectoryRow>();

    const updatedAtByProfileId = new Map<string, Date | null>();
    const register = (rows: DirectoryRow[]) => {
      for (const row of rows) {
        if (!row?.barberProfileId) continue;
        if (!userIdByProfileId.has(row.barberProfileId)) continue;
        const date = toDate(row.updatedAt);
        const current = updatedAtByProfileId.get(row.barberProfileId) ?? null;
        if (date && (!current || date > current)) {
          updatedAtByProfileId.set(row.barberProfileId, date);
        } else if (!updatedAtByProfileId.has(row.barberProfileId)) {
          updatedAtByProfileId.set(row.barberProfileId, null);
        }
      }
    };
    register(purchases);
    register(qualified);

    return [...updatedAtByProfileId.entries()]
      .map(([barberProfileId, updatedAt]) => ({
        id: userIdByProfileId.get(barberProfileId) as number,
        updatedAt: updatedAt ? updatedAt.toISOString() : null,
      }))
      .filter(entry => Number.isInteger(entry.id) && entry.id > 0)
      .sort((a, b) => a.id - b.id);
  }

  /**
   * فعال‌سازی صفحهٔ عمومی پس از پرداخت موفق پکیج.
   * نسبت به کال‌بک‌های تکراریِ درگاه باید idempotent باشد.
   */
  async activateAfterPayment(payment: Payment) {
    const existing = payment.id
      ? await this.purchaseRepo.findOne({
          where: { paymentId: payment.id },
        })
      : null;
    if (existing) return existing;

    const profile = await this.findProfileByUserId(payment.userId);
    if (!profile) {
      throw new NotFoundException('پروفایل آرایشگر برای خرید صفحه یافت نشد');
    }

    const purchase = this.purchaseRepo.create({
      userId: payment.userId,
      barberProfileId: profile.id,
      amount: Number(payment.amount ?? PUBLIC_PAGE_PACKAGE_PRICE_TOMANS),
      paymentId: payment.id ?? null,
    });

    const saved = await this.purchaseRepo.save(purchase);
    this.logger.log(
      `Public page activated for barber user ${payment.userId} (payment ${payment.orderId})`,
    );
    return saved;
  }
}
