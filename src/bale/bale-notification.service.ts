import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { BarberProfile } from 'src/barber/entities/barber.entity';
import { Booking } from 'src/booking/entities/booking.entity';
import { Payment } from 'src/payment/entities/payment.entity';
import { SubscriptionPlan } from 'src/subscription/entities/subscription-plan.entity';
import { User } from 'src/users/entities/user.entity';
import { BankCard } from 'src/wallet/entities/bank-card.entity';
import { Transaction } from 'src/wallet/entities/transaction.entity';
import { In, Repository } from 'typeorm';

import { BaleClientService } from './bale-client.service';
import {
  formatCount,
  formatJalaliDateVerbose,
  formatTehranDateTime,
  formatToman,
  toFaDigits,
} from './bale-time.util';

const DIVIDER = '━━━━━━━━━━━━━━━━━━';

const ACTIVITY_TYPE_LABELS: Record<string, string> = {
  men: 'مردانه',
  women: 'زنانه',
  both: 'مردانه و زنانه',
};

@Injectable()
export class BaleNotificationService {
  private readonly logger = new Logger(BaleNotificationService.name);

  constructor(
    private readonly baleClient: BaleClientService,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(BarberProfile)
    private readonly barberProfileRepo: Repository<BarberProfile>,
    @InjectRepository(Booking)
    private readonly bookingRepo: Repository<Booking>,
    @InjectRepository(SubscriptionPlan)
    private readonly planRepo: Repository<SubscriptionPlan>,
  ) {}

  /**
   * ۱) اعلان ثبت درخواست برداشت توسط آرایشگر
   */
  async notifyWithdrawalRequested(params: {
    userId: number;
    transaction: Transaction;
    card: BankCard;
    remainingBalance: number;
    note?: string | null;
  }): Promise<void> {
    if (!this.baleClient.isEnabled()) return;

    try {
      const user = await this.userRepo.findOne({
        where: { id: params.userId },
        relations: { barberProfile: true },
      });

      const barberName = user?.fullName?.trim() || `کاربر #${params.userId}`;
      const salonName = user?.barberProfile?.salonName?.trim() || '—';
      const phone = user?.phone || '—';
      const sheba = params.card.shebaNumber
        ? params.card.shebaNumber.startsWith('IR')
          ? params.card.shebaNumber
          : `IR${params.card.shebaNumber}`
        : '—';

      const lines = [
        '🏧 درخواست برداشت جدید آرایشگر',
        DIVIDER,
        `👤 آرایشگر: ${barberName}`,
        `💈 سالن: ${salonName}`,
        `📱 موبایل: ${phone}`,
        '',
        `💵 مبلغ درخواستی: ${formatToman(params.transaction.amount)}`,
        `💼 موجودی باقی‌مانده کیف پول: ${formatToman(params.remainingBalance)}`,
        '',
        `🏦 بانک مقصد: ${params.card.bankName || '—'}`,
        `🪪 صاحب حساب: ${params.card.ownerName || '—'}`,
        `💳 شماره کارت: ${params.card.cardNumber || '—'}`,
        `🔢 شبا: ${sheba}`,
        ...(params.note?.trim() ? [`📝 توضیحات: ${params.note.trim()}`] : []),
        '',
        `🆔 شناسه درخواست: ${params.transaction.id}`,
        `🕒 زمان ثبت: ${formatTehranDateTime(params.transaction.createdAt)}`,
      ];

      await this.baleClient.broadcastToAdmins(lines.join('\n'));
    } catch (error: unknown) {
      this.logger.warn(
        `ارسال اعلان درخواست برداشت به بله ناموفق بود: ${this.describeError(error)}`,
      );
    }
  }

  /**
   * ۲) اعلان پرداخت موفق رزرو آنلاین نوبت از طریق درگاه
   */
  async notifyOnlineBookingPaid(
    payment: Payment,
    bookingIds: string[],
  ): Promise<void> {
    if (!this.baleClient.isEnabled() || !bookingIds.length) return;

    try {
      const bookings = await this.bookingRepo.find({
        where: { id: In(bookingIds) },
        relations: {
          customer: true,
          service: true,
          barber: { user: true },
        },
        order: { time: 'ASC' },
      });

      if (!bookings.length) return;

      const primary = bookings[0];
      const meta = this.parseJson(payment.metadata);
      const serviceNames = bookings
        .map(b => b.service?.name)
        .filter(Boolean)
        .join('، ');
      const totalServicePrice =
        this.toPositiveNumber(meta?.totalPrice) ??
        bookings.reduce((sum, b) => sum + Number(b.price || 0), 0);
      const barberShare = this.toPositiveNumber(meta?.depositAmount);
      const commission = this.toNonNegativeNumber(meta?.commissionAmount);

      const lines = [
        '✅ پرداخت موفق جدید',
        DIVIDER,
        '📌 بابت پرداخت: رزرو آنلاین نوبت آرایشگاه',
        `💳 مبلغ پرداختی: ${formatToman(payment.amount)}`,
        `🏷 جمع مبلغ خدمات: ${formatToman(totalServicePrice)}`,
        ...(barberShare !== null
          ? [`💼 سهم کیف پول آرایشگر: ${formatToman(barberShare)}`]
          : []),
        ...(commission !== null
          ? [`🏛 کمیسیون سایت: ${formatToman(commission)}`]
          : []),
        '',
        `👤 مشتری: ${primary.customer?.fullName || 'مشتری'} (${primary.customer?.phone || '—'})`,
        `💈 سالن: ${primary.barber?.salonName || '—'}`,
        `✂️ آرایشگر: ${primary.barber?.user?.fullName || '—'} (${primary.barber?.user?.phone || '—'})`,
        `🧾 خدمات: ${serviceNames || '—'}`,
        `📆 تاریخ نوبت: ${formatJalaliDateVerbose(primary.date)}`,
        `⏰ ساعت شروع: ${toFaDigits(String(primary.time ?? '').slice(0, 5))}`,
        '',
        `🧾 شماره سفارش: ${payment.orderId}`,
        ...(payment.refNumber ? [`🔢 کد مرجع: ${payment.refNumber}`] : []),
        `🕒 زمان پرداخت: ${formatTehranDateTime(payment.paidAt ?? new Date())}`,
      ];

      await this.baleClient.broadcastToAdmins(lines.join('\n'));
    } catch (error: unknown) {
      this.logger.warn(
        `ارسال اعلان پرداخت رزرو آنلاین به بله ناموفق بود: ${this.describeError(error)}`,
      );
    }
  }

  /**
   * ۳) اعلان پرداخت موفق بیعانه از طریق لینک بیعانه
   */
  async notifyDepositPaid(
    payment: Payment,
    bookingIds: string[],
  ): Promise<void> {
    if (!this.baleClient.isEnabled() || !bookingIds.length) return;

    try {
      const bookings = await this.bookingRepo.find({
        where: { id: In(bookingIds) },
        relations: {
          customer: true,
          service: true,
          barber: { user: true },
        },
        order: { time: 'ASC' },
      });

      if (!bookings.length) return;

      const primary = bookings[0];
      const meta = this.parseJson(payment.metadata);
      const serviceNames = bookings
        .map(b => b.service?.name)
        .filter(Boolean)
        .join('، ');
      const barberShare = this.toPositiveNumber(meta?.depositAmount);
      const commission = this.toNonNegativeNumber(meta?.commissionAmount);

      const lines = [
        '✅ پرداخت موفق جدید',
        DIVIDER,
        '📌 بابت پرداخت: بیعانه نوبت (لینک پرداخت)',
        `💳 مبلغ پرداختی: ${formatToman(payment.amount)}`,
        ...(barberShare !== null
          ? [`💼 بیعانه واریزی به آرایشگر: ${formatToman(barberShare)}`]
          : []),
        ...(commission !== null
          ? [`🏛 کمیسیون سایت: ${formatToman(commission)}`]
          : []),
        '',
        `👤 مشتری: ${primary.customer?.fullName || 'مشتری'} (${primary.customer?.phone || '—'})`,
        `💈 سالن: ${primary.barber?.salonName || '—'}`,
        `✂️ آرایشگر: ${primary.barber?.user?.fullName || '—'} (${primary.barber?.user?.phone || '—'})`,
        `🧾 خدمات: ${serviceNames || '—'}`,
        `📆 تاریخ نوبت: ${formatJalaliDateVerbose(primary.date)}`,
        `⏰ ساعت شروع: ${toFaDigits(String(primary.time ?? '').slice(0, 5))}`,
        '',
        `🧾 شماره سفارش: ${payment.orderId}`,
        ...(payment.refNumber ? [`🔢 کد مرجع: ${payment.refNumber}`] : []),
        `🕒 زمان پرداخت: ${formatTehranDateTime(payment.paidAt ?? new Date())}`,
      ];

      await this.baleClient.broadcastToAdmins(lines.join('\n'));
    } catch (error: unknown) {
      this.logger.warn(
        `ارسال اعلان پرداخت بیعانه به بله ناموفق بود: ${this.describeError(error)}`,
      );
    }
  }

  /**
   * ۴) اعلان پرداخت موفق خرید اشتراک توسط آرایشگر
   */
  async notifySubscriptionPurchased(
    payment: Payment,
    planId: string,
  ): Promise<void> {
    if (!this.baleClient.isEnabled()) return;

    try {
      const [user, plan] = await Promise.all([
        this.userRepo.findOne({
          where: { id: payment.userId },
          relations: { barberProfile: true },
        }),
        this.planRepo.findOne({ where: { id: planId } }),
      ]);

      const planLabel = plan?.name || payment.description || 'اشتراک منشیم';

      const lines = [
        '✅ پرداخت موفق جدید',
        DIVIDER,
        `📌 بابت پرداخت: خرید اشتراک (${planLabel})`,
        `💳 مبلغ پرداختی: ${formatToman(payment.amount)}`,
        ...(plan
          ? [
              `⏳ مدت اعتبار: ${formatCount(plan.durationDays)} روز`,
              `✉️ اعتبار پیامک: ${formatCount(plan.smsCount)} پیامک`,
            ]
          : []),
        '',
        `👤 خریدار: ${user?.fullName || `کاربر #${payment.userId}`}`,
        `💈 سالن: ${user?.barberProfile?.salonName || '—'}`,
        `📱 موبایل: ${user?.phone || '—'}`,
        '',
        `🧾 شماره سفارش: ${payment.orderId}`,
        ...(payment.refNumber ? [`🔢 کد مرجع: ${payment.refNumber}`] : []),
        `🕒 زمان پرداخت: ${formatTehranDateTime(payment.paidAt ?? new Date())}`,
      ];

      await this.baleClient.broadcastToAdmins(lines.join('\n'));
    } catch (error: unknown) {
      this.logger.warn(
        `ارسال اعلان خرید اشتراک به بله ناموفق بود: ${this.describeError(error)}`,
      );
    }
  }

  /**
   * ۵) اعلان پرداخت موفق خرید پکیج صفحهٔ اختصاصی آرایشگاه (سئو)
   */
  async notifyPublicPagePurchased(payment: Payment): Promise<void> {
    if (!this.baleClient.isEnabled()) return;

    try {
      const user = await this.userRepo.findOne({
        where: { id: payment.userId },
        relations: { barberProfile: true },
      });
      const profile =
        user?.barberProfile ??
        (await this.barberProfileRepo.findOne({
          where: { userId: payment.userId },
        }));

      const lines = [
        '✅ پرداخت موفق جدید',
        DIVIDER,
        '📌 بابت پرداخت: خرید پکیج صفحه اختصاصی آرایشگاه',
        `💳 مبلغ پرداختی: ${formatToman(payment.amount)}`,
        '',
        `👤 آرایشگر: ${user?.fullName || `کاربر #${payment.userId}`}`,
        `💈 سالن: ${profile?.salonName || '—'}`,
        `📱 موبایل: ${user?.phone || '—'}`,
        '',
        `🧾 شماره سفارش: ${payment.orderId}`,
        ...(payment.refNumber ? [`🔢 کد مرجع: ${payment.refNumber}`] : []),
        `🕒 زمان پرداخت: ${formatTehranDateTime(payment.paidAt ?? new Date())}`,
      ];

      await this.baleClient.broadcastToAdmins(lines.join('\n'));
    } catch (error: unknown) {
      this.logger.warn(
        `ارسال اعلان خرید صفحه اختصاصی به بله ناموفق بود: ${this.describeError(error)}`,
      );
    }
  }

  /**
   * ۶) اعلان پرداخت موفق شارژ آنلاین کیف پول
   */
  async notifyWalletCharged(payment: Payment): Promise<void> {
    if (!this.baleClient.isEnabled()) return;

    try {
      const user = await this.userRepo.findOne({
        where: { id: payment.userId },
        relations: { barberProfile: true },
      });

      const lines = [
        '✅ پرداخت موفق جدید',
        DIVIDER,
        '📌 بابت پرداخت: شارژ آنلاین کیف پول',
        `💳 مبلغ پرداختی: ${formatToman(payment.amount)}`,
        '',
        `👤 کاربر: ${user?.fullName || `کاربر #${payment.userId}`}`,
        ...(user?.barberProfile?.salonName
          ? [`💈 سالن: ${user.barberProfile.salonName}`]
          : []),
        `📱 موبایل: ${user?.phone || '—'}`,
        '',
        `🧾 شماره سفارش: ${payment.orderId}`,
        ...(payment.refNumber ? [`🔢 کد مرجع: ${payment.refNumber}`] : []),
        `🕒 زمان پرداخت: ${formatTehranDateTime(payment.paidAt ?? new Date())}`,
      ];

      await this.baleClient.broadcastToAdmins(lines.join('\n'));
    } catch (error: unknown) {
      this.logger.warn(
        `ارسال اعلان شارژ کیف پول به بله ناموفق بود: ${this.describeError(error)}`,
      );
    }
  }

  /**
   * ۷) اعلان ثبت‌نام آرایشگر جدید (جهت بررسی و تایید در پنل مدیریت)
   */
  async notifyBarberRegistered(userId: number): Promise<void> {
    if (!this.baleClient.isEnabled() || !userId) return;

    try {
      const user = await this.userRepo.findOne({
        where: { id: userId },
        relations: {
          barberProfile: {
            city: true,
            province: true,
          },
        },
      });

      const profile =
        user?.barberProfile ??
        (await this.barberProfileRepo.findOne({
          where: { userId },
          relations: { city: true, province: true },
        }));

      if (!user && !profile) return;

      const barberName = user?.fullName?.trim() || `کاربر #${userId}`;
      const salonName = profile?.salonName?.trim() || '—';
      const phone = user?.phone || '—';
      const activityType = profile?.activityType
        ? ACTIVITY_TYPE_LABELS[profile.activityType] || profile.activityType
        : '—';
      const locationParts = [
        profile?.province?.name ? `استان ${profile.province.name}` : null,
        profile?.city?.name ? `شهر ${profile.city.name}` : null,
      ].filter(Boolean);

      const lines = [
        '🆕 ثبت‌نام آرایشگر جدید (در انتظار تایید)',
        DIVIDER,
        `👤 آرایشگر: ${barberName}`,
        `💈 نام سالن: ${salonName}`,
        `✂️ نوع فعالیت: ${activityType}`,
        `📱 موبایل: ${phone}`,
        ...(locationParts.length
          ? [`📍 موقعیت: ${locationParts.join('، ')}`]
          : []),
        ...(profile?.address?.trim()
          ? [`🏠 آدرس: ${profile.address.trim()}`]
          : []),
        `🕒 زمان ثبت‌نام: ${formatTehranDateTime(profile?.createdAt ?? new Date())}`,
        '',
        '⚠️ جهت بررسی و تایید پروفایل به پنل مدیریت مراجعه کنید.',
      ];

      await this.baleClient.broadcastToAdmins(lines.join('\n'));
    } catch (error: unknown) {
      this.logger.warn(
        `ارسال اعلان ثبت‌نام آرایشگر به بله ناموفق بود: ${this.describeError(error)}`,
      );
    }
  }

  /**
   * ۸) اعلان ویرایش پروفایل آرایشگر (جهت بررسی و تایید تغییرات در پنل مدیریت)
   */
  async notifyBarberProfileEdited(params: {
    userId: number;
    changedFields?: string[];
    isApprovedBarber?: boolean;
  }): Promise<void> {
    if (!this.baleClient.isEnabled() || !params.userId) return;

    try {
      const user = await this.userRepo.findOne({
        where: { id: params.userId },
        relations: {
          barberProfile: {
            city: true,
            province: true,
          },
        },
      });

      const profile =
        user?.barberProfile ??
        (await this.barberProfileRepo.findOne({
          where: { userId: params.userId },
          relations: { city: true, province: true },
        }));

      if (!user && !profile) return;

      const currentName = user?.fullName?.trim() || `کاربر #${params.userId}`;
      const pendingName = profile?.pendingChanges?.fullName?.trim();
      const barberLabel =
        pendingName && pendingName !== currentName
          ? `${currentName} (پیشنهادی: ${pendingName})`
          : currentName;

      const currentSalon = profile?.salonName?.trim() || '—';
      const pendingSalon = profile?.pendingChanges?.salonName?.trim();
      const salonLabel =
        pendingSalon && pendingSalon !== currentSalon
          ? `${currentSalon} (پیشنهادی: ${pendingSalon})`
          : currentSalon;

      const phone = user?.phone || '—';
      const changedSummary = params.changedFields?.length
        ? params.changedFields.join('، ')
        : 'اطلاعات پروفایل';

      const lines = [
        '✏️ ویرایش پروفایل آرایشگر (در انتظار تایید)',
        DIVIDER,
        `👤 آرایشگر: ${barberLabel}`,
        `💈 سالن: ${salonLabel}`,
        `📱 موبایل: ${phone}`,
        `📝 بخش‌های ویرایش‌شده: ${changedSummary}`,
        `🕒 زمان ثبت ویرایش: ${formatTehranDateTime(new Date())}`,
        '',
        ...(params.isApprovedBarber
          ? [
              'ℹ️ نسخهٔ تاییدشدهٔ قبلی همچنان برای کاربران فعال است و پس از تایید شما جایگزین می‌شود.',
            ]
          : []),
        '⚠️ جهت بررسی و تایید تغییرات به پنل مدیریت مراجعه کنید.',
      ];

      await this.baleClient.broadcastToAdmins(lines.join('\n'));
    } catch (error: unknown) {
      this.logger.warn(
        `ارسال اعلان ویرایش پروفایل آرایشگر به بله ناموفق بود: ${this.describeError(error)}`,
      );
    }
  }

  private describeError(error: unknown): string {
    if (error instanceof Error) return error.message;
    return String(error);
  }

  private parseJson(raw?: string | null): Record<string, unknown> | null {
    if (!raw) return null;
    try {
      const parsed: unknown = JSON.parse(raw);
      return parsed && typeof parsed === 'object'
        ? (parsed as Record<string, unknown>)
        : null;
    } catch {
      return null;
    }
  }

  private toPositiveNumber(value: unknown): number | null {
    const num = Number(value);
    return Number.isFinite(num) && num > 0 ? num : null;
  }

  private toNonNegativeNumber(value: unknown): number | null {
    if (value === null || value === undefined || value === '') return null;
    const num = Number(value);
    return Number.isFinite(num) && num >= 0 ? num : null;
  }
}
