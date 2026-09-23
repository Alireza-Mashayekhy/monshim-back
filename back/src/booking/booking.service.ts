import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { BarberProfile } from 'src/barber/entities/barber.entity';
import { BarberWorkHours } from 'src/barber/entities/barber-work-hours.entity';
import { ClubService } from 'src/club/club.service';
import { CreateManualBookingDto } from 'src/club/dto/create-manual-booking.dto';
import { getPagination } from 'src/common/query';
import { ReferralService } from 'src/referral/referral.service';
import { Service } from 'src/services/entities/service.entity';
import {
  UserSubscription,
  UserSubscriptionStatus,
} from 'src/subscription/entities/user-subscription.entity';
import { User } from 'src/users/entities/user.entity';
import { Repository } from 'typeorm';

import { BookingQueryDto } from './dto/booking-query.dto';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto';
import { Booking, BookingStatus } from './entities/booking.entity';

const CONFIRMATION_SMS_COST = 2;

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

    private referralService: ReferralService,
    private clubService: ClubService,
    private userSubscriptionService: UserSubscriptionService,
    private bookingSmsService: BookingSmsService,
    private configService: ConfigService,
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
      });
    } else {
      barber = await this.barberProfileRepo.findOne({
        where: { id: String(dto.barberId), isApproved: true },
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
    this.sendBookingCreatedSms(saved, barber, service);

    return saved;
  }

  private sendBookingCreatedSms(
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

  async updateStatus(
    id: string,
    userId: number,
    roles: string[],
    dto: UpdateBookingStatusDto,
  ): Promise<Booking> {
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

    booking.status = newStatus;

    // اگر رزرو تکمیل شد، سیستم معرف را بررسی کن
    if (newStatus === BookingStatus.CONFIRMED) {
      await this.clubService.addFromSuccessfulBooking({
        barberId: booking.barberId,
        customerId: booking.customerId,
      });
    }

    if (newStatus === BookingStatus.COMPLETED) {
      // booking.customerId = شناسه کاربری که رزرو کرده (مشتری)
      await this.referralService.onBookingCompleted(booking.customerId);
      await this.clubService.addFromSuccessfulBooking({
        barberId: booking.barberId,
        customerId: booking.customerId,
      });
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

    if (!smsEligible && !dto.sendDepositLink) {
      throw new BadRequestException(
        'چون امکان ارسال پیامک یادآوری ندارید، ارسال لینک بیعانه برای مشتری الزامی است',
      );
    }

    const sendDeposit = dto.sendDepositLink ?? false;

    if (!sendDeposit) {
      await this.userSubscriptionService.deductSms(
        barberUserId,
        CONFIRMATION_SMS_COST,
        'پیامک تأیید نوبت دستی',
      );
    }

    const service = await this.serviceRepo.findOne({
      where: { id: dto.serviceId },
    });

    const booking = await this.create(member.customerId, {
      barberId: barber.userId,
      serviceId: dto.serviceId,
      date: dto.date,
      time: dto.time,
      note: dto.customerNote,
    });

    booking.status = BookingStatus.CONFIRMED;
    booking.barberNote = dto.barberNote?.trim() || null;
    booking.customerNote = dto.customerNote?.trim() || null;
    booking.sendDepositLink = dto.sendDepositLink ?? false;
    booking.sendSmsReminder = smsEligible
      ? (dto.sendSmsReminder ?? false)
      : false;
    booking.reminderHours = booking.sendSmsReminder
      ? (dto.reminderHours ?? null)
      : null;

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
        // توکن عمومی برای لینک پرداخت بیعانه
        booking.depositToken = randomBytes(24).toString('hex');

        await this.bookingRepo.save(booking);

        const paymentLink = `${this.getAppUrl()}/api/payment/deposit/${booking.depositToken}`;

        await this.bookingSmsService.sendDepositLinkToCustomer(customer.phone, {
          customerName,
          salonName,
          paymentLink,
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

  private getAppUrl(): string {
    return (
      this.configService.get<string>('APP_URL') || 'http://localhost:4000'
    ).replace(/\/+$/, '');
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
    return subscription.smsTotal - subscription.smsUsed >= 2;
  }

  // =========================================================
  // CANCEL BY CUSTOMER
  // =========================================================

  async cancelByCustomer(id: string, userId: number): Promise<Booking> {
    const booking = await this.findOne(id, userId, []);

    if (booking.customerId !== userId) {
      throw new ForbiddenException('شما اجازه لغو این رزرو را ندارید');
    }

    if (booking.status !== BookingStatus.PENDING) {
      throw new BadRequestException(
        'فقط رزروهای در انتظار تایید قابل لغو هستند',
      );
    }

    booking.status = BookingStatus.CANCELED;

    const saved = await this.bookingRepo.save(booking);

    // ❌ پیامک لغو به مشتری (403504) و آرایشگر (312735) — رایگان
    this.sendBookingCanceledSms(saved.id);

    return saved;
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
