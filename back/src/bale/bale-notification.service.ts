import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { BarberProfile } from 'src/barber/entities/barber.entity';
import { Booking } from 'src/booking/entities/booking.entity';
import { Payment } from 'src/payment/entities/payment.entity';
import { Service } from 'src/services/entities/service.entity';
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
    } catch (error: any) {
      this.logger.warn(
        `ارسال اعلان درخواست برداشت به بله ناموفق بود: ${error?.message ?? String(error)}`,
      );
    }
  }

  /**
   * ۲) اعلان رزرو آنلاین پرداخت‌شده از طریق درگاه
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
        '📅 رزرو آنلاین جدید (پرداخت‌شده)',
        DIVIDER,
        `👤 مشتری: ${primary.customer?.fullName || 'مشتری'} (${primary.customer?.phone || '—'})`,
        `💈 سالن: ${primary.barber?.salonName || '—'}`,
        `✂️ آرایشگر: ${primary.barber?.user?.fullName || '—'} (${primary.barber?.user?.phone || '—'})`,
        `🧾 خدمات: ${serviceNames || '—'}`,
        `📆 تاریخ نوبت: ${formatJalaliDateVerbose(primary.date)}`,
        `⏰ ساعت شروع: ${toFaDigits(String(primary.time ?? '').slice(0, 5))}`,
        '',
        `💳 مبلغ پرداختی درگاه: ${formatToman(payment.amount)}`,
        `🏷 جمع مبلغ خدمات: ${formatToman(totalServicePrice)}`,
        ...(barberShare !== null
          ? [`💼 سهم کیف پول آرایشگر: ${formatToman(barberShare)}`]
          : []),
        ...(commission !== null
          ? [`🏛 کمیسیون سایت: ${formatToman(commission)}`]
          : []),
        '',
        `🧾 شماره سفارش: ${payment.orderId}`,
        ...(payment.refNumber ? [`🔢 کد مرجع: ${payment.refNumber}`] : []),
        `🕒 زمان پرداخت: ${formatTehranDateTime(payment.paidAt ?? new Date())}`,
      ];

      await this.baleClient.broadcastToAdmins(lines.join('\n'));
    } catch (error: any) {
      this.logger.warn(
        `ارسال اعلان رزرو آنلاین به بله ناموفق بود: ${error?.message ?? String(error)}`,
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
        '💳 پرداخت بیعانه نوبت (لینک پرداخت)',
        DIVIDER,
        `👤 مشتری: ${primary.customer?.fullName || 'مشتری'} (${primary.customer?.phone || '—'})`,
        `💈 سالن: ${primary.barber?.salonName || '—'}`,
        `✂️ آرایشگر: ${primary.barber?.user?.fullName || '—'} (${primary.barber?.user?.phone || '—'})`,
        `🧾 خدمات: ${serviceNames || '—'}`,
        `📆 تاریخ نوبت: ${formatJalaliDateVerbose(primary.date)}`,
        `⏰ ساعت شروع: ${toFaDigits(String(primary.time ?? '').slice(0, 5))}`,
        '',
        `💰 مبلغ پرداخت‌شده: ${formatToman(payment.amount)}`,
        ...(barberShare !== null
          ? [`💼 بیعانه واریزی به آرایشگر: ${formatToman(barberShare)}`]
          : []),
        ...(commission !== null
          ? [`🏛 کمیسیون سایت: ${formatToman(commission)}`]
          : []),
        '',
        `🧾 شماره سفارش: ${payment.orderId}`,
        ...(payment.refNumber ? [`🔢 کد مرجع: ${payment.refNumber}`] : []),
        `🕒 زمان پرداخت: ${formatTehranDateTime(payment.paidAt ?? new Date())}`,
      ];

      await this.baleClient.broadcastToAdmins(lines.join('\n'));
    } catch (error: any) {
      this.logger.warn(
        `ارسال اعلان پرداخت بیعانه به بله ناموفق بود: ${error?.message ?? String(error)}`,
      );
    }
  }

  /**
   * ۴) اعلان ثبت نوبت دستی توسط آرایشگر
   */
  async notifyManualBookingCreated(params: {
    bookings: Booking[];
    barber: BarberProfile;
    services: Service[];
    customerId: number;
    sendDepositLink: boolean;
  }): Promise<void> {
    if (!this.baleClient.isEnabled() || !params.bookings.length) return;

    try {
      const primary = params.bookings[0];
      const [customer, barberUser] = await Promise.all([
        this.userRepo.findOne({ where: { id: params.customerId } }),
        this.userRepo.findOne({ where: { id: params.barber.userId } }),
      ]);

      const serviceNames = params.services
        .map(s => s.name)
        .filter(Boolean)
        .join('، ');
      const totalPrice = params.services.reduce(
        (sum, s) => sum + Number(s.price || 0),
        0,
      );

      const lines = [
        '✂️ ثبت نوبت دستی توسط آرایشگر',
        DIVIDER,
        `💈 سالن: ${params.barber.salonName || '—'}`,
        `👤 آرایشگر: ${barberUser?.fullName || '—'} (${barberUser?.phone || '—'})`,
        `🧑 مشتری: ${customer?.fullName || 'مشتری'} (${customer?.phone || '—'})`,
        `🧾 خدمات: ${serviceNames || '—'}`,
        `📆 تاریخ نوبت: ${formatJalaliDateVerbose(primary.date)}`,
        `⏰ ساعت شروع: ${toFaDigits(String(primary.time ?? '').slice(0, 5))}`,
        `🏷 مبلغ خدمات: ${formatToman(totalPrice)}`,
        `📌 وضعیت بیعانه: ${
          params.sendDepositLink
            ? 'لینک بیعانه ارسال شد (در انتظار پرداخت مشتری)'
            : 'ثبت قطعی بدون لینک بیعانه'
        }`,
        `🕒 زمان ثبت: ${formatTehranDateTime(primary.createdAt ?? new Date())}`,
      ];

      await this.baleClient.broadcastToAdmins(lines.join('\n'));
    } catch (error: any) {
      this.logger.warn(
        `ارسال اعلان نوبت دستی به بله ناموفق بود: ${error?.message ?? String(error)}`,
      );
    }
  }

  /**
   * ۵) اعلان ثبت درخواست رزرو بدون پرداخت آنلاین توسط مشتری
   */
  async notifyBookingRequestCreated(bookingId: string): Promise<void> {
    if (!this.baleClient.isEnabled() || !bookingId) return;

    try {
      const booking = await this.bookingRepo.findOne({
        where: { id: bookingId },
        relations: {
          customer: true,
          service: true,
          barber: { user: true },
        },
      });

      if (!booking) return;

      const lines = [
        '📝 درخواست رزرو جدید (در انتظار تایید آرایشگر)',
        DIVIDER,
        `👤 مشتری: ${booking.customer?.fullName || 'مشتری'} (${booking.customer?.phone || '—'})`,
        `💈 سالن: ${booking.barber?.salonName || '—'}`,
        `✂️ آرایشگر: ${booking.barber?.user?.fullName || '—'} (${booking.barber?.user?.phone || '—'})`,
        `🧾 خدمت: ${booking.service?.name || '—'}`,
        `📆 تاریخ نوبت: ${formatJalaliDateVerbose(booking.date)}`,
        `⏰ ساعت: ${toFaDigits(String(booking.time ?? '').slice(0, 5))}`,
        `🏷 مبلغ خدمت: ${formatToman(booking.price)}`,
        `🕒 زمان ثبت: ${formatTehranDateTime(booking.createdAt)}`,
      ];

      await this.baleClient.broadcastToAdmins(lines.join('\n'));
    } catch (error: any) {
      this.logger.warn(
        `ارسال اعلان درخواست رزرو به بله ناموفق بود: ${error?.message ?? String(error)}`,
      );
    }
  }

  /**
   * ۶) اعلان خرید اشتراک توسط آرایشگر
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

      const lines = [
        '💎 خرید اشتراک جدید',
        DIVIDER,
        `👤 خریدار: ${user?.fullName || `کاربر #${payment.userId}`}`,
        `💈 سالن: ${user?.barberProfile?.salonName || '—'}`,
        `📱 موبایل: ${user?.phone || '—'}`,
        '',
        `📦 پلن اشتراک: ${plan?.name || payment.description || '—'}`,
        ...(plan
          ? [
              `⏳ مدت اعتبار: ${formatCount(plan.durationDays)} روز`,
              `✉️ اعتبار پیامک: ${formatCount(plan.smsCount)} پیامک`,
            ]
          : []),
        `💳 مبلغ پرداختی: ${formatToman(payment.amount)}`,
        '',
        `🧾 شماره سفارش: ${payment.orderId}`,
        ...(payment.refNumber ? [`🔢 کد مرجع: ${payment.refNumber}`] : []),
        `🕒 زمان خرید: ${formatTehranDateTime(payment.paidAt ?? new Date())}`,
      ];

      await this.baleClient.broadcastToAdmins(lines.join('\n'));
    } catch (error: any) {
      this.logger.warn(
        `ارسال اعلان خرید اشتراک به بله ناموفق بود: ${error?.message ?? String(error)}`,
      );
    }
  }

  /**
   * ۷) اعلان خرید پکیج صفحهٔ اختصاصی آرایشگاه (سئو)
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
        '🌐 خرید پکیج صفحه اختصاصی آرایشگاه',
        DIVIDER,
        `👤 آرایشگر: ${user?.fullName || `کاربر #${payment.userId}`}`,
        `💈 سالن: ${profile?.salonName || '—'}`,
        `📱 موبایل: ${user?.phone || '—'}`,
        `💳 مبلغ پرداختی: ${formatToman(payment.amount)}`,
        '',
        `🧾 شماره سفارش: ${payment.orderId}`,
        ...(payment.refNumber ? [`🔢 کد مرجع: ${payment.refNumber}`] : []),
        `🕒 زمان خرید: ${formatTehranDateTime(payment.paidAt ?? new Date())}`,
      ];

      await this.baleClient.broadcastToAdmins(lines.join('\n'));
    } catch (error: any) {
      this.logger.warn(
        `ارسال اعلان خرید صفحه اختصاصی به بله ناموفق بود: ${error?.message ?? String(error)}`,
      );
    }
  }

  /**
   * ۸) اعلان شارژ آنلاین کیف پول
   */
  async notifyWalletCharged(payment: Payment): Promise<void> {
    if (!this.baleClient.isEnabled()) return;

    try {
      const user = await this.userRepo.findOne({
        where: { id: payment.userId },
        relations: { barberProfile: true },
      });

      const lines = [
        '💰 شارژ آنلاین کیف پول',
        DIVIDER,
        `👤 کاربر: ${user?.fullName || `کاربر #${payment.userId}`}`,
        ...(user?.barberProfile?.salonName
          ? [`💈 سالن: ${user.barberProfile.salonName}`]
          : []),
        `📱 موبایل: ${user?.phone || '—'}`,
        `💳 مبلغ شارژ: ${formatToman(payment.amount)}`,
        '',
        `🧾 شماره سفارش: ${payment.orderId}`,
        ...(payment.refNumber ? [`🔢 کد مرجع: ${payment.refNumber}`] : []),
        `🕒 زمان پرداخت: ${formatTehranDateTime(payment.paidAt ?? new Date())}`,
      ];

      await this.baleClient.broadcastToAdmins(lines.join('\n'));
    } catch (error: any) {
      this.logger.warn(
        `ارسال اعلان شارژ کیف پول به بله ناموفق بود: ${error?.message ?? String(error)}`,
      );
    }
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
