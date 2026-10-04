import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes } from 'crypto';
import { BarberProfile } from 'src/barber/entities/barber.entity';
import { BarberWorkHours } from 'src/barber/entities/barber-work-hours.entity';
import { ClubService } from 'src/club/club.service';
import { CreateManualBookingDto } from 'src/club/dto/create-manual-booking.dto';
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
import { DataSource, EntityManager, Repository } from 'typeorm';

import { BookingQueryDto } from './dto/booking-query.dto';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto';
import { Booking, BookingStatus } from './entities/booking.entity';

const CONFIRMATION_SMS_COST = 2;
const REMINDER_SMS_COST = 2;

@Injectable()
export class BookingsService {
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

    private readonly dataSource: DataSource,
    private readonly walletService: WalletService,
    private referralService: ReferralService,
    private clubService: ClubService,
    private userSubscriptionService: UserSubscriptionService,
    private bookingSmsService: BookingSmsService,
  ) {}

  // =========================================================
  // CREATE BOOKING
  // =========================================================

  async create(customerId: number, dto: CreateBookingDto): Promise<Booking> {
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
        status: BookingStatus.CONFIRMED,
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
          const refundAmount = this.getCancellationRefundAmount(
            payment,
            lockedBookings,
          );
          if (refundAmount > 0) {
            await this.walletService.debitBarberAndQueueRefund(
              queryRunner.manager,
              {
                barberUserId,
                customerUserId: booking.customerId,
                bookingId: id,
                paymentId: payment.id,
                amount: refundAmount,
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

  private getCancellationRefundAmount(
    payment: Payment,
    linkedBookings: Booking[],
  ) {
    const paidAmount = Number(payment.amount);
    if (!Number.isFinite(paidAmount) || paidAmount <= 0) return 0;

    const metadata = this.parsePaymentMetadata(payment);
    const isDepositLink =
      metadata?.depositLink === true ||
      String(metadata?.depositLink).toLowerCase() === 'true';
    if (isDepositLink) return paidAmount;

    const customerCanceledBookings = linkedBookings.filter(
      booking => booking.canceledBy === 'customer',
    );
    if (!customerCanceledBookings.length) return paidAmount;

    const metadataTotal = Number(metadata?.totalPrice);
    const totalServiceAmount =
      Number.isFinite(metadataTotal) && metadataTotal >= 0
        ? metadataTotal
        : linkedBookings.reduce(
            (total, booking) => total + Number(booking.price || 0),
            0,
          );
    const customerCanceledAmount = customerCanceledBookings.reduce(
      (total, booking) => total + Number(booking.price || 0),
      0,
    );

    // Keep the customer-canceled service and the one-time site commission;
    // only refund services that the barber is canceling.
    return Number(
      Math.max(0, totalServiceAmount - customerCanceledAmount).toFixed(2),
    );
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
        const paymentToken = randomBytes(24).toString('hex');
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

      booking.status = BookingStatus.CANCELED;
      booking.canceledBy = 'customer';
      booking.canceledAt = new Date();
      saved = await bookingRepo.save(booking);
      await queryRunner.commitTransaction();
    } catch (error) {
      if (queryRunner.isTransactionActive) {
        await queryRunner.rollbackTransaction();
      }
      throw error;
    } finally {
      await queryRunner.release();
    }

    // لغو توسط مشتری بازپرداخت ایجاد نمی‌کند؛ مبلغ پرداخت‌شده برای آرایشگر می‌ماند.
    this.sendBookingCanceledSms(saved.id);
    this.sanitizeForCustomer(saved);
    return saved;
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

    // سرویس
    let serviceDuration = 0;
    let services: Service[] = [];
    if (serviceIds.length > 0) {
      services = await this.serviceRepo.find({
        where: serviceIds.map(id => ({ id, isActive: true })),
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

    // رزروهای همان روز
    const bookings = await this.bookingRepo.find({
      where: {
        barberId: barber.id,
        date,
        status: BookingStatus.CONFIRMED,
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

        const isBooked = bookings.some(booking => {
          const bookingStart = toMinutes(booking.time);

          const bookingDuration = booking.service?.durationMinutes ?? 30;

          const bookingEnd = bookingStart + bookingDuration;

          return currentStart < bookingEnd && slotEnd > bookingStart;
        });

        if (!isBooked) {
          const hours = Math.floor(currentStart / 60)
            .toString()
            .padStart(2, '0');

          const minutes = (currentStart % 60).toString().padStart(2, '0');

          freeSlots.push(`${hours}:${minutes}`);
        }

        currentStart += step;
      }
    }

    return freeSlots;
  }
}
