import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import axios from 'axios';
import { BaleNotificationService } from 'src/bale/bale-notification.service';
import { BarberProfile } from 'src/barber/entities/barber.entity';
import { BarberWorkHours } from 'src/barber/entities/barber-work-hours.entity';
import { getBookingClock, isBookingSlotInPast } from 'src/booking/booking-time';
import { Booking, BookingStatus } from 'src/booking/entities/booking.entity';
import { SlotHold } from 'src/booking/entities/slot-hold.entity';
import { hasOverlap, timeToMinutes } from 'src/booking/slot-intervals';
import {
  DEFAULT_APP_ORIGIN,
  DEFAULT_FRONT_ORIGIN,
  resolvePublicOrigin,
} from 'src/common/utils/public-url.util';
import { BookingSmsService } from 'src/notification/booking-sms.service';
import { PUBLIC_PAGE_PACKAGE_PRICE_TOMANS } from 'src/public-page/constants';
import { PublicPageService } from 'src/public-page/public-page.service';
import { ReferralService } from 'src/referral/referral.service';
import { Service } from 'src/services/entities/service.entity';
import { SiteSettings } from 'src/settings/entities/setting.entity';
import { SubscriptionPlan } from 'src/subscription/entities/subscription-plan.entity';
import {
  UserSubscription,
  UserSubscriptionStatus,
} from 'src/subscription/entities/user-subscription.entity';
import { User } from 'src/users/entities/user.entity';
import { WalletService } from 'src/wallet/wallet.service';
import {
  DataSource,
  EntityManager,
  In,
  IsNull,
  LessThan,
  MoreThan,
  Repository,
} from 'typeorm';

import {
  ComputedOrderPricing,
  computeOrderPricing,
  DEFAULT_COMMISSION_MAX_AMOUNT,
  DEFAULT_COMMISSION_PERCENT,
  DEFAULT_COMMISSION_TIERS,
  extractBaseDepositToken,
  normalizeCommissionTiers,
  OrderPricingOptions,
} from './deposit-amount';
import { ChargeWalletDto } from './dto/charge-wallet.dto';
import { InitiateBookingPaymentDto } from './dto/initiate-booking-payment.dto';
import { InitiateSubscriptionPaymentDto } from './dto/initiate-subscription-payment.dto';
import {
  Payment,
  PaymentPurpose,
  PaymentStatus,
} from './entities/payment.entity';

/** مدت نگه‌داشتن موقت ساعت هنگام رفتن به درگاه (دقیقه) */
const DEFAULT_SLOT_HOLD_MINUTES = 30;

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  /** پیام‌های هشداری که قبلاً لاگ شده‌اند (برای جلوگیری از تکرار) */
  private readonly warnedMessages = new Set<string>();

  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,

    @InjectRepository(User)
    private readonly userRepo: Repository<User>,

    @InjectRepository(BarberProfile)
    private readonly barberProfileRepo: Repository<BarberProfile>,

    @InjectRepository(SubscriptionPlan)
    private readonly planRepo: Repository<SubscriptionPlan>,

    @InjectRepository(UserSubscription)
    private readonly userSubscriptionRepo: Repository<UserSubscription>,

    @InjectRepository(Service)
    private readonly serviceRepo: Repository<Service>,

    @InjectRepository(Booking)
    private readonly bookingRepo: Repository<Booking>,

    @InjectRepository(SlotHold)
    private readonly slotHoldRepo: Repository<SlotHold>,

    @InjectRepository(SiteSettings)
    private readonly settingsRepo: Repository<SiteSettings>,

    @InjectRepository(BarberWorkHours)
    private readonly workHoursRepo: Repository<BarberWorkHours>,

    private readonly bookingSmsService: BookingSmsService,
    private readonly publicPageService: PublicPageService,
    private readonly referralService: ReferralService,
    private readonly walletService: WalletService,
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
    @Optional()
    private readonly baleNotificationService?: BaleNotificationService,
  ) {}

  private getMerchant(): string {
    return this.configService.get<string>('ZIBAL_MERCHANT') || 'zibal';
  }

  /**
   * شبیه‌سازی درگاه برای توسعه/تست.
   * در production فقط با `ZIBAL_MOCK=true` فعال می‌شود؛ در بقیهٔ محیط‌ها
   * به‌صورت پیش‌فرض روشن است تا توسعه بدون اینترنت زیبال ممکن بماند.
   */
  private isMockGatewayEnabled(): boolean {
    const flag = (process.env.ZIBAL_MOCK ?? '').trim().toLowerCase();
    if (flag === 'true' || flag === '1') return true;
    if (flag === 'false' || flag === '0') return false;

    return process.env.NODE_ENV !== 'production';
  }

  /** origin بک‌اند برای callback درگاه (مثلاً https://monshiim.ir) */
  private getAppUrl(requestOrigin?: string | null): string {
    return this.resolveOrigin({
      key: 'APP_URL',
      requestOrigin,
      fallback: DEFAULT_APP_ORIGIN,
      extra: 'آدرس کال‌بک درگاه پرداخت روی این origin ساخته می‌شود',
    });
  }

  /** origin فرانت برای ریدایرکت کاربر بعد از پرداخت (مثلاً https://monshiim.ir) */
  private getFrontUrl(requestOrigin?: string | null): string {
    return this.resolveOrigin({
      key: 'FRONT_URL',
      requestOrigin,
      fallback: DEFAULT_FRONT_ORIGIN,
      extra: 'کاربر بعد از پرداخت به این origin ریدایرکت می‌شود',
    });
  }

  /**
   * انتخاب origin با هشدار یک‌باره.
   *
   * مقدار env به origin تبدیل می‌شود (مسیر اضافه مثل `/panel` حذف می‌شود)
   * و اگر نبود/نامعتبر بود یا در production به localhost اشاره می‌کرد، از
   * origin همان درخواست استفاده می‌شود تا کاربر به localhost نرود.
   */
  private resolveOrigin(params: {
    key: 'APP_URL' | 'FRONT_URL';
    requestOrigin?: string | null;
    fallback: string;
    extra: string;
  }): string {
    const configured =
      this.configService.get<string>(params.key) ??
      (params.key === 'FRONT_URL'
        ? this.configService.get<string>('FRONTEND_URL')
        : undefined);

    const { origin, source } = resolvePublicOrigin({
      configured,
      requestOrigin: params.requestOrigin,
      fallback: params.fallback,
      isProduction: process.env.NODE_ENV === 'production',
    });

    if (source !== 'config') {
      this.warnOnce(
        `${params.key}: ${JSON.stringify(configured ?? null)} قابل استفاده نبود؛ از origin درخواست (${origin}) استفاده شد. ${params.extra}. لطفاً ${params.key} را در .env سرور به‌صورت origin کامل تنظیم کنید (مثل https://monshiim.ir بدون /panel و بدون اسلش انتهایی).`,
      );
    } else if (configured && configured.trim().replace(/\/+$/, '') !== origin) {
      this.warnOnce(
        `${params.key} (${configured}) شامل مسیر اضافه است؛ فقط origin آن (${origin}) استفاده می‌شود.`,
      );
    }

    return origin;
  }

  /** هر پیام هشدار فقط یک‌بار در لاگ ثبت می‌شود تا لاگ پر نشود */
  private warnOnce(message: string): void {
    if (this.warnedMessages.has(message)) return;

    this.warnedMessages.add(message);
    this.logger.warn(message);
  }

  // =========================================================
  // ZIBAL API: REQUEST
  // =========================================================
  async requestZibalPayment(params: {
    amountTomans: number;
    callbackUrl: string;
    description: string;
    orderId: string;
    mobile?: string;
  }): Promise<{ trackId: number; paymentUrl: string }> {
    const merchant = this.getMerchant();
    const amountRials = Math.round(params.amountTomans * 10);

    const payload = {
      merchant,
      amount: amountRials,
      callbackUrl: params.callbackUrl,
      description: params.description,
      orderId: params.orderId,
      mobile: params.mobile,
    };

    try {
      this.logger.log(
        `Requesting Zibal gateway for order ${params.orderId}...`,
      );
      const response = await axios.post(
        'https://gateway.zibal.ir/v1/request',
        payload,
        { timeout: 10000 },
      );

      const data = response.data;
      if (data.result === 100 && data.trackId) {
        const trackId = Number(data.trackId);
        return {
          trackId,
          paymentUrl: `https://gateway.zibal.ir/start/${trackId}`,
        };
      }

      this.logger.warn(
        `Zibal request failed with code ${data.result}: ${data.message}`,
      );
      throw new BadRequestException(
        data.message || 'خطا در اتصال به درگاه زیبال',
      );
    } catch (error: any) {
      if (error instanceof BadRequestException) throw error;

      this.logger.error(
        `Zibal gateway request network error for ${params.orderId}: ${error.message}`,
      );

      /**
       * حالت شبیه‌سازیِ درگاه فقط در محیط غیرِ production و با اجازهٔ صریح
       * (`ZIBAL_MOCK=true`) یا به‌صورت پیش‌فرض در توسعه فعال است.
       *
       * قبلاً این شبیه‌سازی در همهٔ محیط‌ها (از جمله production) انجام می‌شد؛
       * یعنی با قطع ارتباط به زیبال، یک کد رهگیری جعلی ساخته و در ادامه
       * پرداخت «موفق» اعلام می‌شد. اکنون در production درخواست با خطای
       * قابل‌فهم رد می‌شود تا هیچ رزروی بدون پرداختِ واقعی ثبت نشود.
       */
      if (this.isMockGatewayEnabled()) {
        const mockTrackId = Math.floor(10000000 + Math.random() * 90000000);
        this.logger.warn(
          `ZIBAL_MOCK فعال است؛ تراکنش آزمایشی ${mockTrackId} برای ${params.orderId} ساخته شد.`,
        );

        return {
          trackId: mockTrackId,
          paymentUrl: `https://gateway.zibal.ir/start/${mockTrackId}`,
        };
      }

      throw new ServiceUnavailableException(
        'درگاه پرداخت در حال حاضر در دسترس نیست. لطفاً چند دقیقه بعد دوباره تلاش کنید.',
      );
    }
  }

  // =========================================================
  // ZIBAL API: VERIFY
  // =========================================================
  async verifyZibalPayment(trackId: number): Promise<{
    success: boolean;
    result: number;
    refNumber?: string;
    cardNumber?: string;
    paidAt?: Date;
    message: string;
    /** خطای موقت (شبکه/درگاه): وضعیت پرداخت نامشخص است، نه ناموفق */
    transient?: boolean;
  }> {
    const merchant = this.getMerchant();

    try {
      const response = await axios.post(
        'https://gateway.zibal.ir/v1/verify',
        {
          merchant,
          trackId: Number(trackId),
        },
        { timeout: 10000 },
      );

      const data = response.data;
      // 100: عملیات با موفقیت انجام شد
      // 201: قبلاً تایید شده است
      if (data.result === 100 || data.result === 201) {
        return {
          success: true,
          result: data.result,
          refNumber: data.refNumber ? String(data.refNumber) : undefined,
          cardNumber: data.cardNumber || undefined,
          paidAt: data.paidAt ? new Date(data.paidAt) : new Date(),
          message: data.message || 'تراکنش با موفقیت تأیید شد',
        };
      }

      return {
        success: false,
        result: data.result,
        message: data.message || 'تأیید پرداخت ناموفق بود',
      };
    } catch (error: any) {
      this.logger.warn(`Zibal gateway verify error: ${error.message}`);

      /**
       * پیش از این هر خطای شبکه‌ای در «تأیید» تراکنش، پرداخت را موفق اعلام
       * می‌کرد — بدون این‌که زیبال چیزی تأیید کرده باشد. یعنی با یک قطعی
       * لحظه‌ای، رزرو بدون پول «پرداخت‌شده» ثبت می‌شد.
       *
       * اکنون شبیه‌سازی فقط در حالت تست (همان شرط درخواست درگاه) فعال است؛
       * در غیر این صورت نتیجه «نامشخص» برمی‌گردد تا پرداخت PENDING بماند و
       * کرونِ تطبیق بعداً آن را بررسی کند.
       */
      if (this.isMockGatewayEnabled()) {
        return {
          success: true,
          result: 100,
          refNumber: String(Math.floor(100000000 + Math.random() * 900000000)),
          cardNumber: '603799******1234',
          paidAt: new Date(),
          message: 'تراکنش با موفقیت تأیید شد (حالت تستی)',
        };
      }

      return {
        success: false,
        result: -1,
        transient: true,
        message:
          'ارتباط با درگاه پرداخت برقرار نشد؛ وضعیت این پرداخت هنوز مشخص نیست',
      };
    }
  }

  // =========================================================
  // ۱. خرید اشتراک آنلاین (SUBSCRIPTION)
  // =========================================================
  async initiateSubscriptionPayment(
    userId: number,
    dto: InitiateSubscriptionPaymentDto,
    requestOrigin?: string | null,
  ) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('کاربر یافت نشد');
    }

    const plan = await this.planRepo.findOne({
      where: { id: dto.subscriptionPlanId, isActive: true },
    });
    if (!plan) {
      throw new NotFoundException('پلن اشتراک یافت نشد یا غیرفعال است');
    }

    const orderId = `SUB-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const appUrl = this.getAppUrl(requestOrigin);
    const callbackUrl = `${appUrl}/api/payment/callback`;

    const { trackId, paymentUrl } = await this.requestZibalPayment({
      amountTomans: Number(plan.price),
      callbackUrl,
      description: `خرید اشتراک ${plan.name} - منشیم`,
      orderId,
      mobile: user.phone,
    });

    // ایجاد رکورد پرداخت
    const payment = this.paymentRepo.create({
      userId,
      amount: plan.price,
      trackId,
      orderId,
      purpose: PaymentPurpose.SUBSCRIPTION,
      purposeId: plan.id,
      status: PaymentStatus.PENDING,
      description: `خرید اشتراک ${plan.name}`,
    });

    await this.paymentRepo.save(payment);

    return {
      trackId,
      paymentUrl,
      orderId,
      amount: plan.price,
      planName: plan.name,
    };
  }

  // =========================================================
  // ۱.۱. خرید پکیج «صفحهٔ عمومی آرایشگاه» (PUBLIC_PAGE)
  // =========================================================
  /**
   * پکیج یک‌باره و مادام‌العمر است؛ اگر صفحه از قبل (با خرید یا با حد نصاب
   * نوبت‌های پرداخت‌شده) فعال شده باشد، پرداخت دوباره پذیرفته نمی‌شود.
   */
  async initiatePublicPagePayment(
    userId: number,
    discountCode?: string,
    requestOrigin?: string | null,
  ) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('کاربر یافت نشد');
    }

    const profile = await this.barberProfileRepo.findOne({
      where: { userId },
    });
    if (!profile) {
      throw new NotFoundException('پروفایل آرایشگر یافت نشد');
    }

    const status = await this.publicPageService.getStatusByUserId(userId);
    if (status.isActive) {
      throw new BadRequestException(
        'صفحهٔ اختصاصی شما از قبل فعال است و نیازی به خرید دوباره نیست',
      );
    }

    // تخفیف دعوت خودکار است و فقط برای ثبت‌نام‌هایی اعمال می‌شود که رکورد
    // referral دارند؛ این پیشنهاد با کد تخفیف دیگری جمع نمی‌شود.
    const referralQuote =
      await this.publicPageService.getReferralDiscountQuote(userId);
    const quote =
      referralQuote ??
      (discountCode
        ? await this.publicPageService.getDiscountQuote(discountCode)
        : {
            code: null,
            percentOff: 0,
            originalAmount: PUBLIC_PAGE_PACKAGE_PRICE_TOMANS,
            discountAmount: 0,
            amount: PUBLIC_PAGE_PACKAGE_PRICE_TOMANS,
          });

    const orderId = `PAGE-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const discountDescription = quote.percentOff
      ? quote.code
        ? ` (کد ${quote.code}، تخفیف ${quote.percentOff}٪)`
        : ` (تخفیف ویژهٔ معرفی، ${quote.percentOff}٪)`
      : '';
    const discountMetadata = quote.percentOff
      ? JSON.stringify({
          ...(quote.code
            ? { discountCode: quote.code }
            : { referralDiscount: true }),
          discountPercent: quote.percentOff,
          originalAmount: quote.originalAmount,
          discountAmount: quote.discountAmount,
        })
      : null;

    if (quote.amount === 0 && quote.code) {
      const complimentaryPayment = await this.paymentRepo.save(
        this.paymentRepo.create({
          userId,
          amount: 0,
          trackId: null,
          orderId,
          purpose: PaymentPurpose.PUBLIC_PAGE,
          purposeId: profile.id,
          status: PaymentStatus.PAID,
          description: `خرید رایگان صفحهٔ اختصاصی آرایشگاه (${profile.salonName})${discountDescription}`,
          metadata: discountMetadata,
          paidAt: new Date(),
        }),
      );
      await this.publicPageService.activateAfterPayment(complimentaryPayment);
      await this.referralService.onPublicPagePurchased(userId);
      return {
        free: true,
        amount: 0,
        orderId,
        discountCode: quote.code,
      };
    }

    const appUrl = this.getAppUrl(requestOrigin);
    const callbackUrl = `${appUrl}/api/payment/callback`;

    const { trackId, paymentUrl } = await this.requestZibalPayment({
      amountTomans: quote.amount,
      callbackUrl,
      description: `خرید صفحهٔ اختصاصی آرایشگاه - ${profile.salonName}${discountDescription}`,
      orderId,
      mobile: user.phone,
    });

    const payment = this.paymentRepo.create({
      userId,
      amount: quote.amount,
      trackId,
      orderId,
      purpose: PaymentPurpose.PUBLIC_PAGE,
      purposeId: profile.id,
      status: PaymentStatus.PENDING,
      description: `خرید صفحهٔ اختصاصی آرایشگاه (${profile.salonName})${discountDescription}`,
      metadata: discountMetadata,
    });

    await this.paymentRepo.save(payment);

    return {
      trackId,
      paymentUrl,
      orderId,
      amount: quote.amount,
      originalAmount: quote.originalAmount,
      discountAmount: quote.discountAmount,
      discountPercent: quote.percentOff,
      discountCode: quote.code,
    };
  }

  // =========================================================
  // ۲. رزرو نوبت آنلاین با درگاه (BOOKING)
  // =========================================================
  async initiateBookingPayment(
    customerId: number,
    dto: InitiateBookingPaymentDto,
    requestOrigin?: string | null,
  ) {
    if (isBookingSlotInPast(dto.date, dto.time, getBookingClock())) {
      throw new BadRequestException(
        'امکان ثبت نوبت برای تاریخ یا ساعت گذشته وجود ندارد',
      );
    }

    const user = await this.userRepo.findOne({ where: { id: customerId } });
    if (!user) {
      throw new NotFoundException('کاربر یافت نشد');
    }

    const barberIdNum = Number(dto.barberId);
    let barber: BarberProfile | null = null;
    if (Number.isInteger(barberIdNum)) {
      barber = await this.barberProfileRepo.findOne({
        where: [
          { userId: barberIdNum, isApproved: true },
          { id: String(dto.barberId), isApproved: true },
        ],
        relations: { user: true },
      });
    } else {
      barber = await this.barberProfileRepo.findOne({
        where: { id: String(dto.barberId), isApproved: true },
        relations: { user: true },
      });
    }

    if (!barber) {
      throw new NotFoundException(
        'آرایشگر مورد نظر یافت نشد یا تایید نشده است',
      );
    }

    const serviceIds =
      dto.serviceIds && dto.serviceIds.length > 0
        ? dto.serviceIds
        : dto.serviceId
          ? [dto.serviceId]
          : [];
    if (serviceIds.length === 0) {
      throw new BadRequestException('حداقل یک سرویس باید انتخاب شود');
    }

    // Load all services
    const services = await this.serviceRepo.find({
      where: serviceIds.map(id => ({ id, isActive: true })),
    });
    if (services.length !== serviceIds.length) {
      throw new NotFoundException('یک یا چند سرویس معتبر نیستند');
    }

    /**
     * هر خدمت باید متعلق به همین آرایشگر باشد.
     * پیش از این فقط «فعال بودن» خدمت بررسی می‌شد و می‌شد خدمتِ آرایشگر
     * دیگری (با قیمت/مدت متفاوت) را در سفارش این آرایشگر جا داد؛ نتیجه‌اش
     * قیمت و درآمد اشتباه و رزرو با مدت نامعتبر بود.
     */
    const serviceNotOwnedByBarber = services.some(
      service => Number(service.barberId) !== Number(barber.userId),
    );
    if (serviceNotOwnedByBarber) {
      throw new BadRequestException(
        'خدمت انتخاب‌شده متعلق به این آرایشگر نیست. لطفاً صفحه را بازخوانی کنید.',
      );
    }

    const toMinutes = (time: string) => {
      const [hours, minutes] = time.split(':').map(Number);
      return hours * 60 + minutes;
    };
    const toTimeStr = (m: number) =>
      `${Math.floor(m / 60)
        .toString()
        .padStart(2, '0')}:${(m % 60).toString().padStart(2, '0')}`;

    const totalDuration = services.reduce((s, sv) => s + sv.durationMinutes, 0);
    const firstStart = toMinutes(dto.time);

    // Check work-hours for the entire combined block
    const jsDay = new Date(dto.date).getDay();
    const dayOfWeek = (jsDay + 1) % 7;
    const workHours = await this.workHoursRepo.find({
      where: { barberId: barber.id, dayOfWeek },
    });
    const fitsInWorkHours = workHours.some(wh => {
      const ws = toMinutes(wh.startTime);
      const we = toMinutes(wh.endTime);
      return firstStart >= ws && firstStart + totalDuration <= we;
    });
    if (!fitsInWorkHours) {
      throw new BadRequestException(
        'مجموع زمان سرویس‌ها در ساعت کاری آرایشگر نمی‌گنجد',
      );
    }

    // بررسی تداخل با رزروهای قطعی قبلی
    const existingConfirmed = await this.bookingRepo.find({
      where: {
        barberId: barber.id,
        date: dto.date,
        holdsSlot: true,
      },
      relations: { service: true },
    });

    // نگه‌داشتن‌های موقتِ رزروهای در جریان هم ساعت را اشغال کرده‌اند.
    const activeHolds = await this.getActiveHoldIntervals(barber.id, dto.date);

    const blockEnd = firstStart + totalDuration;

    const hasConflict =
      existingConfirmed.some(booking => {
        const s = toMinutes(booking.time);
        const dur = booking.service?.durationMinutes ?? 30;
        const e = s + dur;
        return firstStart < e && blockEnd > s;
      }) || hasOverlap({ start: firstStart, end: blockEnd }, activeHolds);

    if (hasConflict) {
      throw new BadRequestException('این زمان با رزروهای قطعی تداخل دارد');
    }

    const commissionConfig = await this.getSiteCommissionConfig();
    const pricing = computeOrderPricing(services, commissionConfig);
    const totalPrice = pricing.totalServicePrice;
    const depositAmount = pricing.depositAmount;
    const commissionAmount = pricing.commissionAmount;
    const amountToPay = pricing.amountToPay;

    const orderId = `BOOK-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const appUrl = this.getAppUrl(requestOrigin);
    const callbackUrl = `${appUrl}/api/payment/callback`;

    const { trackId, paymentUrl } = await this.requestZibalPayment({
      amountTomans: amountToPay,
      callbackUrl,
      description: `رزرو ${services.length} سرویس در ${barber.salonName || 'آرایشگاه'} - منشیم`,
      orderId,
      mobile: user.phone,
    });

    // We store metadata as an array of individual bookings that should be created after payment
    let cursor = firstStart;
    const bookingItems = services.map((sv, index) => {
      const start = cursor;
      cursor += sv.durationMinutes;
      const itemPricing = pricing.items[index];
      return {
        serviceId: sv.id,
        time: toTimeStr(start),
        durationMinutes: sv.durationMinutes,
        price: itemPricing.servicePrice,
        depositPrice: itemPricing.depositPrice,
        payableAmount: itemPricing.payableAmount,
      };
    });

    const holdMinutesRaw = Number(process.env.SLOT_HOLD_MINUTES ?? 30);
    const holdMinutes =
      Number.isFinite(holdMinutesRaw) && holdMinutesRaw >= 5
        ? holdMinutesRaw
        : DEFAULT_SLOT_HOLD_MINUTES;
    const holdExpiresAt = new Date(Date.now() + holdMinutes * 60_000);

    /**
     * ساخت رزرو در یک تراکنش انجام می‌شود تا بررسی تداخل و ثبت
     * «نگه‌داشتن ساعت» اتمیک باشد. قفل روی ردیف آرایشگر، دو درخواست
     * هم‌زمان را پشت سر هم اجرا می‌کند؛ بدون آن، هر دو می‌توانستند
     * ساعت آزاد را ببینند و هر دو پول بدهند.
     */
    await this.dataSource.transaction(async manager => {
      await manager
        .getRepository(BarberProfile)
        .createQueryBuilder('barber')
        .setLock('pessimistic_write')
        .where('barber.id = :id', { id: barber.id })
        .getOne();

      // نگه‌داشتن‌های منقضی این روز پاک می‌شوند تا مانع اشتباه نسازند.
      await manager
        .getRepository(SlotHold)
        .createQueryBuilder()
        .delete()
        .where('barber_id = :barberId', { barberId: barber.id })
        .andWhere('date = :date', { date: dto.date })
        .andWhere('expires_at <= :now', { now: new Date() })
        .execute();

      const lockedBookings = await manager.getRepository(Booking).find({
        where: {
          barberId: barber.id,
          date: dto.date,
          holdsSlot: true,
        },
        relations: { service: true },
      });

      const lockedHolds = await manager.getRepository(SlotHold).find({
        where: {
          barberId: barber.id,
          date: dto.date,
          expiresAt: MoreThan(new Date()),
        },
      });

      const busy = [
        ...lockedBookings.map(booking => {
          const start = timeToMinutes(booking.time);
          return {
            start,
            end: start + (booking.service?.durationMinutes ?? 30),
          };
        }),
        ...lockedHolds.map(hold => ({
          start: hold.startMinutes,
          end: hold.endMinutes,
        })),
      ];

      const conflict = bookingItems.some(item => {
        const start = timeToMinutes(item.time);
        return hasOverlap({ start, end: start + item.durationMinutes }, busy);
      });

      if (conflict) {
        throw new BadRequestException(
          'این ساعت همین حالا توسط شخص دیگری انتخاب شد؛ لطفاً ساعت دیگری انتخاب کنید',
        );
      }

      const holdRepo = manager.getRepository(SlotHold);
      await holdRepo.save(
        bookingItems.map(item => {
          const start = timeToMinutes(item.time);
          return holdRepo.create({
            barberId: barber.id,
            date: dto.date,
            startMinutes: start,
            endMinutes: start + item.durationMinutes,
            orderId,
            expiresAt: holdExpiresAt,
          });
        }),
      );

      const paymentRepo = manager.getRepository(Payment);
      const payment = paymentRepo.create({
        userId: customerId,
        amount: amountToPay,
        trackId,
        orderId,
        purpose: PaymentPurpose.BOOKING,
        purposeId: null,
        metadata: JSON.stringify({
          customerId,
          barberUserId: barber.userId,
          barberProfileId: barber.id,
          date: dto.date,
          note: dto.note ?? '',
          items: bookingItems,
          totalPrice,
          depositAmount,
          commissionAmount,
          holdOrderId: orderId,
        }),
        status: PaymentStatus.PENDING,
        description: `رزرو ${services.length} سرویس + کمیسیون سایت`,
      });

      await paymentRepo.save(payment);
    });

    return {
      trackId,
      paymentUrl,
      orderId,
      amount: amountToPay,
    };
  }

  // =========================================================
  // ۳. شارژ آنلاین کیف پول (WALLET)
  // =========================================================
  async initiateWalletCharge(
    userId: number,
    dto: ChargeWalletDto,
    requestOrigin?: string | null,
  ) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('کاربر یافت نشد');
    }

    const orderId = `WAL-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const appUrl = this.getAppUrl(requestOrigin);
    const callbackUrl = `${appUrl}/api/payment/callback`;

    const { trackId, paymentUrl } = await this.requestZibalPayment({
      amountTomans: dto.amount,
      callbackUrl,
      description: `شارژ کیف پول کاربری منشیم`,
      orderId,
      mobile: user.phone,
    });

    const payment = this.paymentRepo.create({
      userId,
      amount: dto.amount,
      trackId,
      orderId,
      purpose: PaymentPurpose.WALLET,
      purposeId: String(userId),
      status: PaymentStatus.PENDING,
      description: `شارژ آنلاین کیف پول`,
    });

    await this.paymentRepo.save(payment);

    return {
      trackId,
      paymentUrl,
      orderId,
      amount: dto.amount,
    };
  }

  /**
   * بارگذاری همهٔ نوبت‌های متعلق به یک لینک بیعانه (تک‌خدمتی یا چندخدمتی).
   */
  private async findDepositGroupBookings(rawToken: string): Promise<{
    baseToken: string;
    bookings: Booking[];
  }> {
    const baseToken = extractBaseDepositToken(rawToken);
    if (!baseToken) {
      throw new NotFoundException('لینک پرداخت معتبر نیست');
    }

    const bookings = await this.bookingRepo
      .createQueryBuilder('booking')
      .leftJoinAndSelect('booking.customer', 'customer')
      .leftJoinAndSelect('booking.service', 'service')
      .leftJoinAndSelect('booking.barber', 'barber')
      .leftJoinAndSelect('barber.user', 'barberUser')
      .leftJoinAndSelect('barber.city', 'city')
      .where(
        '(booking.depositToken = :exact OR booking.depositToken LIKE :prefix)',
        {
          exact: baseToken,
          prefix: `${baseToken}:%`,
        },
      )
      .orderBy('booking.time', 'ASC')
      .addOrderBy('booking.createdAt', 'ASC')
      .getMany();

    if (!bookings.length) {
      throw new NotFoundException('لینک پرداخت معتبر نیست');
    }

    return { baseToken, bookings };
  }

  private async getSiteCommissionConfig(): Promise<OrderPricingOptions> {
    try {
      const settings = await this.settingsRepo.findOne({ where: { id: 1 } });
      if (settings) {
        const commissionMode =
          settings.commissionMode === 'flat' ? 'flat' : 'tiered';
        const commissionTiers = normalizeCommissionTiers(
          settings.commissionTiers,
        );
        const commissionMaxAmount =
          settings.commissionMaxAmount === undefined
            ? DEFAULT_COMMISSION_MAX_AMOUNT
            : settings.commissionMaxAmount !== null &&
                Number(settings.commissionMaxAmount) > 0
              ? Math.round(Number(settings.commissionMaxAmount))
              : null;
        const commissionPercent =
          settings.commissionPercent != null &&
          Number.isFinite(Number(settings.commissionPercent))
            ? Number(settings.commissionPercent)
            : DEFAULT_COMMISSION_PERCENT;

        return {
          commissionMode,
          commissionTiers,
          commissionMaxAmount,
          commissionPercent,
        };
      }
    } catch {
      // تنظیمات موجود نیست — از پله‌های استاندارد و سقف ۲۰۰ هزار تومان استفاده می‌شود
    }

    return {
      commissionMode: 'tiered',
      commissionTiers: DEFAULT_COMMISSION_TIERS,
      commissionMaxAmount: DEFAULT_COMMISSION_MAX_AMOUNT,
      commissionPercent: DEFAULT_COMMISSION_PERCENT,
    };
  }

  private maskCustomerPhone(phone?: string | null): string | null {
    const clean = String(phone ?? '').trim();
    if (!clean || clean.length < 7) return null;
    return `${clean.slice(0, 4)}***${clean.slice(-4)}`;
  }

  private addMinutesToTime(time: string, minutesToAdd: number): string {
    const [hours = 0, minutes = 0] = String(time)
      .split(':')
      .map(value => Number(value) || 0);
    const total = hours * 60 + minutes + Math.max(0, minutesToAdd);
    const normalizedHours = Math.floor(total / 60) % 24;
    const normalizedMinutes = total % 60;
    return `${String(normalizedHours).padStart(2, '0')}:${String(
      normalizedMinutes,
    ).padStart(2, '0')}`;
  }

  /**
   * دریافت اطلاعات کامل صورت‌حساب لینک بیعانه (بدون ایجاد تراکنش درگاه).
   */
  async getDepositInvoiceByToken(token: string) {
    const { baseToken, bookings } = await this.findDepositGroupBookings(token);

    const paidBookings = bookings.filter(item => Boolean(item.depositPaidAt));
    const isPaid = paidBookings.length > 0;

    // در صورت پرداخت‌شده بودن، همهٔ ردیف‌های پرداخت‌شده مبنای رسید هستند؛
    // در غیر این صورت ردیف‌های فعال (لغو/رد نشده) مبنای صورت‌حساب پرداخت‌اند.
    const activeUnpaidBookings = bookings.filter(
      item =>
        item.status !== BookingStatus.CANCELED &&
        item.status !== BookingStatus.REJECTED,
    );

    const targetBookings = isPaid
      ? paidBookings
      : activeUnpaidBookings.length > 0
        ? activeUnpaidBookings
        : bookings;

    const primary = targetBookings[0];
    const barber = primary.barber;
    const commissionConfig = await this.getSiteCommissionConfig();

    const pricing: ComputedOrderPricing = computeOrderPricing(
      targetBookings.map(booking => ({
        price: booking.price,
        depositPrice: booking.service?.depositPrice ?? null,
      })),
      commissionConfig,
    );

    const items = targetBookings.map((booking, index) => {
      const computed = pricing.items[index];
      return {
        bookingId: booking.id,
        serviceId: booking.serviceId,
        name: booking.service?.name ?? 'خدمت آرایشگاهی',
        time: String(booking.time ?? '').slice(0, 5),
        durationMinutes: booking.service?.durationMinutes ?? 30,
        price: computed.servicePrice,
        depositPrice: computed.depositPrice,
        hasDeposit: computed.hasDeposit,
        payableAmount: computed.payableAmount,
        remainingInSalon: computed.remainingInSalon,
      };
    });

    const totalDurationMinutes = items.reduce(
      (sum, item) => sum + item.durationMinutes,
      0,
    );
    const startTime = items[0]?.time ?? String(primary.time ?? '').slice(0, 5);
    const endTime = this.addMinutesToTime(startTime, totalDurationMinutes);

    const timeoutConfigured = Number(
      process.env.DEPOSIT_PAYMENT_TIMEOUT_HOURS ?? 6,
    );
    const timeoutHours =
      Number.isFinite(timeoutConfigured) && timeoutConfigured >= 1
        ? timeoutConfigured
        : 6;

    const requestedAtDate = primary.depositRequestedAt ?? primary.createdAt;
    const expiresAtDate = requestedAtDate
      ? new Date(requestedAtDate.getTime() + timeoutHours * 3600_000)
      : null;

    let status: 'payable' | 'paid' | 'canceled' | 'expired' = 'payable';
    let statusReason: string | null = null;

    if (isPaid) {
      status = 'paid';
    } else if (activeUnpaidBookings.length === 0) {
      status = 'canceled';
      statusReason =
        primary.canceledBy === 'system'
          ? `مهلت ${timeoutHours} ساعتهٔ پرداخت بیعانه به پایان رسیده و نوبت به‌صورت خودکار لغو شده است.`
          : 'این نوبت لغو شده است و امکان پرداخت آن وجود ندارد.';
    } else if (
      isBookingSlotInPast(primary.date, primary.time, getBookingClock())
    ) {
      status = 'expired';
      statusReason =
        'زمان این نوبت گذشته است و امکان پرداخت بیعانه وجود ندارد.';
    }

    let receipt: {
      paidAt: string;
      amount: number;
      trackId: number | null;
      refNumber: string | null;
    } | null = null;

    if (isPaid) {
      const paidPayment = await this.paymentRepo
        .createQueryBuilder('payment')
        .where('payment.purpose = :purpose', {
          purpose: PaymentPurpose.BOOKING,
        })
        .andWhere('payment.status = :status', {
          status: PaymentStatus.PAID,
        })
        .andWhere(
          '(payment.purposeId IN (:...ids) OR payment.metadata LIKE :tokenPattern)',
          {
            ids: paidBookings.map(item => item.id),
            tokenPattern: `%${baseToken}%`,
          },
        )
        .orderBy('payment.paidAt', 'DESC')
        .getOne();

      const paidDate =
        paidPayment?.paidAt ?? paidBookings[0]?.depositPaidAt ?? new Date();
      if (paidPayment) {
        const paidTotal = Number(paidPayment.amount);
        try {
          const meta = paidPayment.metadata
            ? JSON.parse(paidPayment.metadata)
            : null;
          const metaDeposit = Number(meta?.depositAmount);
          const metaCommission = Number(meta?.commissionAmount);
          if (
            Number.isFinite(metaDeposit) &&
            metaDeposit >= 0 &&
            Number.isFinite(metaCommission) &&
            metaCommission >= 0
          ) {
            pricing.depositAmount = Math.round(metaDeposit);
            pricing.commissionAmount = Math.round(metaCommission);
            pricing.amountToPay = Number.isFinite(paidTotal)
              ? Math.round(paidTotal)
              : pricing.depositAmount + pricing.commissionAmount;
            pricing.commissionPercent =
              pricing.depositAmount > 0
                ? Math.round(
                    (pricing.commissionAmount / pricing.depositAmount) * 10000,
                  ) / 100
                : 0;
            pricing.isCommissionCapped =
              pricing.commissionMaxAmount !== null &&
              pricing.commissionAmount >= pricing.commissionMaxAmount;
          }
        } catch {
          // متادیتای نامعتبر؛ مقادیر محاسبه‌شده حفظ می‌شود
        }
      }

      receipt = {
        paidAt: paidDate.toISOString(),
        amount: paidPayment ? Number(paidPayment.amount) : pricing.amountToPay,
        trackId: paidPayment?.trackId ? Number(paidPayment.trackId) : null,
        refNumber: paidPayment?.refNumber ?? null,
      };
    }

    return {
      token: baseToken,
      status,
      statusReason,
      canceledBy: primary.canceledBy ?? null,
      salon: {
        id: barber?.id ?? primary.barberId,
        userId: barber?.userId ?? null,
        name: barber?.salonName || 'سالن زیبایی',
        address: barber?.address ?? null,
        cityName: barber?.city?.name ?? null,
        profileImage: barber?.profileImage ?? null,
        phone: barber?.user?.phone ?? null,
      },
      customer: {
        fullName: primary.customer?.fullName || 'مشتری گرامی',
        maskedPhone: this.maskCustomerPhone(primary.customer?.phone),
      },
      appointment: {
        date: primary.date,
        startTime,
        endTime,
        totalDurationMinutes,
        customerNote: primary.customerNote || primary.note || null,
        depositRequestedAt: requestedAtDate
          ? requestedAtDate.toISOString()
          : null,
        expiresAt: expiresAtDate ? expiresAtDate.toISOString() : null,
        timeoutHours,
      },
      items,
      pricing: {
        totalServicePrice: pricing.totalServicePrice,
        depositAmount: pricing.depositAmount,
        maxPayableAmount: pricing.maxPayableAmount,
        commissionMode: pricing.commissionMode,
        commissionPercent: pricing.commissionPercent,
        commissionAmount: pricing.commissionAmount,
        commissionMaxAmount: pricing.commissionMaxAmount,
        isCommissionCapped: pricing.isCommissionCapped,
        remainingInSalon: pricing.remainingInSalon,
        amountToPay: pricing.amountToPay,
      },
      receipt,
    };
  }

  async initiateDepositPaymentByToken(
    token: string,
    requestOrigin?: string | null,
  ) {
    const { baseToken, bookings } = await this.findDepositGroupBookings(token);

    if (bookings.some(item => Boolean(item.depositPaidAt))) {
      throw new BadRequestException('بیعانه این نوبت قبلاً پرداخت شده است');
    }

    const activeBookings = bookings.filter(
      item =>
        item.status !== BookingStatus.CANCELED &&
        item.status !== BookingStatus.REJECTED,
    );

    if (!activeBookings.length) {
      throw new BadRequestException('این نوبت لغو شده است');
    }

    const primary = activeBookings[0];

    // بیعانه برای نوبتی که زمانش گذشته معنا ندارد؛ پیش از این فقط
    // لغو/ردشده‌ها مسدود بودند و لینک قدیمی روی نوبت گذشته هم پول می‌گرفت.
    if (isBookingSlotInPast(primary.date, primary.time, getBookingClock())) {
      throw new BadRequestException(
        'زمان این نوبت گذشته است و امکان پرداخت بیعانه وجود ندارد',
      );
    }

    const commissionConfig = await this.getSiteCommissionConfig();
    const pricing = computeOrderPricing(
      activeBookings.map(item => ({
        price: item.price,
        depositPrice: item.service?.depositPrice ?? null,
      })),
      commissionConfig,
    );

    if (pricing.amountToPay <= 0) {
      throw new BadRequestException('مبلغ قابل پرداخت این نوبت مشخص نیست');
    }

    const barber = primary.barber;
    const salonName = barber?.salonName || 'سالن';
    const serviceNames = activeBookings
      .map(item => item.service?.name)
      .filter(Boolean)
      .join('، ');

    const orderId = `DEP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const appUrl = this.getAppUrl(requestOrigin);
    const callbackUrl = `${appUrl}/api/payment/callback`;

    const { trackId, paymentUrl } = await this.requestZibalPayment({
      amountTomans: pricing.amountToPay,
      callbackUrl,
      description: `پرداخت بیعانه نوبت - ${salonName} - منشیم`,
      orderId,
      mobile: primary.customer?.phone,
    });

    const itemDescriptors = activeBookings.map((booking, index) => ({
      bookingId: booking.id,
      serviceId: booking.serviceId,
      time: String(booking.time ?? '').slice(0, 5),
      durationMinutes: booking.service?.durationMinutes ?? 30,
      price: pricing.items[index].servicePrice,
      depositPrice: pricing.items[index].depositPrice,
      payableAmount: pricing.items[index].payableAmount,
    }));

    const payment = this.paymentRepo.create({
      userId: primary.customerId,
      amount: pricing.amountToPay,
      trackId,
      orderId,
      purpose: PaymentPurpose.BOOKING,
      purposeId: primary.id,
      metadata: JSON.stringify({
        depositLink: true,
        depositToken: baseToken,
        bookingId: primary.id,
        bookingIds: activeBookings.map(item => item.id),
        barberUserId: barber?.userId,
        barberProfileId: barber?.id ?? primary.barberId,
        customerId: primary.customerId,
        date: primary.date,
        items: itemDescriptors,
        // مبلغ سهم آرایشگر و کمیسیون جدا نگه داشته می‌شوند تا هم واریز به کیف پول
        // آرایشگر و هم بازپرداختِ احتمالی دقیق باشد.
        depositAmount: pricing.depositAmount,
        commissionAmount: pricing.commissionAmount,
        totalPrice: pricing.totalServicePrice,
      }),
      status: PaymentStatus.PENDING,
      description: `پرداخت بیعانه نوبت ${serviceNames} (شامل کمیسیون سایت) - ${salonName}`,
    });

    await this.paymentRepo.save(payment);

    return {
      trackId,
      paymentUrl,
      orderId,
      amount: pricing.amountToPay,
      depositAmount: pricing.depositAmount,
      commissionAmount: pricing.commissionAmount,
    };
  }

  /**
   * URL ریدایرکت لینک پیامک بیعانه → هدایت کاربر به صفحه صورت‌حساب در فرانت
   */
  async getDepositRedirectUrl(
    token: string,
    requestOrigin?: string | null,
  ): Promise<string> {
    const frontUrl = this.getFrontUrl(requestOrigin);
    const baseToken = extractBaseDepositToken(token);

    if (!baseToken) {
      const message = encodeURIComponent('لینک پرداخت معتبر نیست');
      return `${frontUrl}/panel/payment/callback?status=failed&message=${message}`;
    }

    return `${frontUrl}/deposit/${encodeURIComponent(baseToken)}`;
  }

  private getDepositTokenFromPayment(payment: Payment | null): string | null {
    if (!payment?.metadata) return null;
    try {
      const meta = JSON.parse(payment.metadata);
      if (meta?.depositLink === true && typeof meta.depositToken === 'string') {
        return extractBaseDepositToken(meta.depositToken);
      }
    } catch {
      return null;
    }
    return null;
  }

  private buildPaymentResultRedirect(
    frontUrl: string,
    payment: Payment,
    result: { status: 'success' } | { status: 'failed'; message: string },
  ): string {
    const depositToken = this.getDepositTokenFromPayment(payment);

    if (depositToken) {
      if (result.status === 'success') {
        return `${frontUrl}/deposit/${encodeURIComponent(depositToken)}?payment=success&trackId=${payment.trackId || ''}&refNumber=${payment.refNumber || ''}`;
      }

      return `${frontUrl}/deposit/${encodeURIComponent(depositToken)}?payment=failed&trackId=${payment.trackId || ''}&message=${encodeURIComponent(result.message)}`;
    }

    if (result.status === 'success') {
      return `${frontUrl}/panel/payment/callback?status=success&trackId=${payment.trackId}&refNumber=${payment.refNumber || ''}&amount=${payment.amount}&purpose=${payment.purpose}`;
    }

    return `${frontUrl}/panel/payment/callback?status=failed&trackId=${payment.trackId || ''}&orderId=${payment.orderId}&message=${encodeURIComponent(result.message)}`;
  }

  // =========================================================
  // ۴. مدیریت کال‌بک درگاه زیبال (CALLBACK)
  // =========================================================
  async handleCallback(params: {
    trackId?: number | string;
    success?: string | number;
    status?: string | number;
    orderId?: string;
    /** origin درخواستی که از درگاه برگشته است (برای fallback آدرس فرانت) */
    requestOrigin?: string | null;
  }): Promise<string> {
    const frontUrl = this.getFrontUrl(params.requestOrigin);
    const trackIdNum = params.trackId ? Number(params.trackId) : null;
    const isSuccess =
      String(params.success) === '1' || String(params.status) === '2';

    // پیدا کردن رکورد پرداخت
    let payment: Payment | null = null;
    if (trackIdNum) {
      payment = await this.paymentRepo.findOne({
        where: { trackId: trackIdNum },
      });
    }
    if (!payment && params.orderId) {
      payment = await this.paymentRepo.findOne({
        where: { orderId: params.orderId },
      });
    }

    if (!payment) {
      return `${frontUrl}/panel/payment/callback?status=failed&message=${encodeURIComponent('رکورد تراکنش یافت نشد')}`;
    }

    // کال‌بک‌های تکراری نباید یک رزرو یا واریز را دوباره ایجاد کنند.
    if (payment.status === PaymentStatus.PAID) {
      return this.buildPaymentResultRedirect(frontUrl, payment, {
        status: 'success',
      });
    }
    if (payment.status !== PaymentStatus.PENDING) {
      return this.buildPaymentResultRedirect(frontUrl, payment, {
        status: 'failed',
        message: 'وضعیت این پرداخت قبلاً نهایی شده است',
      });
    }

    // اگر کاربر در درگاه انصراف داده بود یا ناموفق بود
    if (!isSuccess) {
      await this.paymentRepo.update(
        { id: payment.id, status: PaymentStatus.PENDING },
        { status: PaymentStatus.CANCELED },
      );
      // ساعت نگه‌داشته‌شده فوراً آزاد می‌شود؛ منتظر انقضای مهلت نمی‌مانیم.
      await this.releaseSlotHolds(payment.orderId);
      const currentPayment = await this.paymentRepo.findOne({
        where: { id: payment.id },
      });
      if (currentPayment?.status === PaymentStatus.PAID) {
        return this.buildPaymentResultRedirect(frontUrl, currentPayment, {
          status: 'success',
        });
      }
      return this.buildPaymentResultRedirect(frontUrl, payment, {
        status: 'failed',
        message: 'پرداخت توسط کاربر لغو شد یا با خطا مواجه گردید',
      });
    }

    // تایید تراکنش در زیبال
    const verifyResult = await this.verifyZibalPayment(
      payment.trackId || trackIdNum || 0,
    );

    if (!verifyResult.success) {
      /**
       * خطای موقت (شبکه) به معنی «پرداخت ناموفق» نیست؛ اگر پرداخت را FAILED
       * کنیم، پولی که شاید گرفته شده باشد گم می‌شود. پرداخت PENDING می‌ماند و
       * کرون تطبیق دوباره بررسی می‌کند.
       */
      if (verifyResult.transient) {
        return this.buildPaymentResultRedirect(frontUrl, payment, {
          status: 'failed',
          message:
            'ارتباط با درگاه پرداخت برقرار نشد؛ وضعیت این پرداخت هنوز مشخص نیست و به‌صورت خودکار بررسی می‌شود',
        });
      }

      await this.paymentRepo.update(
        { id: payment.id, status: PaymentStatus.PENDING },
        { status: PaymentStatus.FAILED },
      );
      await this.releaseSlotHolds(payment.orderId);
      const currentPayment = await this.paymentRepo.findOne({
        where: { id: payment.id },
      });
      if (currentPayment?.status === PaymentStatus.PAID) {
        return this.buildPaymentResultRedirect(frontUrl, currentPayment, {
          status: 'success',
        });
      }
      return this.buildPaymentResultRedirect(frontUrl, payment, {
        status: 'failed',
        message: verifyResult.message || 'خطا در تایید تراکنش',
      });
    }

    /**
     * ثبت قطعی پرداخت و اجرای عملیات وابسته.
     * فقط یک فراخوان می‌تواند وضعیت را از PENDING به PAID ببرد؛ بقیه فقط
     * نتیجه را می‌خوانند (کال‌بک تکراری، کرون تطبیق).
     */
    const settle = await this.settleVerifiedPayment(payment, verifyResult);

    if (settle.outcome === 'refunded') {
      return this.buildPaymentResultRedirect(frontUrl, payment, {
        status: 'failed',
        message:
          'این ساعت هم‌زمان توسط شخص دیگری رزرو شد. مبلغ پرداختی شما ثبت شد و در صف بازگشت به کیف پول قرار گرفت.',
      });
    }

    if (settle.outcome === 'retry') {
      return this.buildPaymentResultRedirect(frontUrl, payment, {
        status: 'failed',
        message:
          settle.message ||
          'پرداخت تأیید شد اما ثبت رزرو کامل نشد؛ لطفاً دوباره تلاش کنید یا با پشتیبانی تماس بگیرید',
      });
    }

    if (settle.outcome === 'closed') {
      return this.buildPaymentResultRedirect(frontUrl, payment, {
        status: 'failed',
        message: 'این پرداخت لغو شده یا قبلاً ناموفق شده است',
      });
    }

    return this.buildPaymentResultRedirect(frontUrl, payment, {
      status: 'success',
    });
  }

  /**
   * ثبت قطعی پرداخت (PENDING → PAID) و اجرای عملیات وابسته.
   *
   * فقط یک فراخوان می‌تواند این گذار را انجام دهد؛ کال‌بک تکراری، کال‌بک
   * هم‌زمان و کرون تطبیق همه از همین مسیر رد می‌شوند تا رزرو/واریز دوباره
   * ساخته نشود.
   */
  private async settleVerifiedPayment(
    payment: Payment,
    verifyResult: {
      refNumber?: string;
      cardNumber?: string;
      paidAt?: Date;
    },
  ): Promise<{
    outcome: 'paid' | 'refunded' | 'retry' | 'closed';
    message?: string;
  }> {
    const paidAt = verifyResult.paidAt || new Date();
    const updateResult = await this.paymentRepo.update(
      { id: payment.id, status: PaymentStatus.PENDING },
      {
        status: PaymentStatus.PAID,
        refNumber: verifyResult.refNumber || null,
        cardNumber: verifyResult.cardNumber || null,
        paidAt,
      },
    );

    if (updateResult.affected === 0) {
      const currentPayment = await this.paymentRepo.findOne({
        where: { id: payment.id },
      });

      return currentPayment?.status === PaymentStatus.PAID
        ? { outcome: 'paid' }
        : { outcome: 'closed' };
    }

    payment.status = PaymentStatus.PAID;
    payment.refNumber = verifyResult.refNumber || null;
    payment.cardNumber = verifyResult.cardNumber || null;
    payment.paidAt = paidAt;

    try {
      const fulfillment = await this.fulfillPayment(payment);

      return { outcome: fulfillment.refunded ? 'refunded' : 'paid' };
    } catch (e: any) {
      this.logger.error(`Error fulfilling payment purpose: ${e.message}`);

      if (payment.purpose === PaymentPurpose.BOOKING) {
        try {
          // رزرو تراکنشی و idempotent است؛ پرداخت برای تلاش دوباره باز می‌شود.
          await this.paymentRepo.update(
            { id: payment.id, status: PaymentStatus.PAID },
            { status: PaymentStatus.PENDING, paidAt: null },
          );
        } catch (retryError: any) {
          this.logger.error(
            `Could not reopen booking payment ${payment.id} for retry: ${retryError?.message ?? String(retryError)}`,
          );
        }

        return {
          outcome: 'retry',
          message:
            'پرداخت تأیید شد اما ثبت رزرو کامل نشد؛ لطفاً دوباره تلاش کنید یا با پشتیبانی تماس بگیرید',
        };
      }

      // برای بقیهٔ اهداف، پرداخت ثبت‌شده می‌ماند و خطا فقط لاگ می‌شود.
      return { outcome: 'paid' };
    }
  }

  /** اجرای عملیات وابسته به هدف پرداخت */
  private async fulfillPayment(
    payment: Payment,
  ): Promise<{ refunded: boolean }> {
    if (payment.purpose === PaymentPurpose.SUBSCRIPTION && payment.purposeId) {
      await this.activateSubscriptionAfterPayment(
        payment.userId,
        payment.purposeId,
      );
      void this.baleNotificationService?.notifySubscriptionPurchased(
        payment,
        payment.purposeId,
      );

      return { refunded: false };
    }

    if (payment.purpose === PaymentPurpose.BOOKING) {
      const result = await this.completeBookingPayment(payment);
      if (!result.refunded) {
        const bookingIds = new Set<string>();
        if (payment.purposeId) bookingIds.add(payment.purposeId);
        try {
          const metadata = payment.metadata ? JSON.parse(payment.metadata) : {};
          if (metadata.bookingId) bookingIds.add(String(metadata.bookingId));
          if (Array.isArray(metadata.bookingIds)) {
            for (const id of metadata.bookingIds) bookingIds.add(String(id));
          }
        } catch {
          // purposeId همچنان برای پرداخت‌های عادی قابل استفاده است.
        }
        if (bookingIds.size > 0) {
          const bookings = await this.bookingRepo.find({
            where: { id: In([...bookingIds]) },
            select: { barberId: true },
          });
          for (const barberProfileId of new Set(
            bookings.map(row => row.barberId),
          )) {
            await this.referralService.onReferrerBookingActivity(
              barberProfileId,
            );
          }
        }
      }
      return result;
    }

    if (payment.purpose === PaymentPurpose.PUBLIC_PAGE) {
      await this.publicPageService.activateAfterPayment(payment);
      await this.referralService.onPublicPagePurchased(payment.userId);
      void this.baleNotificationService?.notifyPublicPagePurchased(payment);

      return { refunded: false };
    }

    if (payment.purpose === PaymentPurpose.WALLET) {
      await this.walletService.deposit(
        payment.userId,
        payment.amount,
        'شارژ آنلاین کیف پول از درگاه زیبال',
        payment.refNumber || payment.id,
      );
      void this.baleNotificationService?.notifyWalletCharged(payment);
    }

    return { refunded: false };
  }

  /** آزاد کردن فوری ساعت‌هایی که این سفارش نگه داشته بود */
  private async releaseSlotHolds(orderId: string): Promise<void> {
    try {
      await this.slotHoldRepo.delete({ orderId });
    } catch (error: any) {
      this.logger.warn(
        `آزادسازی نگه‌داشتن ساعت سفارش ${orderId} ناموفق بود: ${error?.message ?? String(error)}`,
      );
    }
  }

  private async getActiveHoldIntervals(
    barberId: string,
    date: string,
    manager?: EntityManager,
  ) {
    const repo = manager ? manager.getRepository(SlotHold) : this.slotHoldRepo;
    const holds = await repo.find({
      where: { barberId, date, expiresAt: MoreThan(new Date()) },
    });

    return holds.map(hold => ({
      start: hold.startMinutes,
      end: hold.endMinutes,
    }));
  }

  /**
   * تطبیق پرداخت‌های رزرو.
   *
   * دو حالت را جمع می‌کند:
   *  ۱) پرداختی که در زیبال تأیید و PAID شده اما ثبت رزروش نیمه‌کاره مانده
   *     (مثلاً ری‌استارت سرور بین ثبت پرداخت و ساخت رزرو).
   *  ۲) پرداختی که مشتری پول داده ولی از درگاه برنگشته (کال‌بک نیامده).
   *     برای این‌ها وضعیت مستقیماً از زیبال پرسیده می‌شود.
   *
   * با `PAYMENT_RECONCILE=false` می‌توان خاموشش کرد.
   */
  @Cron(CronExpression.EVERY_10_MINUTES)
  async reconcileBookingPayments(): Promise<number> {
    if ((process.env.PAYMENT_RECONCILE ?? 'true') === 'false') return 0;

    let handled = 0;
    const now = Date.now();

    // نگه‌داشتن‌های مدتی‌منقضی‌شده پاک می‌شوند (فقط برای تمیز ماندن جدول؛
    // از قبل هم در هیچ بررسی تداخلی حساب نمی‌شوند).
    try {
      await this.slotHoldRepo
        .createQueryBuilder()
        .delete()
        .where('expires_at <= :cutoff', {
          cutoff: new Date(now - 24 * 3600_000),
        })
        .execute();
    } catch (error: any) {
      this.logger.warn(
        `پاک‌سازی نگه‌داشتن‌های منقضی ناموفق بود: ${error?.message ?? String(error)}`,
      );
    }

    // ---- ۱) PAID اما بدون رزرو ----
    const stuckPaid = await this.paymentRepo.find({
      where: {
        purpose: PaymentPurpose.BOOKING,
        status: PaymentStatus.PAID,
        purposeId: IsNull(),
        createdAt: LessThan(new Date(now - 10 * 60_000)),
      },
      order: { createdAt: 'ASC' },
      take: 20,
    });

    for (const payment of stuckPaid) {
      // پرداخت‌هایی که آگاهانه بازپرداخت شده‌اند دوباره تلاش نمی‌شوند.
      if (payment.metadata?.includes('"refundQueued":true')) continue;

      try {
        const result = await this.completeBookingPayment(payment);

        handled += 1;
        this.logger.log(
          `پرداخت ${payment.id} در کرون تطبیق تکمیل شد${
            result.refunded ? ' (با بازپرداخت)' : ''
          }.`,
        );
      } catch (error: any) {
        this.logger.warn(
          `تکمیل پرداخت ${payment.id} در کرون تطبیق ناموفق بود: ${error?.message ?? String(error)}`,
        );
      }
    }

    // ---- ۲) PENDING های قدیمی: شاید مشتری پول داده و برنگشته ----
    const pending = await this.paymentRepo.find({
      where: {
        purpose: PaymentPurpose.BOOKING,
        status: PaymentStatus.PENDING,
        createdAt: LessThan(new Date(now - 15 * 60_000)),
      },
      order: { createdAt: 'ASC' },
      take: 20,
    });

    for (const payment of pending) {
      // فقط پرداخت‌های سه روز اخیر؛ قدیمی‌ترها عملاً بسته‌اند.
      if (
        !payment.trackId ||
        payment.createdAt.getTime() < now - 3 * 24 * 3600_000
      ) {
        continue;
      }

      try {
        const verifyResult = await this.verifyZibalPayment(
          Number(payment.trackId),
        );

        // هنوز پرداخت نشده یا وضعیت نامشخص است؛ PENDING می‌ماند.
        if (!verifyResult.success) continue;

        const settle = await this.settleVerifiedPayment(payment, verifyResult);

        if (settle.outcome !== 'closed') {
          handled += 1;
          this.logger.log(
            `پرداخت ${payment.id} از طریق کرون تطبیق نهایی شد (${settle.outcome}).`,
          );
        }
      } catch (error: any) {
        this.logger.warn(
          `بررسی پرداخت ${payment.id} در کرون تطبیق ناموفق بود: ${error?.message ?? String(error)}`,
        );
      }
    }

    // ---- ۳) بیعانهٔ پرداخت‌شده‌ای که ثبتش نیمه‌کاره مانده ----
    const paidDeposits = await this.paymentRepo.find({
      where: {
        purpose: PaymentPurpose.BOOKING,
        status: PaymentStatus.PAID,
        createdAt: LessThan(new Date(now - 10 * 60_000)),
        paidAt: MoreThan(new Date(now - 24 * 3600_000)),
      },
      order: { paidAt: 'ASC' },
      take: 20,
    });

    for (const payment of paidDeposits) {
      if (!payment.metadata?.includes('"depositLink":true')) continue;

      try {
        const meta = JSON.parse(payment.metadata);
        const primaryId = String(meta.bookingId || payment.purposeId || '');
        const groupIds = [
          ...new Set(
            [
              ...(Array.isArray(meta.bookingIds)
                ? meta.bookingIds.map(String)
                : []),
              primaryId,
            ].filter(Boolean),
          ),
        ];
        if (!groupIds.length) continue;

        const bookings = await this.bookingRepo.findBy(
          groupIds.map(id => ({ id })),
        );

        // قبلاً همهٔ ردیف‌های سفارش ثبت شده‌اند
        if (
          !bookings.length ||
          bookings.every(row => Boolean(row.depositPaidAt))
        ) {
          continue;
        }

        await this.completeDepositAfterPayment(payment);
        handled += 1;
        this.logger.log(
          `ثبت بیعانهٔ پرداخت ${payment.id} در کرون تطبیق تکمیل شد.`,
        );
      } catch (error: any) {
        this.logger.warn(
          `تکمیل بیعانهٔ پرداخت ${payment.id} در کرون تطبیق ناموفق بود: ${error?.message ?? String(error)}`,
        );
      }
    }

    return handled;
  }

  // فعال‌سازی اشتراک پس از تایید پرداخت
  private async activateSubscriptionAfterPayment(
    userId: number,
    planId: string,
  ) {
    const plan = await this.planRepo.findOne({ where: { id: planId } });
    if (!plan) return;

    // منقضی کردن اشتراک قبلی
    await this.userSubscriptionRepo
      .createQueryBuilder()
      .update(UserSubscription)
      .set({ status: UserSubscriptionStatus.EXPIRED })
      .where('user_id = :userId', { userId })
      .andWhere('status = :status', { status: UserSubscriptionStatus.ACTIVE })
      .execute();

    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + plan.durationDays);

    const userSubscription = this.userSubscriptionRepo.create({
      userId,
      subscriptionPlanId: plan.id,
      price: plan.price,
      smsTotal: plan.smsCount,
      smsUsed: 0,
      status: UserSubscriptionStatus.ACTIVE,
      startDate,
      endDate,
    });

    await this.userSubscriptionRepo.save(userSubscription);
  }

  private async completeBookingPayment(
    payment: Payment,
  ): Promise<{ refunded: boolean }> {
    if (payment.metadata?.includes('"depositLink":true')) {
      return this.completeDepositAfterPayment(payment);
    }

    return this.confirmBookingAfterPayment(payment);
  }

  private async completeDepositAfterPayment(
    payment: Payment,
  ): Promise<{ refunded: boolean }> {
    if (!payment.metadata) {
      throw new BadRequestException('اطلاعات بیعانه در پرداخت ثبت نشده است.');
    }

    const meta = JSON.parse(payment.metadata);
    const bookingId = String(meta.bookingId || payment.purposeId || '');
    const targetBookingIds = [
      ...new Set(
        [
          ...(Array.isArray(meta.bookingIds)
            ? meta.bookingIds.map(String)
            : []),
          bookingId,
        ].filter(Boolean),
      ),
    ];
    let barberUserId = Number(meta.barberUserId);
    const amount = Number(payment.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException('مبلغ بیعانه در پرداخت معتبر نیست.');
    }

    /**
     * مبلغ پرداختی شامل ۱۰٪ کمیسیون سایت است، اما فقط مبلغ بیعانه به کیف
     * پول آرایشگر می‌رود؛ کمیسیون نزد سامانه می‌ماند (مثل رزرو آنلاین).
     * برای پرداخت‌های قدیمی که این فیلد را ندارند، کل مبلغ واریز می‌شود تا
     * رفتار قبلی حفظ شود.
     */
    const depositAmount = Number(meta.depositAmount);
    const barberCredit =
      Number.isFinite(depositAmount) && depositAmount > 0
        ? Math.min(depositAmount, amount)
        : amount;

    let refunded = false;
    let newlyPaidBookingId: string | null = null;
    let newlyPaidBookingIds: string[] = [];

    await this.dataSource.transaction(async manager => {
      const lockedBookings = targetBookingIds.length
        ? await manager
            .getRepository(Booking)
            .createQueryBuilder('booking')
            .where('booking.id IN (:...bookingIds)', {
              bookingIds: [...targetBookingIds].sort(),
            })
            .orderBy('booking.id', 'ASC')
            .setLock('pessimistic_write')
            .getMany()
        : [];
      const booking =
        lockedBookings.find(item => item.id === bookingId) ??
        lockedBookings[0] ??
        null;

      if (!Number.isInteger(barberUserId) || barberUserId <= 0) {
        const barber = booking
          ? await manager.getRepository(BarberProfile).findOne({
              where: { id: booking.barberId },
              select: { userId: true },
            })
          : null;
        barberUserId = Number(barber?.userId);
      }
      if (!Number.isInteger(barberUserId) || barberUserId <= 0) {
        throw new BadRequestException('حساب آرایشگر برای بیعانه پیدا نشد.');
      }

      const paidTimestamp = payment.paidAt ?? new Date();
      const unpaidRows = lockedBookings.filter(item => !item.depositPaidAt);
      if (unpaidRows.length) {
        for (const row of unpaidRows) {
          row.depositPaidAt = paidTimestamp;
        }
        await manager.getRepository(Booking).save(unpaidRows);
        newlyPaidBookingIds = unpaidRows.map(item => item.id);
        newlyPaidBookingId =
          unpaidRows.find(item => item.id === bookingId)?.id ??
          unpaidRows[0].id;
      }

      /**
       * لینک بیعانه ممکن است بعد از لغو نوبت هم پرداخت شود (مسابقهٔ زمانی).
       * در این حالت پول باید به مشتری برگردد. استثنا: اگر خود مشتری نوبت را
       * لغو کرده باشد، بیعانه نزد آرایشگر می‌ماند (قاعدهٔ فعلی محصول).
       */
      const allWasCanceled =
        lockedBookings.length > 0 &&
        lockedBookings.every(
          item =>
            item.status === BookingStatus.CANCELED ||
            item.status === BookingStatus.REJECTED,
        );
      const refundCustomer =
        allWasCanceled &&
        lockedBookings.some(item => item.canceledBy !== 'customer');

      if (refundCustomer && booking) {
        // ابتدا همان مبلغ بیعانه به کیف پول آرایشگر واریز می‌شود تا برای
        // بازپرداخت، موجودی و رکورد حسابداری قابل ردیابی وجود داشته باشد.
        await this.walletService.depositOnceWithManager(manager, {
          userId: barberUserId,
          amount: barberCredit,
          description: `درآمد رزرو نوبت ${payment.orderId} - منشیم`,
          paymentId: payment.id,
          legacyReference: payment.refNumber,
        });
        await this.walletService.debitBarberAndQueueRefund(manager, {
          barberUserId,
          customerUserId: booking.customerId,
          bookingId: booking.id,
          paymentId: payment.id,
          amount: barberCredit,
          // مشتری کل مبلغی که داده (بیعانه + کمیسیون) را پس می‌گیرد.
          customerRefundAmount: amount,
        });
        refunded = true;
        return;
      }

      // لغو توسط مشتری بازپرداخت ایجاد نمی‌کند و بیعانه برای آرایشگر می‌ماند.
      await this.walletService.depositOnceWithManager(manager, {
        userId: barberUserId,
        amount: barberCredit,
        description: `درآمد رزرو نوبت ${payment.orderId} - منشیم`,
        paymentId: payment.id,
        legacyReference: payment.refNumber,
      });
    });

    // فقط گذار پرداخت‌نشده → پرداخت‌شده پیامک دارد. کال‌بک تکراری یا
    // پرداختی که بازپرداخت شده است نباید پیامک تازه‌ای بفرستد.
    if (!refunded && newlyPaidBookingId) {
      void this.sendDepositPaidSms(newlyPaidBookingId);
      void this.baleNotificationService?.notifyDepositPaid(
        payment,
        newlyPaidBookingIds.length ? newlyPaidBookingIds : [newlyPaidBookingId],
      );
    }

    return { refunded };
  }

  // ایجاد رزروها، ثبت پیوند پرداخت و واریز درآمد باید اتمیک باشد تا لغو هم‌زمان
  // نتواند پیش از ثبت درآمد، کیف پول آرایشگر را بابت همان پرداخت دوباره بدهکار کند.
  private async confirmBookingAfterPayment(
    payment: Payment,
  ): Promise<{ refunded: boolean }> {
    if (!payment.metadata) {
      throw new BadRequestException('اطلاعات رزرو در پرداخت ثبت نشده است.');
    }
    const meta = JSON.parse(payment.metadata);
    const createdBookings: Booking[] = [];
    const holdOrderId = meta.holdOrderId ? String(meta.holdOrderId) : null;
    let refunded = false;

    await this.dataSource.transaction(async manager => {
      /**
       * همان قفلی که هنگام ساخت نگه‌داشتن گرفته می‌شود؛ اینجا هم گرفته
       * می‌شود تا «آزاد کردن نگه‌داشتن + ساخت رزرو» با یک رزرو هم‌زمان
       * دیگر گره نخورد.
       */
      if (meta.barberProfileId) {
        await manager
          .getRepository(BarberProfile)
          .createQueryBuilder('barber')
          .setLock('pessimistic_write')
          .where('barber.id = :id', { id: String(meta.barberProfileId) })
          .getOne();
      }

      // نگه‌داشتن موقت کار خودش را کرده است؛ همین حالا آزاد می‌شود.
      if (holdOrderId) {
        await manager.getRepository(SlotHold).delete({ orderId: holdOrderId });
      }

      /**
       * اگر مهلت نگه‌داشتن تمام شده باشد، ممکن است شخص دیگری همان ساعت را
       * رزرو کرده باشد. در این حالت پول گرفته شده اما نوبتی وجود ندارد؛
       * پس به‌جای ساختن رزروِ روی‌هم‌افتاده، بازپرداخت در صف قرار می‌گیرد.
       */
      if (await this.hasFulfillmentConflict(manager, meta)) {
        refunded = true;
        await this.walletService.queueCustomerRefundWithManager(manager, {
          customerUserId: payment.userId,
          bookingId: holdOrderId || payment.orderId,
          paymentId: payment.id,
          amount: Number(payment.amount),
        });
        payment.metadata = JSON.stringify({ ...meta, refundQueued: true });
        await manager.getRepository(Payment).save(payment);

        this.logger.warn(
          `پرداخت ${payment.id} به دلیل پُر شدن ساعت بازپرداخت شد.`,
        );

        return;
      }

      const bookingRepo = manager.getRepository(Booking);
      const paymentRepo = manager.getRepository(Payment);
      /**
       * رزرو آنلاین بعد از پرداخت مستقیم «قطعی» نمی‌شود:
       * مشتری پول می‌دهد → نوبت در وضعیت «در انتظار تایید» می‌ماند →
       * آرایشگر تایید یا رد می‌کند. چون پول گرفته شده، ساعت از همین لحظه
       * اشغال است (holdsSlot) تا کس دیگری آن را نگیرد.
       */
      const baseBooking = {
        customerId: meta.customerId,
        barberId: meta.barberProfileId,
        date: meta.date,
        note: meta.note || '',
        status: BookingStatus.PENDING,
        holdsSlot: true,
        // مبلغ نوبت به‌طور کامل از درگاه پرداخت شده است؛ این زمان مبنای
        // شمارش نوبت‌های پرداخت‌شده برای فعال‌سازی صفحهٔ عمومی آرایشگاه است.
        onlinePaidAt: payment.paidAt ?? new Date(),
      };

      if (meta.serviceId && !meta.items) {
        const saved = await bookingRepo.save(
          bookingRepo.create({
            ...baseBooking,
            serviceId: meta.serviceId,
            time: meta.time,
            price: meta.price,
          }),
        );
        createdBookings.push(saved);
        payment.purposeId = saved.id;
        payment.metadata = JSON.stringify({ ...meta, bookingIds: [saved.id] });
      } else {
        const items = Array.isArray(meta.items) ? meta.items : [];
        if (!items.length) {
          throw new BadRequestException('جزئیات رزرو در پرداخت ثبت نشده است.');
        }

        for (const item of items) {
          const saved = await bookingRepo.save(
            bookingRepo.create({
              ...baseBooking,
              serviceId: item.serviceId,
              time: item.time,
              price: item.price,
            }),
          );
          createdBookings.push(saved);
        }
        const createdIds = createdBookings.map(booking => booking.id);
        payment.purposeId = createdIds[0] ?? null;
        payment.metadata = JSON.stringify({ ...meta, bookingIds: createdIds });
      }

      await paymentRepo.save(payment);

      const barberUserId = Number(meta.barberUserId);
      const explicitBarberDeposit = Number(meta.depositAmount);
      const serviceAmount =
        Number.isFinite(explicitBarberDeposit) && explicitBarberDeposit > 0
          ? explicitBarberDeposit
          : Number(
              meta.serviceId && !meta.items ? meta.price : meta.totalPrice,
            );
      if (
        !Number.isInteger(barberUserId) ||
        barberUserId <= 0 ||
        !Number.isFinite(serviceAmount) ||
        serviceAmount <= 0
      ) {
        throw new BadRequestException(
          'اطلاعات مبلغ یا حساب آرایشگر در پرداخت معتبر نیست.',
        );
      }

      const walletCredit = await this.walletService.depositOnceWithManager(
        manager,
        {
          userId: barberUserId,
          amount: serviceAmount,
          description: `درآمد رزرو نوبت ${payment.orderId} - منشیم`,
          paymentId: payment.id,
          legacyReference: payment.refNumber,
        },
      );
      if (!walletCredit) {
        throw new BadRequestException(
          'واریز درآمد رزرو به کیف پول ناموفق بود.',
        );
      }
    });

    for (const booking of createdBookings) {
      void this.sendPaidBookingSms(booking);
    }

    if (!refunded && createdBookings.length > 0) {
      void this.baleNotificationService?.notifyOnlineBookingPaid(
        payment,
        createdBookings.map(booking => booking.id),
      );
    }

    return { refunded };
  }

  /**
   * آیا رزروهایی که بعد از پرداخت ساخته می‌شوند با نوبت‌های موجود تداخل دارند؟
   *
   * فقط وقتی می‌تواند «بله» باشد که مهلت نگه‌داشتن ساعت تمام شده و شخص
   * دیگری آن ساعت را رزرو کرده باشد؛ در حالت عادی همیشه «خیر» است.
   */
  private async hasFulfillmentConflict(
    manager: EntityManager,
    meta: any,
  ): Promise<boolean> {
    const items = Array.isArray(meta?.items) ? meta.items : [];
    if (!items.length || !meta?.date || !meta?.barberProfileId) return false;

    const existing = await manager.getRepository(Booking).find({
      where: {
        barberId: String(meta.barberProfileId),
        date: String(meta.date),
        holdsSlot: true,
      },
      relations: { service: true },
    });

    if (!existing.length) return false;

    const busy = existing.map(booking => {
      const start = timeToMinutes(booking.time);
      return {
        start,
        end: start + (booking.service?.durationMinutes ?? 30),
      };
    });

    return items.some(item => {
      const start = timeToMinutes(String(item.time));
      const duration = Number(item.durationMinutes) || 30;

      return hasOverlap({ start, end: start + duration }, busy);
    });
  }

  private async sendDepositPaidSms(bookingId: string): Promise<void> {
    try {
      const booking = await this.bookingRepo.findOne({
        where: { id: bookingId },
        relations: {
          customer: true,
          barber: { user: true },
        },
      });

      if (!booking) return;

      await Promise.allSettled([
        this.bookingSmsService.sendDepositPaidToBarber(
          booking.barber?.user?.phone ?? '',
          {
            customerName: booking.customer?.fullName ?? 'مشتری',
            date: booking.date,
            time: booking.time,
          },
        ),
        this.bookingSmsService.sendDepositPaidToCustomer(
          booking.customer?.phone ?? '',
          {
            date: booking.date,
            time: booking.time,
            salonName: booking.barber?.salonName ?? 'سالن',
          },
        ),
      ]);
    } catch (error: any) {
      // خطای پیامک نباید پرداخت تأییدشده یا واریز بیعانه را برگرداند.
      this.logger.error(
        `Failed to send deposit-paid SMS for booking ${bookingId}: ${error?.message ?? String(error)}`,
      );
    }
  }

  private async sendPaidBookingSms(booking: Booking): Promise<void> {
    try {
      const savedBooking = await this.bookingRepo.findOne({
        where: { id: booking.id },
        relations: {
          customer: true,
          service: true,
          barber: { user: true },
        },
      });

      if (!savedBooking) return;

      const customerName = savedBooking.customer?.fullName ?? 'مشتری';
      const serviceName = savedBooking.service?.name ?? 'خدمت';
      const barberParams = {
        customerName,
        serviceName,
        date: savedBooking.date,
        time: savedBooking.time,
      };

      /**
       * در این لحظه نوبت هنوز «در انتظار تایید» است؛ پس پیامک «تأیید رزرو»
       * برای مشتری اشتباه و گمراه‌کننده می‌شد. مشتری پس از تایید آرایشگر
       * پیامک تأیید می‌گیرد و فقط آرایشگر از رزرو جدید باخبر می‌شود.
       */
      await this.bookingSmsService.sendNewBookingToBarber(
        savedBooking.barber?.user?.phone ?? '',
        barberParams,
      );
    } catch (error: any) {
      // خطای پیامک نباید پرداخت و ثبت رزرو را ناموفق کند.
      this.logger.error(
        `Failed to send new-booking SMS for booking ${booking.id}: ${error?.message ?? String(error)}`,
      );
    }
  }

  // استعلام وضعیت پرداخت
  async getPaymentStatus(trackId: number) {
    const payment = await this.paymentRepo.findOne({ where: { trackId } });
    if (!payment) {
      throw new NotFoundException('تراکنش پرداخت یافت نشد');
    }
    return payment;
  }
}
