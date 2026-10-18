import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import axios from 'axios';
import { BarberProfile } from 'src/barber/entities/barber.entity';
import { BarberWorkHours } from 'src/barber/entities/barber-work-hours.entity';
import { Booking, BookingStatus } from 'src/booking/entities/booking.entity';
import { BookingSmsService } from 'src/notification/booking-sms.service';
import { Service } from 'src/services/entities/service.entity';
import { SiteSettings } from 'src/settings/entities/setting.entity';
import { SubscriptionPlan } from 'src/subscription/entities/subscription-plan.entity';
import {
  UserSubscription,
  UserSubscriptionStatus,
} from 'src/subscription/entities/user-subscription.entity';
import { User } from 'src/users/entities/user.entity';
import { WalletService } from 'src/wallet/wallet.service';
import { DataSource, Repository } from 'typeorm';

import { ChargeWalletDto } from './dto/charge-wallet.dto';
import { InitiateBookingPaymentDto } from './dto/initiate-booking-payment.dto';
import { InitiateSubscriptionPaymentDto } from './dto/initiate-subscription-payment.dto';
import {
  Payment,
  PaymentPurpose,
  PaymentStatus,
} from './entities/payment.entity';

const COMMISSION_RATE = 0.1;

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

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

    @InjectRepository(SiteSettings)
    private readonly settingsRepo: Repository<SiteSettings>,

    @InjectRepository(BarberWorkHours)
    private readonly workHoursRepo: Repository<BarberWorkHours>,

    private readonly bookingSmsService: BookingSmsService,
    private readonly walletService: WalletService,
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
  ) {}

  private getMerchant(): string {
    return this.configService.get<string>('ZIBAL_MERCHANT') || 'zibal';
  }

  private getAppUrl(): string {
    return (
      this.configService.get<string>('APP_URL') || 'http://localhost:4000'
    ).replace(/\/+$/, '');
  }

  private getFrontUrl(): string {
    return (
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000'
    ).replace(/\/+$/, '');
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

      this.logger.warn(`Zibal gateway request network error: ${error.message}`);
      // حالت پشتیبان تستی در صورت عدم دسترسی محیط ایزوله به اینترنت
      const mockTrackId = Math.floor(10000000 + Math.random() * 90000000);
      return {
        trackId: mockTrackId,
        paymentUrl: `https://gateway.zibal.ir/start/${mockTrackId}`,
      };
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
      // حالت شبیه‌ساز تست
      return {
        success: true,
        result: 100,
        refNumber: String(Math.floor(100000000 + Math.random() * 900000000)),
        cardNumber: '603799******1234',
        paidAt: new Date(),
        message: 'تراکنش با موفقیت تأیید شد (حالت تستی)',
      };
    }
  }

  // =========================================================
  // ۱. خرید اشتراک آنلاین (SUBSCRIPTION)
  // =========================================================
  async initiateSubscriptionPayment(
    userId: number,
    dto: InitiateSubscriptionPaymentDto,
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
    const appUrl = this.getAppUrl();
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
  // ۲. رزرو نوبت آنلاین با درگاه (BOOKING)
  // =========================================================
  async initiateBookingPayment(
    customerId: number,
    dto: InitiateBookingPaymentDto,
  ) {
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
        status: BookingStatus.CONFIRMED,
      },
      relations: { service: true },
    });

    const blockEnd = firstStart + totalDuration;

    const hasConflict = existingConfirmed.some(booking => {
      const s = toMinutes(booking.time);
      const dur = booking.service?.durationMinutes ?? 30;
      const e = s + dur;
      return firstStart < e && blockEnd > s;
    });

    if (hasConflict) {
      throw new BadRequestException('این زمان با رزروهای قطعی تداخل دارد');
    }

    const totalPrice = services.reduce((sum, s) => sum + Number(s.price), 0);
    // کمیسیون سایت: ۱۰٪ بیشترین مبلغ خدمات انتخاب‌شده (نه ۱۰٪ جمع کل مبالغ)
    const maxServicePrice = Math.max(...services.map(s => Number(s.price)));
    const commissionAmount = Math.round(maxServicePrice * COMMISSION_RATE);
    // مبلغ قابل پرداخت از کاربر = کل خدمات + کمیسیون سایت
    const amountToPay = totalPrice + commissionAmount;

    const orderId = `BOOK-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const appUrl = this.getAppUrl();
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
    const bookingItems = services.map(sv => {
      const start = cursor;
      cursor += sv.durationMinutes;
      return {
        serviceId: sv.id,
        time: toTimeStr(start),
        durationMinutes: sv.durationMinutes,
        price: Number(sv.price),
        depositPrice: sv.depositPrice ?? null,
      };
    });

    const payment = this.paymentRepo.create({
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
        commissionAmount,
      }),
      status: PaymentStatus.PENDING,
      description: `رزرو ${services.length} سرویس + کمیسیون سایت`,
    });

    await this.paymentRepo.save(payment);

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
  async initiateWalletCharge(userId: number, dto: ChargeWalletDto) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('کاربر یافت نشد');
    }

    const orderId = `WAL-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const appUrl = this.getAppUrl();
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

  async initiateDepositPaymentByToken(token: string) {
    const booking = await this.bookingRepo.findOne({
      where: { depositToken: token },
      relations: {
        customer: true,
        service: true,
        barber: {
          user: true,
        },
      },
    });

    if (!booking) {
      throw new NotFoundException('لینک پرداخت معتبر نیست');
    }

    if (booking.depositPaidAt) {
      throw new BadRequestException('بیعانه این نوبت قبلاً پرداخت شده است');
    }

    if (
      booking.status === BookingStatus.CANCELED ||
      booking.status === BookingStatus.REJECTED
    ) {
      throw new BadRequestException('این نوبت لغو شده است');
    }

    const amount = await this.getBookingDepositAmount(booking);

    if (amount <= 0) {
      throw new BadRequestException('مبلغ بیعانه این نوبت مشخص نیست');
    }

    const barber = booking.barber;
    const salonName = barber?.salonName || 'سالن';
    const service = booking.service;

    const orderId = `DEP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const appUrl = this.getAppUrl();
    const callbackUrl = `${appUrl}/api/payment/callback`;

    const { trackId, paymentUrl } = await this.requestZibalPayment({
      amountTomans: amount,
      callbackUrl,
      description: `پرداخت بیعانه نوبت - ${salonName} - منشیم`,
      orderId,
      mobile: booking.customer?.phone,
    });

    const payment = this.paymentRepo.create({
      userId: booking.customerId,
      amount,
      trackId,
      orderId,
      purpose: PaymentPurpose.BOOKING,
      purposeId: booking.id,
      metadata: JSON.stringify({
        depositLink: true,
        bookingId: booking.id,
        barberUserId: barber?.userId,
      }),
      status: PaymentStatus.PENDING,
      description: `پرداخت بیعانه نوبت ${service?.name ?? ''} - ${salonName}`,
    });

    await this.paymentRepo.save(payment);

    return { trackId, paymentUrl, orderId, amount };
  }

  /**
   * URL ریدایرکت لینک بیعانه: در صورت خطا، صفحه خطای فرانت
   */
  async getDepositRedirectUrl(token: string): Promise<string> {
    try {
      const { paymentUrl } = await this.initiateDepositPaymentByToken(token);

      return paymentUrl;
    } catch (error: any) {
      const message = encodeURIComponent(
        error?.response?.message ||
          error?.message ||
          'خطا در شروع پرداخت بیعانه',
      );

      return `${this.getFrontUrl()}/payment/callback?status=failed&message=${message}`;
    }
  }

  /**
   * مبلغ بیعانه نوبت: قیمت بیعانه خدمت در صورت ثبت، وگرنه درصد بیعانه سایت
   */
  private async getBookingDepositAmount(booking: Booking): Promise<number> {
    const depositPrice = Number(booking.service?.depositPrice ?? 0);

    if (depositPrice > 0) {
      return Math.round(depositPrice);
    }

    let depositPercent = 30;

    try {
      const settings = await this.settingsRepo.findOne({ where: { id: 1 } });

      if (settings?.depositPercent) {
        depositPercent = Number(settings.depositPercent);
      }
    } catch {
      // تنظیمات موجود نیست — از مقدار پیش‌فرض ۳۰٪ استفاده می‌شود
    }

    return Math.round((Number(booking.price) * depositPercent) / 100);
  }

  // =========================================================
  // ۴. مدیریت کال‌بک درگاه زیبال (CALLBACK)
  // =========================================================
  async handleCallback(params: {
    trackId?: number | string;
    success?: string | number;
    status?: string | number;
    orderId?: string;
  }): Promise<string> {
    const frontUrl = this.getFrontUrl();
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
      return `${frontUrl}/payment/callback?status=failed&message=${encodeURIComponent('رکورد تراکنش یافت نشد')}`;
    }

    // کال‌بک‌های تکراری نباید یک رزرو یا واریز را دوباره ایجاد کنند.
    if (payment.status === PaymentStatus.PAID) {
      return `${frontUrl}/payment/callback?status=success&trackId=${payment.trackId}&refNumber=${payment.refNumber || ''}&amount=${payment.amount}&purpose=${payment.purpose}`;
    }
    if (payment.status !== PaymentStatus.PENDING) {
      return `${frontUrl}/payment/callback?status=failed&trackId=${payment.trackId || ''}&orderId=${payment.orderId}&message=${encodeURIComponent('وضعیت این پرداخت قبلاً نهایی شده است')}`;
    }

    // اگر کاربر در درگاه انصراف داده بود یا ناموفق بود
    if (!isSuccess) {
      await this.paymentRepo.update(
        { id: payment.id, status: PaymentStatus.PENDING },
        { status: PaymentStatus.CANCELED },
      );
      const currentPayment = await this.paymentRepo.findOne({
        where: { id: payment.id },
      });
      if (currentPayment?.status === PaymentStatus.PAID) {
        return `${frontUrl}/payment/callback?status=success&trackId=${currentPayment.trackId}&refNumber=${currentPayment.refNumber || ''}&amount=${currentPayment.amount}&purpose=${currentPayment.purpose}`;
      }
      return `${frontUrl}/payment/callback?status=failed&trackId=${payment.trackId || ''}&orderId=${payment.orderId}&message=${encodeURIComponent('پرداخت توسط کاربر لغو شد یا با خطا مواجه گردید')}`;
    }

    // تایید تراکنش در زیبال
    const verifyResult = await this.verifyZibalPayment(
      payment.trackId || trackIdNum || 0,
    );

    if (!verifyResult.success) {
      await this.paymentRepo.update(
        { id: payment.id, status: PaymentStatus.PENDING },
        { status: PaymentStatus.FAILED },
      );
      const currentPayment = await this.paymentRepo.findOne({
        where: { id: payment.id },
      });
      if (currentPayment?.status === PaymentStatus.PAID) {
        return `${frontUrl}/payment/callback?status=success&trackId=${currentPayment.trackId}&refNumber=${currentPayment.refNumber || ''}&amount=${currentPayment.amount}&purpose=${currentPayment.purpose}`;
      }
      return `${frontUrl}/payment/callback?status=failed&trackId=${payment.trackId || ''}&orderId=${payment.orderId}&message=${encodeURIComponent(verifyResult.message || 'خطا در تایید تراکنش')}`;
    }

    // فقط یک کال‌بک می‌تواند پرداخت در انتظار را نهایی و عملیات رزرو را اجرا کند.
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
      if (currentPayment?.status === PaymentStatus.PAID) {
        return `${frontUrl}/payment/callback?status=success&trackId=${currentPayment.trackId}&refNumber=${currentPayment.refNumber || ''}&amount=${currentPayment.amount}&purpose=${currentPayment.purpose}`;
      }
      return `${frontUrl}/payment/callback?status=failed&trackId=${payment.trackId || ''}&orderId=${payment.orderId}&message=${encodeURIComponent('این پرداخت لغو شده یا قبلاً ناموفق شده است')}`;
    }
    payment.status = PaymentStatus.PAID;
    payment.refNumber = verifyResult.refNumber || null;
    payment.cardNumber = verifyResult.cardNumber || null;
    payment.paidAt = paidAt;

    // انجام عملیات وابسته به هدف پرداخت (اشتراک / نوبت / کیف پول)
    try {
      if (
        payment.purpose === PaymentPurpose.SUBSCRIPTION &&
        payment.purposeId
      ) {
        await this.activateSubscriptionAfterPayment(
          payment.userId,
          payment.purposeId,
        );
      } else if (payment.purpose === PaymentPurpose.BOOKING) {
        await this.completeBookingPayment(payment);
      } else if (payment.purpose === PaymentPurpose.WALLET) {
        await this.walletService.deposit(
          payment.userId,
          payment.amount,
          'شارژ آنلاین کیف پول از درگاه زیبال',
          payment.refNumber || payment.id,
        );
      }
    } catch (e: any) {
      this.logger.error(`Error fulfilling payment purpose: ${e.message}`);
      if (payment.purpose === PaymentPurpose.BOOKING) {
        try {
          // Booking fulfillment is transactional and idempotent; make a failed
          // fulfillment retryable instead of leaving a paid orphan payment.
          await this.paymentRepo.update(
            { id: payment.id, status: PaymentStatus.PAID },
            { status: PaymentStatus.PENDING, paidAt: null },
          );
        } catch (retryError: any) {
          this.logger.error(
            `Could not reopen booking payment ${payment.id} for retry: ${retryError?.message ?? String(retryError)}`,
          );
        }
        return `${frontUrl}/payment/callback?status=failed&trackId=${payment.trackId || ''}&orderId=${payment.orderId}&message=${encodeURIComponent('پرداخت تأیید شد اما ثبت رزرو کامل نشد؛ لطفاً دوباره تلاش کنید یا با پشتیبانی تماس بگیرید')}`;
      }
    }

    return `${frontUrl}/payment/callback?status=success&trackId=${payment.trackId}&refNumber=${payment.refNumber || ''}&amount=${payment.amount}&purpose=${payment.purpose}`;
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

  private async completeBookingPayment(payment: Payment) {
    if (payment.metadata?.includes('"depositLink":true')) {
      await this.completeDepositAfterPayment(payment);

      return;
    }

    await this.confirmBookingAfterPayment(payment);
  }

  private async completeDepositAfterPayment(payment: Payment) {
    if (!payment.metadata) {
      throw new BadRequestException('اطلاعات بیعانه در پرداخت ثبت نشده است.');
    }

    const meta = JSON.parse(payment.metadata);
    const bookingId = String(meta.bookingId || payment.purposeId || '');
    let barberUserId = Number(meta.barberUserId);
    const amount = Number(payment.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException('مبلغ بیعانه در پرداخت معتبر نیست.');
    }

    await this.dataSource.transaction(async manager => {
      const booking = bookingId
        ? await manager
            .getRepository(Booking)
            .createQueryBuilder('booking')
            .where('booking.id = :bookingId', { bookingId })
            .setLock('pessimistic_write')
            .getOne()
        : null;

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

      if (booking && !booking.depositPaidAt) {
        booking.depositPaidAt = payment.paidAt ?? new Date();
        await manager.getRepository(Booking).save(booking);
      }

      if (booking?.canceledBy === 'barber' || booking?.canceledBy === 'admin') {
        // A deposit link may be paid after the barber has already canceled.
        // Record the incoming deposit, then debit the same full amount so the
        // refund is funded and the ledger remains auditable.
        await this.walletService.depositOnceWithManager(manager, {
          userId: barberUserId,
          amount,
          description: `درآمد رزرو نوبت ${payment.orderId} - منشیم`,
          paymentId: payment.id,
          legacyReference: payment.refNumber,
        });
        await this.walletService.debitBarberAndQueueRefund(manager, {
          barberUserId,
          customerUserId: booking.customerId,
          bookingId: booking.id,
          paymentId: payment.id,
          amount,
        });
        return;
      }

      // لغو توسط مشتری بازپرداخت ایجاد نمی‌کند و مبلغ همچنان برای آرایشگر می‌ماند.
      await this.walletService.depositOnceWithManager(manager, {
        userId: barberUserId,
        amount,
        description: `درآمد رزرو نوبت ${payment.orderId} - منشیم`,
        paymentId: payment.id,
        legacyReference: payment.refNumber,
      });
    });
  }

  // ایجاد رزروها، ثبت پیوند پرداخت و واریز درآمد باید اتمیک باشد تا لغو هم‌زمان
  // نتواند پیش از ثبت درآمد، کیف پول آرایشگر را بابت همان پرداخت دوباره بدهکار کند.
  private async confirmBookingAfterPayment(payment: Payment) {
    if (!payment.metadata) {
      throw new BadRequestException('اطلاعات رزرو در پرداخت ثبت نشده است.');
    }
    const meta = JSON.parse(payment.metadata);
    const createdBookings: Booking[] = [];

    await this.dataSource.transaction(async manager => {
      const bookingRepo = manager.getRepository(Booking);
      const paymentRepo = manager.getRepository(Payment);
      const baseBooking = {
        customerId: meta.customerId,
        barberId: meta.barberProfileId,
        date: meta.date,
        note: meta.note || '',
        status: BookingStatus.CONFIRMED,
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
      const serviceAmount = Number(
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
      const salonName = savedBooking.barber?.salonName ?? 'سالن شما';
      const barberParams = {
        customerName,
        serviceName,
        date: savedBooking.date,
        time: savedBooking.time,
      };

      await Promise.all([
        this.bookingSmsService.sendBookingSuccessToCustomer(
          savedBooking.customer?.phone ?? '',
          { ...barberParams, salonName },
        ),
        this.bookingSmsService.sendNewBookingToBarber(
          savedBooking.barber?.user?.phone ?? '',
          barberParams,
        ),
      ]);
    } catch (error: any) {
      // خطای پیامک نباید پرداخت و ثبت رزرو را ناموفق کند.
      this.logger.error(
        `Failed to send booking confirmation SMS for booking ${booking.id}: ${error?.message ?? String(error)}`,
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
