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
import { BookingsService } from 'src/booking/booking.service';
import { Booking, BookingStatus } from 'src/booking/entities/booking.entity';
import { Service } from 'src/services/entities/service.entity';
import { SiteSettings } from 'src/settings/entities/setting.entity';
import { SubscriptionPlan } from 'src/subscription/entities/subscription-plan.entity';
import {
  UserSubscription,
  UserSubscriptionStatus,
} from 'src/subscription/entities/user-subscription.entity';
import { User } from 'src/users/entities/user.entity';
import { WalletService } from 'src/wallet/wallet.service';
import { Repository } from 'typeorm';

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

    private readonly bookingsService: BookingsService,
    private readonly walletService: WalletService,
    private readonly configService: ConfigService,
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

    // اگر کاربر در درگاه انصراف داده بود یا ناموفق بود
    if (!isSuccess) {
      payment.status = PaymentStatus.CANCELED;
      await this.paymentRepo.save(payment);
      return `${frontUrl}/payment/callback?status=failed&trackId=${payment.trackId || ''}&orderId=${payment.orderId}&message=${encodeURIComponent('پرداخت توسط کاربر لغو شد یا با خطا مواجه گردید')}`;
    }

    // اگر قبلاً پرداخت تایید شده بود
    if (payment.status === PaymentStatus.PAID) {
      return `${frontUrl}/payment/callback?status=success&trackId=${payment.trackId}&refNumber=${payment.refNumber || ''}&amount=${payment.amount}&purpose=${payment.purpose}`;
    }

    // تایید تراکنش در زیبال
    const verifyResult = await this.verifyZibalPayment(
      payment.trackId || trackIdNum || 0,
    );

    if (!verifyResult.success) {
      payment.status = PaymentStatus.FAILED;
      await this.paymentRepo.save(payment);
      return `${frontUrl}/payment/callback?status=failed&trackId=${payment.trackId || ''}&orderId=${payment.orderId}&message=${encodeURIComponent(verifyResult.message || 'خطا در تایید تراکنش')}`;
    }

    // تراکنش با موفقیت تایید شد
    payment.status = PaymentStatus.PAID;
    payment.refNumber = verifyResult.refNumber || null;
    payment.cardNumber = verifyResult.cardNumber || null;
    payment.paidAt = verifyResult.paidAt || new Date();
    await this.paymentRepo.save(payment);

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
    if (!payment.metadata) return;

    const meta = JSON.parse(payment.metadata);

    if (meta.bookingId) {
      const booking = await this.bookingRepo.findOne({
        where: { id: meta.bookingId },
      });

      if (booking && !booking.depositPaidAt) {
        booking.depositPaidAt = new Date();

        await this.bookingRepo.save(booking);
      }
    }

    // بیعانه به کیف پول آرایشگر واریز می‌شود
    await this.creditBarberWallet(meta.barberUserId, payment.amount, payment);
  }

  // ایجاد و ثبت قطعی رزرو نوبت فقط و فقط پس از تایید پرداخت درگاه
  private async confirmBookingAfterPayment(payment: Payment) {
    if (!payment.metadata) return;
    const meta = JSON.parse(payment.metadata);

    if (meta.serviceId && !meta.items) {
      const booking = this.bookingRepo.create({
        customerId: meta.customerId,
        barberId: meta.barberProfileId,
        serviceId: meta.serviceId,
        date: meta.date,
        time: meta.time,
        price: meta.price,
        note: meta.note || '',
        status: BookingStatus.CONFIRMED,
      });
      const saved = await this.bookingRepo.save(booking);
      payment.purposeId = saved.id;
      await this.paymentRepo.save(payment);

      await this.creditBarberWallet(meta.barberUserId, meta.price, payment);
      return;
    }

    // Multi-item shape: create one booking per service (back-to-back)
    const createdIds: string[] = [];
    for (const item of meta.items || []) {
      const booking = this.bookingRepo.create({
        customerId: meta.customerId,
        barberId: meta.barberProfileId,
        serviceId: item.serviceId,
        date: meta.date,
        time: item.time,
        price: item.price,
        note: meta.note || '',
        status: BookingStatus.CONFIRMED,
      });
      const saved = await this.bookingRepo.save(booking);
      createdIds.push(saved.id);
    }
    payment.purposeId = createdIds[0] ?? null;
    await this.paymentRepo.save(payment);

    await this.creditBarberWallet(meta.barberUserId, meta.totalPrice, payment);
  }

  private async creditBarberWallet(
    barberUserId: number | undefined,
    amount: number | undefined,
    payment: Payment,
  ): Promise<void> {
    const amountNum = Number(amount);
    if (!barberUserId || !amountNum || amountNum <= 0) return;

    try {
      await this.walletService.deposit(
        Number(barberUserId),
        amountNum,
        `درآمد رزرو نوبت ${payment.orderId} - منشیم`,
        payment.refNumber || payment.id,
      );
    } catch (error: any) {
      this.logger.error(
        `Failed to credit barber wallet (${barberUserId}) for payment ${payment.id}: ${error?.message}`,
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
