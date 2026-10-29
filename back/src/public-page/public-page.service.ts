import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { BarberService } from 'src/barber/barber.service';
import { BarberProfile } from 'src/barber/entities/barber.entity';
import {
  ACTIVE_BOOKING_STATUSES,
  Booking,
} from 'src/booking/entities/booking.entity';
import { isDuplicateEntryError } from 'src/common/utils/db-error.util';
import {
  DEFAULT_FRONT_ORIGIN,
  resolvePublicOrigin,
} from 'src/common/utils/public-url.util';
import {
  Payment,
  PaymentPurpose,
  PaymentStatus,
} from 'src/payment/entities/payment.entity';
import {
  NOT_REFUNDED_PARAMS,
  notRefundedCondition,
} from 'src/payment/payment-ledger';
import { Referral } from 'src/referral/entities/referral.entity';
import { Brackets, In, IsNull, Repository, SelectQueryBuilder } from 'typeorm';

import {
  PUBLIC_PAGE_PACKAGE_PRICE_TOMANS,
  PUBLIC_PAGE_REQUIRED_PAID_BOOKINGS,
  REFERRAL_PUBLIC_PAGE_DISCOUNT_PERCENT,
  PublicPageActivationReason,
} from './constants';
import { CreatePublicPageDiscountDto } from './dto/create-public-page-discount.dto';
import { UpdatePublicPageDiscountDto } from './dto/update-public-page-discount.dto';
import { BarberPublicPagePurchase } from './entities/barber-public-page-purchase.entity';
import { PublicPageDiscount } from './entities/public-page-discount.entity';
import { validatePublicPageSlug } from './slug.util';

export interface PublicPageStatus {
  isActive: boolean;
  reason: PublicPageActivationReason | null;
  /** تعداد رزروهای موفقی که در درگاه پرداخت شده و لغو/برگشت نشده‌اند */
  paidBookingsCount: number;
  /** حد نصاب رزروهای موفق برای فعال‌سازی رایگان */
  requiredPaidBookings: number;
  /** قیمت پکیج به تومان */
  packagePriceTomans: number;
  /** زمان خرید پکیج (در صورت خرید) */
  purchasedAt: string | null;
  /** اسلاگ یکتای انتخاب‌شده توسط آرایشگر */
  slug: string | null;
  /**
   * آیا اسلاگ قفل شده است؟ (اسلاگ فقط **یک بار** قابل ثبت است و پس از ثبت
   * به‌دلیل حفظ آدرس و رتبهٔ سئو قابل تغییر نیست)
   */
  isSlugLocked: boolean;
  /** آدرس صفحهٔ عمومی آرایشگر در سایت؛ فقط پس از فعال‌سازی و ثبت اسلاگ مقدار دارد */
  publicUrl: string | null;
  /**
   * آیا پروفایل آرایشگر تایید شده است؟ صفحهٔ عمومی حتی با خرید پکیج هم تا
   * زمانی که پروفایل تایید نشده باشد در دسترس عموم نیست (۴۰۴ می‌دهد).
   */
  isApproved: boolean;
  /** آیا خرید صفحه برای این آرایشگر مشمول تخفیف ویژهٔ ثبت‌نام با کد معرف است؟ */
  hasReferralDiscount: boolean;
}

export interface SlugAvailabilityResult {
  slug: string;
  valid: boolean;
  available: boolean;
  isCurrentUser: boolean;
  reason: string;
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

/**
 * پیام خطای مشترکِ «اسلاگ فقط یک بار» — هم در API و هم در متن خطای فرانت
 * استفاده می‌شود تا پیام یکسان بماند.
 */
export const PUBLIC_PAGE_SLUG_LOCKED_MESSAGE =
  'آدرس اختصاصی (اسلاگ) صفحهٔ شما قبلاً ثبت شده و قابل تغییر نیست؛ اسلاگ فقط یک بار قابل انتخاب است و تغییر آن به رتبهٔ سئوی صفحه آسیب می‌زند. در صورت نیاز به اصلاح، با پشتیبانی تماس بگیرید.';

type PublicPageProfileRow = Pick<
  BarberProfile,
  'id' | 'userId' | 'isApproved' | 'salonName' | 'slug'
>;

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

    @InjectRepository(PublicPageDiscount)
    private readonly discountRepo: Repository<PublicPageDiscount>,

    @InjectRepository(BarberProfile)
    private readonly profileRepo: Repository<BarberProfile>,

    @InjectRepository(Booking)
    private readonly bookingRepo: Repository<Booking>,

    @InjectRepository(Referral)
    private readonly referralRepo: Repository<Referral>,

    private readonly barberService: BarberService,
    private readonly configService: ConfigService,
  ) {}

  private publicUrl(slug: string) {
    // فقط origin استفاده می‌شود تا مقدار اضافه‌ای مثل `/panel` در FRONTEND_URL
    // باعث تولید لینک اشتباه نشود.
    const frontUrl = resolvePublicOrigin({
      configured: this.configService.get<string>('FRONT_URL'),
      fallback: DEFAULT_FRONT_ORIGIN,
      isProduction: process.env.NODE_ENV === 'production',
    }).origin;

    return `${frontUrl}/barber/${encodeURIComponent(slug)}`;
  }

  /** پروفایل آرایشگر را بر اساس شناسهٔ کاربری پیدا می‌کند. */
  private async findProfileByUserId(
    userId: number,
  ): Promise<PublicPageProfileRow | null> {
    return this.profileRepo.findOne({
      where: { userId },
      select: {
        id: true,
        userId: true,
        isApproved: true,
        salonName: true,
        slug: true,
      },
    });
  }

  /** پروفایل آرایشگر را بر اساس اسلاگ پیدا می‌کند. */
  private async findProfileBySlug(
    slug: string,
  ): Promise<PublicPageProfileRow | null> {
    return this.profileRepo.findOne({
      where: { slug },
      select: {
        id: true,
        userId: true,
        isApproved: true,
        salonName: true,
        slug: true,
      },
    });
  }

  /** آیا پکیج برای این پروفایل خریده شده است؟ */
  private async findPurchase(barberProfileId: string) {
    return this.purchaseRepo.findOne({
      where: { barberProfileId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * شرط واحد «رزرو موفقِ پرداخت‌شده در درگاه» (هم‌راستا با امور مالی):
   *  ۱. وضعیت نوبت لغو یا رد نشده باشد (`ACTIVE_BOOKING_STATUSES`)؛
   *  ۲. پرداخت آنلاین یا بیعانه روی نوبت ثبت شده باشد؛
   *  ۳. یک رکورد `Payment` موفق (`PAID`) و برگشت‌نخورده برای این نوبت در درگاه
   *     ثبت شده باشد (`notRefundedCondition`).
   */
  private applySuccessfulGatewayPaidBookingsFilter(
    qb: SelectQueryBuilder<Booking>,
  ): SelectQueryBuilder<Booking> {
    const paidGatewaySubQuery = qb
      .subQuery()
      .select('1')
      .from(Payment, 'gatewayPayment')
      .where('gatewayPayment.purpose = :bookingPaymentPurpose')
      .andWhere('gatewayPayment.status = :paidPaymentStatus')
      .andWhere(
        "(gatewayPayment.purposeId = booking.id OR gatewayPayment.metadata LIKE CONCAT('%', booking.id, '%'))",
      )
      .andWhere(
        notRefundedCondition('gatewayPayment.id', 'gatewayPayment.metadata'),
      )
      .getQuery();

    return qb
      .andWhere('booking.status IN (:...activeBookingStatuses)', {
        activeBookingStatuses: ACTIVE_BOOKING_STATUSES,
      })
      .andWhere(
        new Brackets(paidQb => {
          paidQb
            .where('booking.depositPaidAt IS NOT NULL')
            .orWhere('booking.onlinePaidAt IS NOT NULL');
        }),
      )
      .andWhere(`EXISTS ${paidGatewaySubQuery}`, {
        bookingPaymentPurpose: PaymentPurpose.BOOKING,
        paidPaymentStatus: PaymentStatus.PAID,
        ...NOT_REFUNDED_PARAMS,
      });
  }

  /** تعداد رزروهای موفقِ پرداخت‌شده در درگاه برای یک آرایشگر (تجمعی). */
  /** تعداد رزروهای موفقِ پرداخت‌شده برای مصرف در منطق پاداش معرف نیز استفاده می‌شود. */
  async countSuccessfulPaidBookings(barberProfileId: string) {
    const qb = this.bookingRepo
      .createQueryBuilder('booking')
      .where('booking.barberId = :barberProfileId', { barberProfileId });

    return this.applySuccessfulGatewayPaidBookingsFilter(qb).getCount();
  }

  private countPaidBookings(barberProfileId: string) {
    return this.countSuccessfulPaidBookings(barberProfileId);
  }

  /** صفحه باید واقعاً خریداری شده باشد؛ فعال‌شدن رایگان با رزرو جای خرید را نمی‌گیرد. */
  async hasPurchasedPackageByUserId(userId: number): Promise<boolean> {
    const profile = await this.profileRepo.findOne({
      where: { userId },
      select: { id: true },
    });
    if (!profile) return false;

    return Boolean(
      await this.purchaseRepo.findOne({
        where: { barberProfileId: profile.id },
        select: { id: true },
      }),
    );
  }

  /** فقط حساب‌هایی که واقعاً با کد معرف ثبت شده‌اند، مشمول تخفیف هستند. */
  async hasReferralDiscount(userId: number): Promise<boolean> {
    return (
      (await this.referralRepo.count({ where: { referredUserId: userId } })) > 0
    );
  }

  async getReferralDiscountQuote(userId: number) {
    if (!(await this.hasReferralDiscount(userId))) return null;

    const discountAmount = Math.round(
      (PUBLIC_PAGE_PACKAGE_PRICE_TOMANS *
        REFERRAL_PUBLIC_PAGE_DISCOUNT_PERCENT) /
        100,
    );
    return {
      code: null,
      percentOff: REFERRAL_PUBLIC_PAGE_DISCOUNT_PERCENT,
      originalAmount: PUBLIC_PAGE_PACKAGE_PRICE_TOMANS,
      discountAmount,
      amount: PUBLIC_PAGE_PACKAGE_PRICE_TOMANS - discountAmount,
    };
  }

  /**
   * شرط فعال‌بودن: خرید پکیج **یا** رسیدن به حد نصاب رزروهای موفقِ پرداخت‌شده.
   * همیشه هر دو را می‌خوانیم چون پنل آرایشگر باید تعداد رزروهای موفق را
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
    return this.buildStatus(profile);
  }

  private async buildStatus(
    profile: PublicPageProfileRow | null,
    precomputedState?: ActivationState,
  ): Promise<PublicPageStatus> {
    const base: PublicPageStatus = {
      isActive: false,
      reason: null,
      paidBookingsCount: 0,
      requiredPaidBookings: PUBLIC_PAGE_REQUIRED_PAID_BOOKINGS,
      packagePriceTomans: PUBLIC_PAGE_PACKAGE_PRICE_TOMANS,
      purchasedAt: null,
      slug: null,
      isSlugLocked: false,
      publicUrl: null,
      isApproved: false,
      hasReferralDiscount: false,
    };

    if (!profile) return base;

    const [state, hasReferralDiscount] = await Promise.all([
      precomputedState ?? this.computeState(profile.id),
      this.hasReferralDiscount(profile.userId),
    ]);
    const slug = profile.slug?.trim() || null;

    return {
      ...base,
      isActive: state.isActive,
      reason: state.reason,
      paidBookingsCount: state.paidBookingsCount,
      purchasedAt: state.purchase?.createdAt
        ? state.purchase.createdAt.toISOString()
        : null,
      slug,
      isSlugLocked: Boolean(slug),
      publicUrl: state.isActive && slug ? this.publicUrl(slug) : null,
      isApproved: Boolean(profile.isApproved),
      hasReferralDiscount,
    };
  }

  /** بررسی آزاد و معتبر بودن اسلاگ پیشنهادی برای آرایشگر جاری. */
  async checkSlugAvailability(
    userId: number,
    rawSlug: string,
  ): Promise<SlugAvailabilityResult> {
    const validation = validatePublicPageSlug(rawSlug);
    if (!validation.valid) {
      return {
        slug: validation.slug,
        valid: false,
        available: false,
        isCurrentUser: false,
        reason: validation.reason,
      };
    }

    const [myProfile, existing] = await Promise.all([
      this.findProfileByUserId(userId),
      this.profileRepo.findOne({
        where: { slug: validation.slug },
        select: { id: true, userId: true },
      }),
    ]);

    // آرایشگری که اسلاگش را ثبت کرده دیگر نمی‌تواند اسلاگ دیگری بردارد.
    const myCurrentSlug = myProfile?.slug?.trim() || null;
    if (myCurrentSlug && myCurrentSlug !== validation.slug) {
      return {
        slug: validation.slug,
        valid: true,
        available: false,
        isCurrentUser: false,
        reason: PUBLIC_PAGE_SLUG_LOCKED_MESSAGE,
      };
    }

    if (existing) {
      if (myProfile && existing.id === myProfile.id) {
        return {
          slug: validation.slug,
          valid: true,
          available: true,
          isCurrentUser: true,
          reason: 'این اسلاگ هم‌اکنون برای سالن شما ثبت شده است',
        };
      }

      return {
        slug: validation.slug,
        valid: true,
        available: false,
        isCurrentUser: false,
        reason: 'این اسلاگ قبلاً توسط سالن دیگری انتخاب شده است',
      };
    }

    return {
      slug: validation.slug,
      valid: true,
      available: true,
      isCurrentUser: false,
      reason: 'این اسلاگ آزاد و قابل ثبت است',
    };
  }

  /**
   * ثبت **یک‌بارهٔ** اسلاگ یکتا پس از فعال‌سازی صفحهٔ اختصاصی آرایشگر.
   *
   * چرا یک‌باره؟ آدرس عمومی `/barber/[slug]` مبنای ایندکس گوگل و لینک‌های
   * خارجی است؛ تغییر آن باعث از دست رفتن رتبهٔ سئو و ۴۰۴ شدن لینک‌های قبلی
   * می‌شود. بنابراین بعد از ثبت، تغییر اسلاگ از مسیر پنل ممکن نیست.
   * ثبت دوبارهٔ همان اسلاگ، عملیات بی‌اثر (idempotent) است.
   */
  async updateSlugByUserId(
    userId: number,
    rawSlug: string,
  ): Promise<PublicPageStatus> {
    const profile = await this.findProfileByUserId(userId);
    if (!profile) {
      throw new NotFoundException('پروفایل آرایشگر یافت نشد');
    }

    const state = await this.computeState(profile.id);
    if (!state.isActive) {
      throw new BadRequestException(
        'صفحهٔ اختصاصی شما هنوز فعال نشده است؛ پس از فعال‌سازی می‌توانید اسلاگ ثبت کنید',
      );
    }

    const validation = validatePublicPageSlug(rawSlug);
    if (!validation.valid) {
      throw new BadRequestException(validation.reason);
    }

    const currentSlug = profile.slug?.trim() || null;

    // اسلاگ قبلاً ثبت شده است: فقط همان مقدار پذیرفته می‌شود (no-op) و هر
    // مقدار دیگری با خطای صریح رد می‌شود.
    if (currentSlug) {
      if (currentSlug === validation.slug) {
        return this.buildStatus(profile, state);
      }

      this.logger.warn(
        `Rejected public page slug change for barber user ${userId} ("${currentSlug}" -> "${validation.slug}")`,
      );
      throw new ConflictException(PUBLIC_PAGE_SLUG_LOCKED_MESSAGE);
    }

    const existing = await this.profileRepo.findOne({
      where: { slug: validation.slug },
      select: { id: true },
    });
    if (existing && existing.id !== profile.id) {
      throw new ConflictException(
        'این اسلاگ تکراری است و قبلاً توسط آرایشگر دیگری انتخاب شده است',
      );
    }

    try {
      // شرط `slug IS NULL` تضمین می‌کند حتی در درخواست‌های هم‌زمان هم اسلاگ
      // فقط یک بار نوشته شود (نوشتن دوم هیچ ردیفی را تغییر نمی‌دهد).
      const result = await this.profileRepo.update(
        { id: profile.id, slug: IsNull() },
        { slug: validation.slug },
      );

      if (result?.affected === 0) {
        throw new ConflictException(PUBLIC_PAGE_SLUG_LOCKED_MESSAGE);
      }
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      if (isDuplicateEntryError(error)) {
        throw new ConflictException(
          'این اسلاگ تکراری است و قبلاً توسط آرایشگر دیگری انتخاب شده است',
        );
      }
      throw error;
    }

    profile.slug = validation.slug;
    this.logger.log(
      `Public page slug set to "${validation.slug}" (one-time) for barber user ${userId}`,
    );

    return this.buildStatus(profile, state);
  }

  private async resolveActivePublicPage(profile: PublicPageProfileRow) {
    const slug = profile.slug?.trim();
    if (!slug) {
      throw new NotFoundException('صفحهٔ اختصاصی این آرایشگاه فعال نیست');
    }

    // `findPublicOne` خودش شرط‌های تأیید/فعال‌بودن/خدمت را اعمال می‌کند و در
    // صورت عدم احراز، ۴۰۴ پرتاب می‌کند.
    const barber = await this.barberService.findPublicOne(profile.userId);

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
      slug,
      publicPage: {
        isActive: true,
        reason: purchase ? 'PACKAGE' : 'PAID_BOOKINGS',
        slug,
        url: this.publicUrl(slug),
      },
    };
  }

  /**
   * پروفایل عمومی آرایشگر بر اساس اسلاگ (یا شناسهٔ عددی برای ریدایرکت به اسلاگ)؛
   * فقط در صورتی که هم واجد شرایطِ نمایش عمومی باشد، هم صفحهٔ عمومی‌اش فعال
   * شده باشد و هم آرایشگر اسلاگ ثبت کرده باشد. در غیر این صورت ۴۰۴ می‌دهد.
   */
  async getPublicBarberPage(identifier: string) {
    const trimmed = String(identifier ?? '').trim();
    if (!trimmed) {
      throw new NotFoundException('آرایشگاه یافت نشد');
    }

    if (/^\d+$/.test(trimmed)) {
      const numericId = Number(trimmed);
      if (!Number.isSafeInteger(numericId) || numericId < 1) {
        throw new NotFoundException('آرایشگاه یافت نشد');
      }
      const profile = await this.findProfileByUserId(numericId);
      if (!profile) {
        throw new NotFoundException('آرایشگاه یافت نشد');
      }
      return this.resolveActivePublicPage(profile);
    }

    const validation = validatePublicPageSlug(trimmed);
    if (!validation.valid) {
      throw new NotFoundException('آرایشگاه یافت نشد');
    }

    const profile = await this.findProfileBySlug(validation.slug);
    if (!profile) {
      throw new NotFoundException('آرایشگاه یافت نشد');
    }

    return this.resolveActivePublicPage(profile);
  }

  /**
   * فهرست اسلاگِ آرایشگرهایی که صفحهٔ عمومی‌شان فعال است و اسلاگ ثبت کرده‌اند
   * (مبنای sitemap). خروجی با فهرستِ آرایشگرهای واجد شرایطِ نمایش عمومی تلاقی
   * می‌خورد تا صفحه‌ای که قرار است ۴۰۴ بدهد وارد sitemap نشود.
   */
  async getActiveDirectory(): Promise<
    { id: number; slug: string; updatedAt: string | null }[]
  > {
    const { barbers } = await this.barberService.getPublicDirectory();
    const eligibleUserIds = [
      ...new Set(barbers.map(item => Number(item.id)).filter(Number.isInteger)),
    ];
    if (eligibleUserIds.length === 0) return [];

    const profiles = await this.profileRepo.find({
      where: { userId: In(eligibleUserIds) },
      select: { id: true, userId: true, slug: true },
    });
    if (profiles.length === 0) return [];

    const profileMetaById = new Map<string, { userId: number; slug: string }>();
    for (const profile of profiles) {
      const slug = profile.slug?.trim();
      if (!slug) continue;
      profileMetaById.set(profile.id, { userId: profile.userId, slug });
    }
    const profileIds = [...profileMetaById.keys()];
    if (profileIds.length === 0) return [];

    const purchases = await this.purchaseRepo
      .createQueryBuilder('purchase')
      .select('purchase.barberProfileId', 'barberProfileId')
      .addSelect('MAX(purchase.createdAt)', 'updatedAt')
      .where('purchase.barberProfileId IN (:...profileIds)', { profileIds })
      .groupBy('purchase.barberProfileId')
      .getRawMany<DirectoryRow>();

    const qualifiedQb = this.bookingRepo
      .createQueryBuilder('booking')
      .select('booking.barberId', 'barberProfileId')
      .addSelect('MAX(booking.updatedAt)', 'updatedAt')
      .where('booking.barberId IN (:...profileIds)', { profileIds });

    const qualified = await this.applySuccessfulGatewayPaidBookingsFilter(
      qualifiedQb,
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
        if (!profileMetaById.has(row.barberProfileId)) continue;
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
      .map(([barberProfileId, updatedAt]) => {
        const meta = profileMetaById.get(barberProfileId)!;
        return {
          id: meta.userId,
          slug: meta.slug,
          updatedAt: updatedAt ? updatedAt.toISOString() : null,
        };
      })
      .filter(
        entry =>
          Number.isInteger(entry.id) && entry.id > 0 && Boolean(entry.slug),
      )
      .sort((a, b) => a.id - b.id);
  }

  private normalizeDiscountCode(code: string) {
    return code.trim().toUpperCase();
  }

  async listDiscountCodes() {
    return this.discountRepo.find({ order: { createdAt: 'DESC' } });
  }

  async createDiscountCode(dto: CreatePublicPageDiscountDto) {
    const discount = this.discountRepo.create({
      code: this.normalizeDiscountCode(dto.code),
      percentOff: dto.percentOff,
      isActive: true,
    });
    try {
      return await this.discountRepo.save(discount);
    } catch (error) {
      if (isDuplicateEntryError(error)) {
        throw new ConflictException('این کد تخفیف از قبل ثبت شده است');
      }
      throw error;
    }
  }

  async updateDiscountCode(id: string, dto: UpdatePublicPageDiscountDto) {
    const discount = await this.discountRepo.findOne({ where: { id } });
    if (!discount) throw new NotFoundException('کد تخفیف یافت نشد');
    if (dto.code !== undefined) {
      discount.code = this.normalizeDiscountCode(dto.code);
    }
    if (dto.percentOff !== undefined) discount.percentOff = dto.percentOff;
    if (dto.isActive !== undefined) discount.isActive = dto.isActive;
    try {
      return await this.discountRepo.save(discount);
    } catch (error) {
      if (isDuplicateEntryError(error)) {
        throw new ConflictException('این کد تخفیف از قبل ثبت شده است');
      }
      throw error;
    }
  }

  async deleteDiscountCode(id: string) {
    const result = await this.discountRepo.delete(id);
    if (!result.affected) throw new NotFoundException('کد تخفیف یافت نشد');
    return { id };
  }

  async getDiscountQuote(rawCode: string) {
    const code = this.normalizeDiscountCode(rawCode);
    const discount = await this.discountRepo.findOne({
      where: { code, isActive: true },
    });
    if (!discount)
      throw new BadRequestException('کد تخفیف نامعتبر یا غیرفعال است');

    const discountAmount = Math.round(
      (PUBLIC_PAGE_PACKAGE_PRICE_TOMANS * discount.percentOff) / 100,
    );
    return {
      code: discount.code,
      percentOff: discount.percentOff,
      originalAmount: PUBLIC_PAGE_PACKAGE_PRICE_TOMANS,
      discountAmount,
      amount: PUBLIC_PAGE_PACKAGE_PRICE_TOMANS - discountAmount,
    };
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
