import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes } from 'crypto';
import { BarberProfile } from 'src/barber/entities/barber.entity';
import { BarberWorkHours } from 'src/barber/entities/barber-work-hours.entity';
import { ClubService } from 'src/club/club.service';
import { CreateManualBookingDto } from 'src/club/dto/create-manual-booking.dto';
import { DEPOSIT_TOKEN_BYTES } from 'src/common/constants/constants';
import { getPagination } from 'src/common/query';
import { BookingSmsService } from 'src/notification/booking-sms.service';
import {
  Payment,
  PaymentPurpose,
  PaymentStatus,
} from 'src/payment/entities/payment.entity';
import { ReferralService } from 'src/referral/referral.service';
import { Service } from 'src/services/entities/service.entity';
import {
  UserSubscription,
  UserSubscriptionStatus,
} from 'src/subscription/entities/user-subscription.entity';
import { UserSubscriptionService } from 'src/subscription/user-subscription.service';
import { User } from 'src/users/entities/user.entity';
import { WalletService } from 'src/wallet/wallet.service';
import {
  DataSource,
  EntityManager,
  In,
  IsNull,
  LessThanOrEqual,
  MoreThan,
  Repository,
} from 'typeorm';

import {
  CancellationAmounts,
  computeCancellationAmounts,
} from './booking-refund';
import {
  bookingWallTimeToUtc,
  getBookingClock,
  isBookingDateInPast,
  isBookingSlotInPast,
} from './booking-time';
import { BookingQueryDto } from './dto/booking-query.dto';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto';
import {
  Booking,
  BookingStatus,
  SLOT_HOLDING_STATUSES,
} from './entities/booking.entity';
import { SlotHold } from './entities/slot-hold.entity';
import { BusyInterval, hasOverlap } from './slot-intervals';

const CONFIRMATION_SMS_COST = 2;
const REMINDER_SMS_COST = 2;

@Injectable()
export class BookingsService {
  private readonly logger = new Logger(BookingsService.name);

  constructor(
    @InjectRepository(Booking)
    private bookingRepo: Repository<Booking>,

    @InjectRepository(BarberProfile)
    private barberProfileRepo: Repository<BarberProfile>,

    @InjectRepository(Service)
    private serviceRepo: Repository<Service>,

    @InjectRepository(BarberWorkHours)
    private workHoursRepo: Repository<BarberWorkHours>,

    @InjectRepository(UserSubscription)
    private userSubscriptionRepo: Repository<UserSubscription>,

    @InjectRepository(User)
    private userRepo: Repository<User>,

    @InjectRepository(SlotHold)
    private slotHoldRepo: Repository<SlotHold>,

    private readonly dataSource: DataSource,
    private readonly walletService: WalletService,
    private referralService: ReferralService,
    private clubService: ClubService,
    private userSubscriptionService: UserSubscriptionService,
    private bookingSmsService: BookingSmsService,
  ) {}

  private assertBookingSlotIsNotPast(date: string, time: string): void {
    if (isBookingSlotInPast(date, time, getBookingClock())) {
      throw new BadRequestException(
        'امکان ثبت نوبت برای تاریخ یا ساعت گذشته وجود ندارد',
      );
    }
  }

  /**
   * بازه‌هایی که «رزرو آنلاینِ در جریان» موقتاً نگه داشته است.
   *
   * این مقدار باید در همهٔ بررسی‌های تداخل (تقویم، ثبت دستی، تایید) لحاظ
   * شود؛ وگرنه مشتری دوم می‌تواند همان ساعتی را انتخاب کند که مشتری اول
   * همین حالا در درگاه پرداخت است.
   */
  private async getActiveHoldIntervals(
    barberId: string,
    date: string,
    manager?: EntityManager,
  ): Promise<BusyInterval[]> {
    const repo = manager ? manager.getRepository(SlotHold) : this.slotHoldRepo;

    const holds = await repo.find({
      where: { barberId, date, expiresAt: MoreThan(new Date()) },
    });

    return holds.map(hold => ({
      start: hold.startMinutes,
      end: hold.endMinutes,
    }));
  }

  // =========================================================
  // CREATE BOOKING
  // =========================================================

  async create(customerId: number, dto: CreateBookingDto): Promise<Booking> {
    this.assertBookingSlotIsNotPast(dto.date, dto.time);

    // dto.barberId = User.id
    const barberId = Number(dto.barberId);

    if (!Number.isInteger(barberId)) {
      throw new BadRequestException('شناسه آرایشگر نامعتبر است');
    }

    // پیدا کردن پروفایل آرایشگر
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

    // پیدا کردن سرویس
    const service = await this.serviceRepo.findOne({
      where: {
        id: dto.serviceId,
        isActive: true,
      },
    });

    if (!service) {
      throw new NotFoundException('سرویس مورد نظر یافت نشد');
    }

    // خدمت باید متعلق به همین آرایشگر باشد (نه فقط «فعال»)
    if (Number(service.barberId) !== Number(barber.userId)) {
      throw new BadRequestException(
        'خدمت انتخاب‌شده متعلق به این آرایشگر نیست. لطفاً صفحه را بازخوانی کنید.',
      );
    }

    // بررسی اینکه زمان انتخابی داخل ساعت کاری آرایشگر باشد
    const jsDay = new Date(dto.date).getDay();

    // سیستم شما:
    // 0 = شنبه
    // 1 = یکشنبه
    // 2 = دوشنبه
    // 3 = سه‌شنبه
    // 4 = چهارشنبه
    // 5 = پنجشنبه
    // 6 = جمعه
    const dayOfWeek = (jsDay + 1) % 7;

    const workHours = await this.workHoursRepo.find({
      where: {
        barberId: barber.id,
        dayOfWeek,
      },
      order: {
        startTime: 'ASC',
      },
    });

    if (!workHours.length) {
      throw new BadRequestException('آرایشگر در این روز ساعت کاری ندارد');
    }

    // تبدیل HH:mm / HH:mm:ss به دقیقه
    const toMinutes = (time: string) => {
      const [hours, minutes] = time.split(':').map(Number);

      return hours * 60 + minutes;
    };

    const bookingStart = toMinutes(dto.time);
    const bookingEnd = bookingStart + service.durationMinutes;

    // بررسی اینکه کل زمان سرویس داخل یکی از بازه‌های کاری باشد
    const isWithinWorkHours = workHours.some(workHour => {
      const start = toMinutes(workHour.startTime);
      const end = toMinutes(workHour.endTime);

      return bookingStart >= start && bookingEnd <= end;
    });

    if (!isWithinWorkHours) {
      throw new BadRequestException(
        'زمان انتخاب شده خارج از ساعت کاری آرایشگر است',
      );
    }

    // بررسی تداخل با رزروهای قبلی
    const existingBookings = await this.bookingRepo.find({
      where: {
        barberId: barber.id,
        date: dto.date,
        status: In(SLOT_HOLDING_STATUSES),
      },
      relations: {
        service: true,
      },
      order: {
        time: 'ASC',
      },
    });

    const hasConflict = existingBookings.some(booking => {
      const existingStart = toMinutes(booking.time);

      const existingDuration =
        booking.service?.durationMinutes ?? service.durationMinutes;

      const existingEnd = existingStart + existingDuration;

      return bookingStart < existingEnd && bookingEnd > existingStart;
    });

    if (hasConflict) {
      throw new BadRequestException(
        'این زمان قبلاً توسط شخص دیگری رزرو شده است',
      );
    }

    // ایجاد رزرو
    // مهم:
    // booking.barberId = BarberProfile.id
    const booking = this.bookingRepo.create({
      customerId,

      barberId: barber.id,

      serviceId: dto.serviceId,

      date: dto.date,

      time: dto.time,

      price: service.price,

      note: dto.note ?? '',

      status: BookingStatus.PENDING,
    });

    const saved = await this.bookingRepo.save(booking);

    // ✅ پیامک تأیید به مشتری + اطلاع رزرو جدید به آرایشگر (رایگان)
    this.sendBookingRequestSms(saved, barber, service);

    return saved;
  }

  private sendBookingRequestSms(
    booking: Booking,
    barber: BarberProfile,
    service: Service,
  ): void {
    void this.userRepo
      .findOne({ where: { id: booking.customerId } })
      .then(customer => {
        if (!customer) return;

        void this.bookingSmsService.sendNewBookingToBarber(
          barber.user?.phone ?? '',
          {
            customerName: customer.fullName ?? 'مشتری',
            serviceName: service.name,
            date: booking.date,
            time: booking.time,
          },
        );
      })
      .catch(() => undefined);
  }

  private sendBookingConfirmedSms(
    booking: Booking,
    barber: BarberProfile,
    service: Service,
  ): void {
    void this.userRepo
      .findOne({ where: { id: booking.customerId } })
      .then(customer => {
        if (!customer) return;

        const smsParams = {
          customerName: customer.fullName ?? 'مشتری',
          serviceName: service.name,
          date: booking.date,
          time: booking.time,
          salonName: barber.salonName ?? 'سالن شما',
        };

        void this.bookingSmsService.sendBookingSuccessToCustomer(
          customer.phone,
          smsParams,
        );
      })
      .catch(() => undefined);
  }

  // =========================================================
  // GET CUSTOMER BOOKINGS
  // =========================================================

  async findByCustomer(customerId: number, query: BookingQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const status = query.status;

    const qb = this.bookingRepo
      .createQueryBuilder('booking')
      .leftJoinAndSelect('booking.barber', 'barber')
      .leftJoinAndSelect('booking.service', 'service')
      .where('booking.customerId = :customerId', { customerId });

    if (status) {
      qb.andWhere('booking.status = :status', { status });
    }

    const { skip, take } = getPagination(page, limit);

    qb.skip(skip).take(take).orderBy('booking.createdAt', 'DESC');

    const [data, total] = await qb.getManyAndCount();

    return {
      data: data.map(booking => this.sanitizeForCustomer(booking)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  private sanitizeForCustomer(booking: Booking): Booking {
    booking.barberNote = null;

    return booking;
  }

  // =========================================================
  // GET BARBER BOOKINGS
  // =========================================================

  async findByBarber(userId: number, query: BookingQueryDto) {
    // userId -> BarberProfile
    const barber = await this.barberProfileRepo.findOne({
      where: {
        userId,
      },
    });

    if (!barber) {
      throw new NotFoundException('پروفایل آرایشگر یافت نشد');
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const status = query.status;
    const date = query.date;
    const startDate = query.startDate;
    const endDate = query.endDate;
    const search = query.search?.trim();

    const qb = this.bookingRepo
      .createQueryBuilder('booking')
      .leftJoinAndSelect('booking.customer', 'customer')
      .leftJoinAndSelect('booking.service', 'service')
      .where('booking.barberId = :barberId', {
        barberId: barber.id,
      });

    // فیلتر وضعیت
    if (status) {
      qb.andWhere('booking.status = :status', {
        status,
      });
    }

    // فیلتر تاریخ
    if (date) {
      qb.andWhere('booking.date = :date', {
        date,
      });
    }

    if (startDate && endDate) {
      qb.andWhere('booking.date BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    } else if (startDate) {
      qb.andWhere('booking.date >= :startDate', { startDate });
    } else if (endDate) {
      qb.andWhere('booking.date <= :endDate', { endDate });
    }

    if (search) {
      qb.andWhere(
        '(customer.fullName LIKE :search OR customer.phone LIKE :search)',
        { search: `%${search}%` },
      );
    }

    const { skip, take } = getPagination(page, limit);

    qb.skip(skip).take(take);

    if (date || startDate || endDate) {
      qb.orderBy('booking.date', 'ASC').addOrderBy('booking.time', 'ASC');
    } else {
      qb.orderBy('booking.date', 'DESC').addOrderBy('booking.time', 'DESC');
    }

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // =========================================================
  // GET SINGLE BOOKING
  // =========================================================

  async findOne(id: string, userId: number, roles: string[]): Promise<Booking> {
    const booking = await this.bookingRepo.findOne({
      where: {
        id,
      },
      relations: {
        customer: true,
        barber: true,
        service: true,
      },
    });

    if (!booking) {
      throw new NotFoundException('رزرو یافت نشد');
    }

    const isCustomer = booking.customerId === userId;

    // booking.barber = BarberProfile
    // پس باید userId داخل profile را مقایسه کنیم
    const isBarber = booking.barber?.userId === userId;

    const isAdmin = roles?.includes('admin');

    if (!isCustomer && !isBarber && !isAdmin) {
      throw new ForbiddenException('شما دسترسی به این رزرو را ندارید');
    }

    if (!isBarber && !isAdmin) {
      this.sanitizeForCustomer(booking);
    }

    return booking;
  }

  // =========================================================
  // UPDATE BOOKING STATUS
  // =========================================================

  private async cancelByBarberOrAdmin(
    id: string,
    userId: number,
    roles: string[],
  ): Promise<Booking> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    const canceledBookingIds: string[] = [];

    try {
      const bookingRepo = queryRunner.manager.getRepository(Booking);
      const initialBooking = await bookingRepo.findOne({
        where: { id },
        relations: { barber: true },
      });
      if (!initialBooking) {
        throw new NotFoundException('رزرو یافت نشد');
      }

      const isBarber = initialBooking.barber?.userId === userId;
      const isAdmin = roles?.includes('admin');
      if (!isBarber && !isAdmin) {
        throw new ForbiddenException(
          'فقط آرایشگر یا ادمین می‌توانند وضعیت را تغییر دهند',
        );
      }

      const paymentCandidates = await queryRunner.manager
        .getRepository(Payment)
        .createQueryBuilder('payment')
        .where('payment.purpose = :purpose', {
          purpose: PaymentPurpose.BOOKING,
        })
        .andWhere('payment.status = :status', {
          status: PaymentStatus.PAID,
        })
        .andWhere(
          '(payment.purposeId = :bookingId OR payment.metadata LIKE :bookingPattern OR (payment.userId = :customerId AND payment.metadata LIKE :datePattern))',
          {
            bookingId: id,
            bookingPattern: `%${id}%`,
            customerId: initialBooking.customerId,
            datePattern: `%${initialBooking.date}%`,
          },
        )
        .orderBy('payment.id', 'ASC')
        .setLock('pessimistic_write')
        .getMany();
      const paidPayments = paymentCandidates.filter(payment =>
        this.paymentReferencesBooking(payment, initialBooking),
      );
      const bookingIds = new Set<string>([id]);
      for (const payment of paidPayments) {
        for (const bookingId of await this.resolvePaymentBookingIds(
          queryRunner.manager,
          payment,
          initialBooking,
        )) {
          bookingIds.add(bookingId);
        }
      }

      const lockedBookings = await bookingRepo
        .createQueryBuilder('booking')
        .where('booking.id IN (:...bookingIds)', {
          bookingIds: [...bookingIds].sort(),
        })
        .orderBy('booking.id', 'ASC')
        .setLock('pessimistic_write')
        .getMany();
      const booking = lockedBookings.find(item => item.id === id);
      if (!booking) {
        throw new NotFoundException('رزرو یافت نشد');
      }
      if (
        booking.status !== BookingStatus.PENDING &&
        booking.status !== BookingStatus.CONFIRMED
      ) {
        throw new BadRequestException(
          booking.status === BookingStatus.CANCELED
            ? 'رزرو لغو شده قابل تغییر نیست'
            : 'فقط رزروهای در انتظار یا تاییدشده قابل لغو هستند',
        );
      }
      if (
        lockedBookings.some(item => item.status === BookingStatus.COMPLETED)
      ) {
        throw new BadRequestException(
          'چون یکی از نوبت‌های این پرداخت انجام شده است، لغو و بازپرداخت گروهی ممکن نیست.',
        );
      }
      if (
        lockedBookings.some(
          item =>
            item.status !== BookingStatus.PENDING &&
            item.status !== BookingStatus.CONFIRMED &&
            item.status !== BookingStatus.CANCELED,
        )
      ) {
        throw new BadRequestException(
          'وضعیت یکی از نوبت‌های این پرداخت اجازهٔ بازپرداخت گروهی نمی‌دهد.',
        );
      }

      if (paidPayments.length) {
        const barberUserId = initialBooking.barber?.userId;
        if (!barberUserId) {
          throw new BadRequestException(
            'حساب آرایشگر برای ثبت بازپرداخت پیدا نشد.',
          );
        }

        for (const payment of paidPayments) {
          const { barberDebit, customerRefund } = this.getCancellationAmounts(
            payment,
            lockedBookings,
          );
          if (barberDebit > 0) {
            await this.walletService.debitBarberAndQueueRefund(
              queryRunner.manager,
              {
                barberUserId,
                customerUserId: booking.customerId,
                bookingId: id,
                paymentId: payment.id,
                amount: barberDebit,
                customerRefundAmount: customerRefund,
              },
            );
          }
        }
      }

      const canceledAt = new Date();
      const canceledBy = isBarber ? 'barber' : 'admin';
      const changedBookings = lockedBookings.filter(
        item => item.status !== BookingStatus.CANCELED,
      );
      for (const item of changedBookings) {
        item.status = BookingStatus.CANCELED;
        item.canceledBy = canceledBy;
        item.canceledAt = canceledAt;
        canceledBookingIds.push(item.id);
      }
      await bookingRepo.save(changedBookings);
      await queryRunner.commitTransaction();

      for (const bookingId of canceledBookingIds) {
        this.sendBookingCanceledSms(bookingId);
      }

      return (
        (await this.bookingRepo.findOne({
          where: { id },
          relations: { customer: true, barber: true, service: true },
        })) ?? booking
      );
    } catch (error) {
      if (queryRunner.isTransactionActive) {
        await queryRunner.rollbackTransaction();
      }
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private paymentReferencesBooking(payment: Payment, booking: Booking) {
    if (payment.purposeId === booking.id) return true;
    if (this.getPaymentBookingIds(payment).includes(booking.id)) return true;

    const metadata = this.parsePaymentMetadata(payment);
    if (!metadata) return false;
    if (metadata.bookingId === booking.id) return true;
    if (
      Number(metadata.customerId ?? payment.userId) !== booking.customerId ||
      this.metadataString(metadata.barberProfileId) !== booking.barberId ||
      this.normalizeBookingDate(metadata.date) !==
        this.normalizeBookingDate(booking.date)
    ) {
      return false;
    }

    if (Array.isArray(metadata.items)) {
      return metadata.items.some(item =>
        this.paymentItemMatchesBooking(item, booking),
      );
    }

    return this.paymentItemMatchesBooking(metadata, booking);
  }

  private async resolvePaymentBookingIds(
    manager: EntityManager,
    payment: Payment,
    referenceBooking: Booking,
  ): Promise<string[]> {
    const bookingIds = new Set(this.getPaymentBookingIds(payment));
    if (bookingIds.size) return [...bookingIds];

    const metadata = this.parsePaymentMetadata(payment);
    if (!metadata) return [];
    const descriptors = Array.isArray(metadata.items)
      ? metadata.items
      : metadata.serviceId
        ? [metadata]
        : [];
    if (!descriptors.length) return [];

    const customerId = Number(metadata.customerId ?? payment.userId);
    const barberId = this.metadataString(metadata.barberProfileId);
    const date = this.normalizeBookingDate(metadata.date);
    if (
      customerId !== referenceBooking.customerId ||
      barberId !== referenceBooking.barberId ||
      date !== this.normalizeBookingDate(referenceBooking.date)
    ) {
      return [];
    }

    const relatedBookings = await manager
      .getRepository(Booking)
      .createQueryBuilder('booking')
      .where('booking.customerId = :customerId', { customerId })
      .andWhere('booking.barberId = :barberId', { barberId })
      .andWhere('booking.date = :date', { date })
      .getMany();

    for (const relatedBooking of relatedBookings) {
      if (
        descriptors.some(descriptor =>
          this.paymentItemMatchesBooking(descriptor, relatedBooking),
        )
      ) {
        bookingIds.add(relatedBooking.id);
      }
    }
    return [...bookingIds];
  }

  private paymentItemMatchesBooking(item: unknown, booking: Booking) {
    if (!item || typeof item !== 'object') return false;
    const descriptor = item as Record<string, unknown>;
    if (this.metadataString(descriptor.serviceId) !== booking.serviceId) {
      return false;
    }
    if (
      this.normalizeBookingTime(descriptor.time) !==
      this.normalizeBookingTime(booking.time)
    ) {
      return false;
    }

    if (descriptor.price !== undefined && descriptor.price !== null) {
      const price = Number(descriptor.price);
      if (Number.isFinite(price) && price !== Number(booking.price)) {
        return false;
      }
    }
    return true;
  }

  private parsePaymentMetadata(
    payment: Payment,
  ):
    | (Record<string, unknown> & { bookingId?: unknown; items?: unknown })
    | null {
    if (!payment.metadata) return null;
    try {
      const metadata: unknown = JSON.parse(payment.metadata);
      return metadata && typeof metadata === 'object'
        ? (metadata as Record<string, unknown> & {
            bookingId?: unknown;
            items?: unknown;
          })
        : null;
    } catch {
      return null;
    }
  }

  private getPaymentBookingIds(payment: Payment): string[] {
    const metadata = this.parsePaymentMetadata(payment);
    if (!metadata) return [];
    const ids = Array.isArray(metadata.bookingIds)
      ? metadata.bookingIds.filter(
          (bookingId): bookingId is string => typeof bookingId === 'string',
        )
      : [];
    if (typeof metadata.bookingId === 'string') ids.push(metadata.bookingId);
    return [...new Set(ids)];
  }

  /**
   * محاسبهٔ مبلغ لغو (جزئیات و تست‌ها در `booking-refund.ts`).
   */
  private getCancellationAmounts(
    payment: Payment,
    linkedBookings: Booking[],
  ): CancellationAmounts {
    return computeCancellationAmounts(payment, linkedBookings);
  }

  private metadataString(value: unknown) {
    return typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
      ? String(value)
      : '';
  }

  private normalizeBookingTime(value: unknown) {
    return this.metadataString(value).slice(0, 5);
  }

  private normalizeBookingDate(value: unknown) {
    return this.metadataString(value).slice(0, 10);
  }

  /**
   * آیا زمان شروع نوبت رسیده است؟ (۱۵ دقیقه ارفاق برای ثبت زودترِ پایان نوبت)
   * تاریخ و ساعت نوبت به وقت سالن (تهران) ذخیره می‌شوند.
   */
  private hasBookingStarted(date: string, time: string): boolean {
    const clock = getBookingClock();
    if (date < clock.date) return true;
    if (date > clock.date) return false;

    const [hours, minutes] = time.split(':').map(Number);
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return true;

    return hours * 60 + minutes <= clock.minutesSinceMidnight + 15;
  }

  /**
   * بررسی تداخل یک نوبت با نوبت‌های قطعی/انجام‌شدهٔ همان روز و همان آرایشگر.
   * برای «تایید» یک درخواست در انتظار استفاده می‌شود.
   */
  private async assertNoSlotConflict(booking: Booking): Promise<void> {
    const sameDay = await this.bookingRepo.find({
      where: {
        barberId: booking.barberId,
        date: booking.date,
        status: In(SLOT_HOLDING_STATUSES),
      },
      relations: { service: true },
    });

    const toMinutes = (value: string) => {
      const [hours, minutes] = value.split(':').map(Number);

      return hours * 60 + minutes;
    };

    const start = toMinutes(booking.time);
    const duration =
      (await this.serviceRepo.findOne({ where: { id: booking.serviceId } }))
        ?.durationMinutes ?? 30;
    const end = start + duration;

    const activeHolds = await this.getActiveHoldIntervals(
      booking.barberId,
      booking.date,
    );

    const hasConflict =
      sameDay.some(existing => {
        if (existing.id === booking.id) return false;

        const existingStart = toMinutes(existing.time);
        const existingEnd =
          existingStart + (existing.service?.durationMinutes ?? 30);

        return start < existingEnd && end > existingStart;
      }) || hasOverlap({ start, end }, activeHolds);

    if (hasConflict) {
      throw new BadRequestException(
        'این ساعت با نوبت دیگری تداخل دارد و قابل تایید نیست',
      );
    }
  }

  async updateStatus(
    id: string,
    userId: number,
    roles: string[],
    dto: UpdateBookingStatusDto,
  ): Promise<Booking> {
    if (dto.status === BookingStatus.CANCELED) {
      return this.cancelByBarberOrAdmin(id, userId, roles);
    }

    const booking = await this.findOne(id, userId, roles);

    const isBarber = booking.barber?.userId === userId;
    const isAdmin = roles?.includes('admin');

    if (!isBarber && !isAdmin) {
      throw new ForbiddenException(
        'فقط آرایشگر یا ادمین می‌توانند وضعیت را تغییر دهند',
      );
    }

    const currentStatus = booking.status;
    const newStatus = dto.status;

    // اگر وضعیت تغییری نکرده
    if (currentStatus === newStatus) {
      return booking;
    }

    // ==========================================
    // PENDING
    // ==========================================

    if (currentStatus === BookingStatus.PENDING) {
      const allowedStatuses = [
        BookingStatus.CONFIRMED,
        BookingStatus.REJECTED,
        BookingStatus.CANCELED,
      ];

      if (!allowedStatuses.includes(newStatus)) {
        throw new BadRequestException(
          'از وضعیت در انتظار فقط امکان تایید، رد یا لغو رزرو وجود دارد',
        );
      }
    }

    // ==========================================
    // CONFIRMED
    // ==========================================
    else if (currentStatus === BookingStatus.CONFIRMED) {
      const allowedStatuses = [BookingStatus.COMPLETED, BookingStatus.CANCELED];

      if (!allowedStatuses.includes(newStatus)) {
        throw new BadRequestException(
          'از وضعیت تایید شده فقط امکان تکمیل یا لغو رزرو وجود دارد',
        );
      }
    }

    // ==========================================
    // COMPLETED
    // ==========================================
    else if (currentStatus === BookingStatus.COMPLETED) {
      throw new BadRequestException('رزرو انجام شده قابل تغییر نیست');
    }

    // ==========================================
    // REJECTED
    // ==========================================
    else if (currentStatus === BookingStatus.REJECTED) {
      throw new BadRequestException('رزرو رد شده قابل تغییر نیست');
    }

    // ==========================================
    // CANCELED
    // ==========================================
    else if (currentStatus === BookingStatus.CANCELED) {
      throw new BadRequestException('رزرو لغو شده قابل تغییر نیست');
    }

    // «انجام شد» فقط بعد از شروع نوبت منطقی است؛ جلوگیری از تکمیل زودهنگام
    // که حق ثبت نظر و شمارندهٔ رفرال را بی‌دلیل جلو می‌برد.
    if (
      newStatus === BookingStatus.COMPLETED &&
      !this.hasBookingStarted(booking.date, booking.time)
    ) {
      throw new BadRequestException(
        'نوبتی که هنوز شروع نشده را نمی‌توان «انجام شد» کرد',
      );
    }

    // تایید یک نوبت در انتظار هم باید تداخل را دوباره بررسی کند.
    if (
      newStatus === BookingStatus.CONFIRMED &&
      currentStatus === BookingStatus.PENDING
    ) {
      await this.assertNoSlotConflict(booking);
    }

    const previousStatus = booking.status;
    booking.status = newStatus;

    if (
      newStatus === BookingStatus.CONFIRMED &&
      previousStatus === BookingStatus.PENDING
    ) {
      // ارسال پیامک تأیید
      const barber = await this.barberProfileRepo.findOne({
        where: { id: booking.barberId },
      });
      const service = await this.serviceRepo.findOne({
        where: { id: booking.serviceId },
      });
      if (barber && service) {
        this.sendBookingConfirmedSms(booking, barber, service);
      }

      await this.clubService.addFromSuccessfulBooking({
        barberId: booking.barberId,
        customerId: booking.customerId,
      });
    }

    // اگر رزرو رد شد، پیامک رد به مشتری ارسال بشه
    if (
      newStatus === BookingStatus.REJECTED &&
      previousStatus === BookingStatus.PENDING
    ) {
      this.sendBookingRejectedSms(booking.id);
    }

    if (newStatus === BookingStatus.COMPLETED) {
      const savedBooking = await this.bookingRepo.save(booking);
      await this.referralService.onBookingCompleted(booking.barberId);
      await this.clubService.addFromSuccessfulBooking({
        barberId: booking.barberId,
        customerId: booking.customerId,
      });
      return savedBooking;
    }

    return this.bookingRepo.save(booking);
  }

  // =========================================================
  // MANUAL BOOKING BY BARBER FOR CLUB CUSTOMER
  // =========================================================

  async createManualByBarber(
    barberUserId: number,
    dto: CreateManualBookingDto,
  ) {
    this.assertBookingSlotIsNotPast(dto.date, dto.time);

    const barber = await this.barberProfileRepo.findOne({
      where: { userId: barberUserId },
    });

    if (!barber) {
      throw new NotFoundException('پروفایل آرایشگر یافت نشد');
    }

    if (!barber.isApproved) {
      throw new ForbiddenException(
        'پروفایل شما هنوز تایید نشده و امکان ثبت رزرو دستی ندارید',
      );
    }

    const member = await this.clubService.findMemberForBarber(
      barber.id,
      dto.clubCustomerId,
    );

    const smsEligible = await this.hasSmsCredit(barberUserId);

    if (dto.sendSmsReminder && !smsEligible) {
      throw new BadRequestException(
        'برای ارسال پیامک یادآوری، اشتراک فعال و اعتبار پیامک کافی لازم است',
      );
    }

    const sendDeposit = dto.sendDepositLink ?? false;

    const sendReminder = smsEligible && (dto.sendSmsReminder ?? false);

    const service = await this.serviceRepo.findOne({
      where: { id: dto.serviceId },
    });

    if (!service) {
      throw new NotFoundException('سرویس مورد نظر یافت نشد');
    }

    if (Number(service.barberId) !== Number(barberUserId)) {
      throw new BadRequestException(
        'خدمت انتخاب‌شده متعلق به شما نیست. لطفاً لیست خدمات را بازخوانی کنید.',
      );
    }

    if (!service.isActive) {
      throw new BadRequestException('این خدمت غیرفعال شده است');
    }

    const toMinutes = (time: string) => {
      const [hours, minutes] = time.split(':').map(Number);

      return hours * 60 + minutes;
    };

    const bookingStart = toMinutes(dto.time);
    const bookingEnd = bookingStart + service.durationMinutes;

    // ساعت کاری همان روز
    const jsDay = new Date(dto.date).getDay();
    const dayOfWeek = (jsDay + 1) % 7;
    const workHours = await this.workHoursRepo.find({
      where: { barberId: barber.id, dayOfWeek },
    });

    const fitsInWorkHours = workHours.some(workHour => {
      const start = toMinutes(workHour.startTime);
      const end = toMinutes(workHour.endTime);

      return bookingStart >= start && bookingEnd <= end;
    });

    if (!fitsInWorkHours) {
      throw new BadRequestException('زمان انتخاب‌شده خارج از ساعت کاری شماست');
    }

    /**
     * بررسی تداخل با نوبت‌های تاییدشده همان روز.
     * ثبت دستی پیش از این هیچ بررسی تداخلی نداشت و آرایشگر می‌توانست
     * روی یک نوبت تاییدشده، نوبت دوم بگذارد.
     */
    const sameDayBookings = await this.bookingRepo.find({
      where: {
        barberId: barber.id,
        date: dto.date,
        status: In(SLOT_HOLDING_STATUSES),
      },
      relations: { service: true },
    });

    const activeHolds = await this.getActiveHoldIntervals(barber.id, dto.date);

    const hasConflict =
      sameDayBookings.some(existing => {
        const existingStart = toMinutes(existing.time);
        const existingEnd =
          existingStart +
          (existing.service?.durationMinutes ?? service.durationMinutes);

        return bookingStart < existingEnd && bookingEnd > existingStart;
      }) || hasOverlap({ start: bookingStart, end: bookingEnd }, activeHolds);

    if (hasConflict) {
      throw new BadRequestException(
        'این زمان با نوبت دیگری تداخل دارد. لطفاً ساعت دیگری انتخاب کنید',
      );
    }

    const smsCost =
      (sendDeposit ? 0 : CONFIRMATION_SMS_COST) +
      (sendReminder ? REMINDER_SMS_COST : 0);

    if (smsCost > 0) {
      const smsReasons = [
        !sendDeposit ? 'تأیید' : null,
        sendReminder ? 'یادآوری' : null,
      ].filter(Boolean);

      await this.userSubscriptionService.deductSms(
        barberUserId,
        smsCost,
        `پیامک ${smsReasons.join(' و ')} نوبت دستی`,
      );
    }

    // ایجاد رزرو مستقیماً با استاتوس CONFIRMED
    const booking = this.bookingRepo.create({
      customerId: member.customerId,
      barberId: barber.id,
      serviceId: dto.serviceId,
      date: dto.date,
      time: dto.time,
      price: service.price,
      note: dto.customerNote ?? '',
      status: BookingStatus.CONFIRMED,
      barberNote: dto.barberNote?.trim() || null,
      customerNote: dto.customerNote?.trim() || null,
      sendDepositLink: sendDeposit,
      // مهلت پرداخت بیعانه از همین لحظه شروع می‌شود
      depositRequestedAt: sendDeposit ? new Date() : null,
      sendSmsReminder: sendReminder,
      reminderHours: sendReminder ? (dto.reminderHours ?? null) : null,
    });

    const saved = await this.bookingRepo.save(booking);

    await this.sendManualBookingSms(saved, barber, service, member.customerId);

    await this.clubService.addFromSuccessfulBooking({
      barberId: barber.id,
      customerId: member.customerId,
    });

    return saved;
  }

  private async sendManualBookingSms(
    booking: Booking,
    barber: BarberProfile,
    service: Service | null,
    customerId: number,
  ): Promise<void> {
    try {
      const customer = await this.userRepo.findOne({
        where: { id: customerId },
      });

      if (!customer?.phone) return;

      const customerName = customer.fullName ?? 'مشتری';
      const salonName = barber.salonName ?? 'سالن شما';

      if (booking.sendDepositLink) {
        // فقط توکن را می‌فرستیم؛ دامنه و مسیر ثابت در قالب SMS.ir قرار می‌گیرد.
        const paymentToken = this.createDepositToken();
        booking.depositToken = paymentToken;

        await this.bookingRepo.save(booking);

        await this.bookingSmsService.sendDepositLinkToCustomer(customer.phone, {
          customerName,
          salonName,
          paymentToken,
        });

        return;
      }

      await this.bookingSmsService.sendBookingSuccessToCustomer(
        customer.phone,
        {
          customerName,
          serviceName: service?.name ?? 'خدمت',
          date: booking.date,
          time: booking.time,
          salonName,
        },
      );
    } catch {
      // خطای پیامک هرگز ثبت نوبت دستی را نمی‌شکند
    }
  }

  /**
   * ساخت توکن لینک بیعانه.
   *
   * SMS.ir مقدار هر پارامتر قالب را حداکثر ۲۵ کاراکتر می‌پذیرد (کد وضعیت
   * 114 و پاسخ HTTP 400). توکن باید داخل لینک #PAYMENT_LINK# جا شود، پس
   * ۱۲ بایت تصادفی = ۲۴ کاراکتر هگز (۹۶ بیت آنتروپی) تولید می‌کنیم؛
   * هم حدس‌ناپذیر است و هم زیر سقف پیامک می‌ماند.
   */
  private createDepositToken(): string {
    return randomBytes(DEPOSIT_TOKEN_BYTES).toString('hex');
  }

  private async hasSmsCredit(barberUserId: number): Promise<boolean> {
    const subscription = await this.userSubscriptionRepo.findOne({
      where: {
        userId: barberUserId,
        status: UserSubscriptionStatus.ACTIVE,
      },
      order: {
        endDate: 'DESC',
      },
    });

    if (!subscription || subscription.endDate <= new Date()) {
      return false;
    }

    // حداقل اعتبار برای یک پیامک (هزینه هر پیامک ۲ اعتبار است)
    return (
      subscription.smsTotal - subscription.smsUsed >= CONFIRMATION_SMS_COST
    );
  }

  /**
   * ارسال دوبارهٔ لینک بیعانه.
   *
   * پیش از این اگر پیامک لینک پاک می‌شد یا به دست مشتری نمی‌رسید، هیچ راهی
   * برای فرستادن مجدد وجود نداشت و آرایشگر مجبور بود نوبت جدید ثبت کند.
   */
  async resendDepositLink(
    bookingId: string,
    userId: number,
    roles: string[],
  ): Promise<{ message: string; depositToken: string }> {
    const booking = await this.bookingRepo.findOne({
      where: { id: bookingId },
      relations: {
        barber: true,
        service: true,
        customer: true,
      },
    });

    if (!booking) {
      throw new NotFoundException('رزرو یافت نشد');
    }

    const isBarber = booking.barber?.userId === userId;
    const isAdmin = roles?.includes('admin');

    if (!isBarber && !isAdmin) {
      throw new ForbiddenException('شما به این رزرو دسترسی ندارید');
    }

    if (
      booking.status !== BookingStatus.PENDING &&
      booking.status !== BookingStatus.CONFIRMED
    ) {
      throw new BadRequestException(
        'برای این نوبت (لغوشده یا انجام‌شده) نمی‌توان لینک بیعانه فرستاد',
      );
    }

    if (booking.depositPaidAt) {
      throw new BadRequestException('بیعانهٔ این نوبت قبلاً پرداخت شده است');
    }

    if (isBookingSlotInPast(booking.date, booking.time, getBookingClock())) {
      throw new BadRequestException(
        'زمان این نوبت گذشته است و ارسال لینک بیعانه معنا ندارد',
      );
    }

    const phone = booking.customer?.phone;
    if (!phone) {
      throw new BadRequestException('شمارهٔ تماس مشتری ثبت نشده است');
    }

    const token = booking.depositToken || this.createDepositToken();

    booking.depositToken = token;
    booking.sendDepositLink = true;
    // ارسال دوباره، مهلت پرداخت را از نو شروع می‌کند
    booking.depositRequestedAt = new Date();
    await this.bookingRepo.save(booking);

    await this.bookingSmsService.sendDepositLinkToCustomer(phone, {
      customerName: booking.customer?.fullName ?? 'مشتری',
      salonName: booking.barber?.salonName ?? 'سالن شما',
      paymentToken: token,
    });

    return {
      message: 'لینک بیعانه دوباره برای مشتری پیامک شد',
      depositToken: token,
    };
  }

  // =========================================================
  // CANCEL BY CUSTOMER
  // =========================================================

  async cancelByCustomer(id: string, userId: number): Promise<Booking> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    let saved: Booking;

    try {
      const bookingRepo = queryRunner.manager.getRepository(Booking);
      const booking = await bookingRepo
        .createQueryBuilder('booking')
        .where('booking.id = :id', { id })
        .setLock('pessimistic_write')
        .getOne();
      if (!booking) throw new NotFoundException('رزرو یافت نشد');
      if (booking.customerId !== userId) {
        throw new ForbiddenException('شما اجازه لغو این رزرو را ندارید');
      }
      if (
        booking.status !== BookingStatus.PENDING &&
        booking.status !== BookingStatus.CONFIRMED
      ) {
        throw new BadRequestException(
          'فقط رزروهای در انتظار یا تاییدشده قابل لغو هستند',
        );
      }

      // لغو نوبتی که زمانش گذشته، فقط آمار آرایشگر را خراب می‌کند.
      if (isBookingSlotInPast(booking.date, booking.time, getBookingClock())) {
        throw new BadRequestException(
          'زمان این نوبت گذشته است و امکان لغو آن وجود ندارد',
        );
      }

      /**
       * یک پرداخت می‌تواند چند ردیف رزرو (چند خدمت) بسازد. قبلاً لغو مشتری
       * فقط یک ردیف را می‌بست و بقیهٔ خدمات همان سفارش روی تقویم می‌ماندند،
       * در حالی که لغو آرایشگر همهٔ ردیف‌ها را می‌بست. اکنون هر دو یکسان‌اند.
       */
      const bookingIds = new Set<string>([booking.id]);
      const payment = await queryRunner.manager
        .getRepository(Payment)
        .createQueryBuilder('payment')
        .where('payment.purpose = :purpose', {
          purpose: PaymentPurpose.BOOKING,
        })
        .andWhere('payment.status = :status', {
          status: PaymentStatus.PAID,
        })
        .andWhere('payment.userId = :customerId', {
          customerId: booking.customerId,
        })
        .andWhere(
          '(payment.purposeId = :bookingId OR payment.metadata LIKE :pattern)',
          { bookingId: booking.id, pattern: `%${booking.id}%` },
        )
        .orderBy('payment.id', 'ASC')
        .setLock('pessimistic_write')
        .getOne();

      if (payment && this.paymentReferencesBooking(payment, booking)) {
        const relatedIds = await this.resolvePaymentBookingIds(
          queryRunner.manager,
          payment,
          booking,
        );
        for (const relatedId of relatedIds) {
          bookingIds.add(relatedId);
        }
      }

      const group = await bookingRepo
        .createQueryBuilder('booking')
        .where('booking.id IN (:...ids)', {
          ids: [...bookingIds].sort(),
        })
        .orderBy('booking.id', 'ASC')
        .setLock('pessimistic_write')
        .getMany();

      const cancellable = group.filter(
        item =>
          item.customerId === userId &&
          (item.status === BookingStatus.PENDING ||
            item.status === BookingStatus.CONFIRMED),
      );

      if (!cancellable.length) {
        throw new BadRequestException('این رزرو در وضعیت قابل لغو نیست');
      }

      const canceledAt = new Date();
      for (const item of cancellable) {
        item.status = BookingStatus.CANCELED;
        item.canceledBy = 'customer';
        item.canceledAt = canceledAt;
      }

      await bookingRepo.save(cancellable);
      await queryRunner.commitTransaction();

      saved = cancellable.find(item => item.id === id) ?? cancellable[0];
    } catch (error) {
      if (queryRunner.isTransactionActive) {
        await queryRunner.rollbackTransaction();
      }
      throw error;
    } finally {
      await queryRunner.release();
    }

    // لغو توسط مشتری بازپرداخت ایجاد نمی‌کند؛ مبلغ پرداخت‌شده برای آرایشگر می‌ماند.
    // برای سفارش چندخدمتی فقط یک پیامک می‌رود تا مشتری چند پیامک تکراری نگیرد.
    this.sendBookingCanceledSms(saved.id);
    this.sanitizeForCustomer(saved);
    return saved;
  }

  /**
   * تکمیل خودکار نوبت‌های پرداخت‌شده‌ای که زمانشان گذشته است.
   *
   * چرا لازم است: پیش از این تنها راه رسیدن به وضعیت `completed` کلیک دستی
   * آرایشگر بود. اگر او فراموش می‌کرد، نوبت همیشه `confirmed` می‌ماند و
   * زنجیره‌های وابسته قفل می‌شدند: مشتری حق ثبت نظر نداشت، شمارندهٔ رفرال
   * جلو نمی‌رفت و آمار «انجام‌شده» هیچ‌وقت درست نبود.
   *
   * فقط نوبت‌هایی تکمیل می‌شوند که پولی بابتشان ثبت شده باشد
   * (`onlinePaidAt` یا `depositPaidAt`). نوبت دستیِ بدون پرداخت دست‌نخورده
   * می‌ماند تا آرایشگر خودش دربارهٔ عدم‌حضور تصمیم بگیرد.
   *
   * با `AUTO_COMPLETE_BOOKINGS=false` می‌توان این رفتار را خاموش کرد؛
   * مهلت پیش‌فرض بعد از پایان نوبت با `AUTO_COMPLETE_GRACE_HOURS` تنظیم می‌شود.
   */
  @Cron(CronExpression.EVERY_10_MINUTES)
  async autoCompleteOverdueBookings(): Promise<number> {
    if ((process.env.AUTO_COMPLETE_BOOKINGS ?? 'true') === 'false') return 0;

    const graceHours = Number(process.env.AUTO_COMPLETE_GRACE_HOURS ?? 2);
    const graceMs =
      (Number.isFinite(graceHours) && graceHours >= 0 ? graceHours : 2) *
      3600_000;

    // فقط امروز و قبل‌ترها؛ نوبت‌های آینده هیچ‌وقت بخشی از این اسکن نیستند.
    const today = getBookingClock().date;
    const candidates = await this.bookingRepo.find({
      where: {
        status: BookingStatus.CONFIRMED,
        date: LessThanOrEqual(today),
      },
      relations: { service: true },
      order: { date: 'ASC', time: 'ASC' },
      take: 500,
    });

    const now = Date.now();
    let completedCount = 0;

    for (const booking of candidates) {
      const isPaid = Boolean(booking.onlinePaidAt || booking.depositPaidAt);
      if (!isPaid) continue;

      const startsAt = bookingWallTimeToUtc(booking.date, booking.time);
      if (!startsAt) continue;

      const durationMs =
        Math.max(booking.service?.durationMinutes ?? 30, 5) * 60_000;
      const finishesAt = startsAt.getTime() + durationMs + graceMs;

      if (finishesAt > now) continue;

      try {
        /**
         * گذارِ شرطی confirmed → completed.
         *
         * اگر دو نمونه از سرویس هم‌زمان همین نوبت را ببینند، فقط یکی
         * `affected=1` می‌گیرد؛ در نتیجه شمارندهٔ رفرال و آمار «انجام‌شده»
         * دو بار جلو نمی‌رود.
         */
        const claim = await this.bookingRepo.update(
          { id: booking.id, status: BookingStatus.CONFIRMED },
          { status: BookingStatus.COMPLETED },
        );

        if (!claim.affected) continue;

        booking.status = BookingStatus.COMPLETED;

        await this.referralService.onBookingCompleted(booking.barberId);
        await this.clubService.addFromSuccessfulBooking({
          barberId: booking.barberId,
          customerId: booking.customerId,
        });

        completedCount += 1;
      } catch (error) {
        // یک خطا نباید تکمیل بقیهٔ نوبت‌ها را متوقف کند
        this.logger.warn(
          `تکمیل خودکار نوبت ${booking.id} ناموفق بود: ${String(error)}`,
        );
      }
    }

    return completedCount;
  }

  /**
   * لغو خودکار نوبتی که بیعانه‌اش در مهلت تعیین‌شده پرداخت نشده است.
   *
   * چرا لازم است: نوبتِ «لینک بیعانه» همان لحظهٔ ساخت، ساعت را اشغال می‌کند
   * (وضعیت confirmed). اگر مشتری لینک را باز نکند یا پول ندهد، آن ساعت
   * برای همیشه از تقویم حذف می‌ماند و آرایشگر نمی‌تواند آن را به کس دیگری
   * بفروشد.
   *
   * مهلت پیش‌فرض ۶ ساعت است و با `DEPOSIT_PAYMENT_TIMEOUT_HOURS` تنظیم
   * می‌شود. هر بار که لینک دوباره ارسال شود، مهلت از نو شروع می‌شود.
   *
   * لغو با یک UPDATE شرطی انجام می‌شود (`deposit_paid_at IS NULL`) تا اگر
   * مشتری همان لحظه بیعانه را پرداخت کرده باشد، نوبت لغو نشود.
   */
  @Cron(CronExpression.EVERY_10_MINUTES)
  async expireUnpaidDepositBookings(): Promise<number> {
    if ((process.env.EXPIRE_UNPAID_DEPOSITS ?? 'true') === 'false') return 0;

    const configured = Number(process.env.DEPOSIT_PAYMENT_TIMEOUT_HOURS ?? 6);
    const timeoutHours =
      Number.isFinite(configured) && configured >= 1 ? configured : 6;
    const cutoff = new Date(Date.now() - timeoutHours * 3600_000);

    /**
     * برای نوبت‌های قدیمی که ستون `depositRequestedAt` را ندارند، زمان
     * ساخت نوبت ملاک است؛ وگرنه آن‌ها هیچ‌وقت منقضی نمی‌شدند.
     */
    const candidates = await this.bookingRepo.find({
      where: {
        sendDepositLink: true,
        depositPaidAt: IsNull(),
        status: In([BookingStatus.PENDING, BookingStatus.CONFIRMED]),
        createdAt: LessThanOrEqual(cutoff),
      },
      order: { createdAt: 'ASC' },
      take: 200,
    });

    // ارسال مجدد لینک، مهلت را از نو شروع می‌کند.
    const expired = candidates.filter(
      booking => (booking.depositRequestedAt ?? booking.createdAt) <= cutoff,
    );

    if (!expired.length) return 0;

    let canceledCount = 0;
    const canceledAt = new Date();

    for (const booking of expired) {
      try {
        const result = await this.bookingRepo
          .createQueryBuilder()
          .update(Booking)
          .set({
            status: BookingStatus.CANCELED,
            canceledBy: 'system',
            canceledAt,
            // یادآوری برای نوبت لغوشده معنا ندارد
            sendSmsReminder: false,
          })
          .where('id = :id', { id: booking.id })
          .andWhere('deposit_paid_at IS NULL')
          .andWhere('status IN (:...statuses)', {
            statuses: [BookingStatus.PENDING, BookingStatus.CONFIRMED],
          })
          .execute();

        if (result.affected) {
          canceledCount += 1;
          this.logger.log(
            `نوبت ${booking.id} به دلیل عدم پرداخت بیعانه در مهلت ${timeoutHours} ساعته لغو شد.`,
          );
        }
      } catch (error) {
        this.logger.warn(
          `لغو خودکار نوبت بیعانه ${booking.id} ناموفق بود: ${String(error)}`,
        );
      }
    }

    return canceledCount;
  }

  private sendBookingRejectedSms(bookingId: string): void {
    void this.bookingRepo
      .findOne({
        where: { id: bookingId },
        relations: {
          customer: true,
          service: true,
          barber: {
            user: true,
          },
        },
      })
      .then(booking => {
        if (!booking) return;

        const customerName = booking.customer?.fullName ?? 'مشتری';
        const serviceName = booking.service?.name ?? 'خدمت';
        const salonName = booking.barber?.salonName ?? 'سالن شما';

        void this.bookingSmsService.sendBookingRejectedToCustomer(
          booking.customer?.phone ?? '',
          {
            customerName,
            serviceName,
            date: booking.date,
            time: booking.time,
            salonName,
          },
        );
      })
      .catch(() => undefined);
  }

  private sendBookingCanceledSms(bookingId: string): void {
    void this.bookingRepo
      .findOne({
        where: { id: bookingId },
        relations: {
          customer: true,
          service: true,
          barber: {
            user: true,
          },
        },
      })
      .then(booking => {
        if (!booking) return;

        const customerName = booking.customer?.fullName ?? 'مشتری';
        const serviceName = booking.service?.name ?? 'خدمت';
        const salonName = booking.barber?.salonName ?? 'سالن شما';

        void this.bookingSmsService.sendBookingCanceledToCustomer(
          booking.customer?.phone ?? '',
          {
            customerName,
            serviceName,
            date: booking.date,
            time: booking.time,
            salonName,
          },
        );

        void this.bookingSmsService.sendBookingCanceledToBarber(
          booking.barber?.user?.phone ?? '',
          {
            customerName,
            serviceName,
            date: booking.date,
            time: booking.time,
          },
        );
      })
      .catch(() => undefined);
  }

  // =========================================================
  // GET AVAILABLE SLOTS
  // =========================================================

  async getAvailableSlots(
    userId: string,
    date: string,
    serviceIds: string[],
  ): Promise<string[]> {
    const barberUserId = Number(userId);

    let barber: BarberProfile | null = null;
    if (Number.isInteger(barberUserId)) {
      barber = await this.barberProfileRepo.findOne({
        where: [
          { userId: barberUserId, isApproved: true },
          { id: String(userId), isApproved: true },
        ],
      });
    } else {
      barber = await this.barberProfileRepo.findOne({
        where: { id: String(userId), isApproved: true },
      });
    }

    if (!barber) {
      throw new NotFoundException('پروفایل آرایشگر یافت نشد یا تایید نشده است');
    }

    const bookingClock = getBookingClock();
    if (isBookingDateInPast(date, bookingClock)) return [];

    // سرویس
    let serviceDuration = 0;
    let services: Service[] = [];
    if (serviceIds.length > 0) {
      services = await this.serviceRepo.find({
        where: serviceIds.map(id => ({
          id,
          isActive: true,
          barberId: barber.userId,
        })),
      });
      if (services.length !== serviceIds.length) {
        throw new NotFoundException('یک یا چند سرویس معتبر نیستند');
      }
      serviceDuration = services.reduce((sum, s) => sum + s.durationMinutes, 0);
    }

    if (serviceDuration <= 0) {
      serviceDuration = 30; // پیش‌فرض ۳۰ دقیقه وقتی هیچ سرویسی انتخاب نشده
    }

    const jsDay = new Date(date).getDay();

    const dayOfWeek = (jsDay + 1) % 7;

    // ساعت کاری
    const workHours = await this.workHoursRepo.find({
      where: {
        barberId: barber.id,
        dayOfWeek,
      },
      order: {
        startTime: 'ASC',
      },
    });

    if (!workHours.length) {
      return [];
    }

    // نگه‌داشتن‌های موقتِ رزروهای در جریان (پرداخت ناتمام)
    const activeHolds = await this.getActiveHoldIntervals(barber.id, date);

    // رزروهای همان روز
    const bookings = await this.bookingRepo.find({
      where: {
        barberId: barber.id,
        date,
        status: In(SLOT_HOLDING_STATUSES),
      },
      relations: {
        service: true,
      },
      order: {
        time: 'ASC',
      },
    });

    const toMinutes = (time: string) => {
      const [hours, minutes] = time.split(':').map(Number);

      return hours * 60 + minutes;
    };

    const freeSlots: string[] = [];

    const step = 15;

    for (const workHour of workHours) {
      const start = toMinutes(workHour.startTime);

      const end = toMinutes(workHour.endTime);

      if (start >= end) continue;

      let currentStart = start;

      while (currentStart + serviceDuration <= end) {
        const slotEnd = currentStart + serviceDuration;

        const candidate = { start: currentStart, end: slotEnd };

        const isBooked =
          bookings.some(booking => {
            const bookingStart = toMinutes(booking.time);

            const bookingDuration = booking.service?.durationMinutes ?? 30;

            const bookingEnd = bookingStart + bookingDuration;

            return currentStart < bookingEnd && slotEnd > bookingStart;
          }) || hasOverlap(candidate, activeHolds);

        if (!isBooked) {
          const hours = Math.floor(currentStart / 60)
            .toString()
            .padStart(2, '0');

          const minutes = (currentStart % 60).toString().padStart(2, '0');
          const slot = `${hours}:${minutes}`;

          if (!isBookingSlotInPast(date, slot, bookingClock)) {
            freeSlots.push(slot);
          }
        }

        currentStart += step;
      }
    }

    return freeSlots;
  }
}
