// src/barber/barber-review.service.ts

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Booking, BookingStatus } from 'src/booking/entities/booking.entity';
import { getPagination, QueryDto } from 'src/common/query';
import { In, Repository } from 'typeorm';

import { CreateBarberReviewDto } from './dto/create-barber-review.dto';
import { ModerateBarberReviewDto } from './dto/moderate-barber-review.dto';
import { BarberProfile } from './entities/barber.entity';
import {
  BarberReview,
  BarberReviewStatus,
} from './entities/barber-review.entity';

// وضعیت‌هایی که نشان‌دهنده «این کاربر از این آرایشگر نوبت رزرو کرده» هستند
const BOOKING_STATUSES_ELIGIBLE_FOR_REVIEW: BookingStatus[] = [
  BookingStatus.PENDING,
  BookingStatus.CONFIRMED,
  BookingStatus.COMPLETED,
];

@Injectable()
export class BarberReviewService implements OnModuleInit {
  private readonly logger = new Logger(BarberReviewService.name);

  constructor(
    @InjectRepository(BarberReview)
    private reviewRepo: Repository<BarberReview>,

    @InjectRepository(BarberProfile)
    private profileRepo: Repository<BarberProfile>,

    @InjectRepository(Booking)
    private bookingRepo: Repository<Booking>,
  ) {}

  // با راه‌اندازی سرور، میانگین امتیاز همه آرایشگرها از روی نظرات تاییدشده محاسبه می‌شود
  // (مقادیر استاتیک قبلی هم اینجا اصلاح می‌شوند)
  async onModuleInit() {
    try {
      await this.recalcAllRatings();
    } catch (error) {
      this.logger.warn('محاسبه مجدد امتیاز آرایشگرها ناموفق بود', error);
    }
  }

  // پیدا کردن پروفایل آرایشگر با User.id یا BarberProfile.id
  private async resolveBarberProfile(barberIdParam: string | number) {
    const raw = String(barberIdParam ?? '').trim();
    if (!raw) {
      throw new BadRequestException('شناسه آرایشگر نامعتبر است');
    }

    const asNumber = Number(raw);
    const where = Number.isInteger(asNumber)
      ? [{ userId: asNumber }, { id: raw }]
      : [{ id: raw }];

    const profile = await this.profileRepo.findOne({ where });
    if (!profile) {
      throw new NotFoundException('آرایشگر یافت نشد');
    }
    return profile;
  }

  // =========================================================
  // CREATE REVIEW (مشتری)
  // =========================================================
  async create(
    customerId: number,
    barberIdParam: string | number,
    dto: CreateBarberReviewDto,
  ) {
    const profile = await this.resolveBarberProfile(barberIdParam);

    if (profile.userId === customerId) {
      throw new BadRequestException(
        'امکان ثبت نظر برای پروفایل خودتان وجود ندارد',
      );
    }

    // فقط کاربرانی که قبلاً از این آرایشگر نوبت رزرو کرده‌اند
    const bookingCount = await this.bookingRepo.count({
      where: {
        customerId,
        barberId: profile.id,
        status: In(BOOKING_STATUSES_ELIGIBLE_FOR_REVIEW),
      },
    });

    if (bookingCount === 0) {
      throw new ForbiddenException(
        'فقط کاربرانی که قبلاً از این آرایشگر نوبت رزرو کرده‌اند می‌توانند نظر ثبت کنند',
      );
    }

    const existing = await this.reviewRepo.findOne({
      where: { barberId: profile.id, customerId },
    });

    if (existing) {
      throw new BadRequestException(
        'شما قبلاً برای این آرایشگر نظر ثبت کرده‌اید',
      );
    }

    const review = this.reviewRepo.create({
      barberId: profile.id,
      customerId,
      rating: dto.rating,
      comment: dto.comment?.trim() || null,
      status: BarberReviewStatus.PENDING,
    });

    const saved = await this.reviewRepo.save(review);

    return {
      message: 'نظر شما با موفقیت ثبت شد و پس از تایید ادمین نمایش داده می‌شود',
      data: this.sanitize(saved),
    };
  }

  // =========================================================
  // LIST APPROVED REVIEWS (عمومی برای صفحه آرایشگر)
  // =========================================================
  async listApprovedForBarber(barberIdParam: string | number, query: QueryDto) {
    const profile = await this.resolveBarberProfile(barberIdParam);

    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    const qb = this.reviewRepo
      .createQueryBuilder('review')
      .leftJoinAndSelect('review.customer', 'customer')
      .where('review.barberId = :barberId', { barberId: profile.id })
      .andWhere('review.status = :status', {
        status: BarberReviewStatus.APPROVED,
      })
      .orderBy('review.createdAt', 'DESC');

    const { skip, take } = getPagination(page, limit);
    qb.skip(skip).take(take);

    const [data, total] = await qb.getManyAndCount();

    return {
      data: data.map(review => this.sanitize(review)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // =========================================================
  // MY REVIEW + ELIGIBILITY (برای صفحه آرایشگر)
  // =========================================================
  async getMyReviewForBarber(
    customerId: number,
    barberIdParam: string | number,
  ) {
    const profile = await this.resolveBarberProfile(barberIdParam);

    const myReview = await this.reviewRepo.findOne({
      where: { barberId: profile.id, customerId },
    });

    let canReview = false;
    if (!myReview && profile.userId !== customerId) {
      const bookingCount = await this.bookingRepo.count({
        where: {
          customerId,
          barberId: profile.id,
          status: In(BOOKING_STATUSES_ELIGIBLE_FOR_REVIEW),
        },
      });
      canReview = bookingCount > 0;
    }

    return {
      data: {
        myReview: myReview ? this.sanitize(myReview) : null,
        canReview,
      },
    };
  }

  // =========================================================
  // ALL MY REVIEWS (برای صفحه نوبت‌های کاربر)
  // =========================================================
  async listMyReviews(customerId: number) {
    const data = await this.reviewRepo.find({
      where: { customerId },
      order: { createdAt: 'DESC' },
    });

    return {
      data: data.map(review => this.sanitize(review)),
    };
  }

  // =========================================================
  // ADMIN: LIST + MODERATE
  // =========================================================
  async listForAdmin(query: QueryDto & { status?: BarberReviewStatus }) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    const qb = this.reviewRepo
      .createQueryBuilder('review')
      .leftJoinAndSelect('review.customer', 'customer')
      .leftJoinAndSelect('review.barber', 'barber')
      .leftJoinAndSelect('barber.user', 'barberUser')
      .orderBy('review.createdAt', 'DESC');

    if (query.status) {
      qb.andWhere('review.status = :status', { status: query.status });
    }

    if (query.search?.trim()) {
      qb.andWhere(
        '(review.comment LIKE :search OR customer.fullName LIKE :search OR barber.salonName LIKE :search OR barberUser.fullName LIKE :search)',
        { search: `%${query.search.trim()}%` },
      );
    }

    const { skip, take } = getPagination(page, limit);
    qb.skip(skip).take(take);

    const [data, total] = await qb.getManyAndCount();

    return {
      data: data.map(review =>
        this.sanitize(review, {
          includeAdminNote: true,
          includeBarber: true,
        }),
      ),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async moderate(id: string, dto: ModerateBarberReviewDto) {
    const review = await this.reviewRepo.findOne({ where: { id } });

    if (!review) {
      throw new NotFoundException('نظر مورد نظر یافت نشد');
    }

    review.status = dto.status;
    review.adminNote =
      dto.status === BarberReviewStatus.REJECTED
        ? dto.adminNote?.trim() || null
        : null;
    review.reviewedAt = new Date();

    const saved = await this.reviewRepo.save(review);
    await this.recalcBarberRating(saved.barberId);

    return {
      message:
        dto.status === BarberReviewStatus.APPROVED
          ? 'نظر با موفقیت تایید شد'
          : 'نظر رد شد',
      data: this.sanitize(saved, { includeAdminNote: true }),
    };
  }

  // =========================================================
  // RATING AGGREGATION (میانگین امتیاز واقعی از نظرات تاییدشده)
  // =========================================================
  async recalcBarberRating(barberId: string) {
    const raw: { avg: string | null; cnt: string | null } | undefined =
      await this.reviewRepo
        .createQueryBuilder('review')
        .select('AVG(review.rating)', 'avg')
        .addSelect('COUNT(review.id)', 'cnt')
        .where('review.barberId = :barberId', { barberId })
        .andWhere('review.status = :status', {
          status: BarberReviewStatus.APPROVED,
        })
        .getRawOne();

    const count = Number(raw?.cnt ?? 0);
    const avg = count > 0 ? Math.round(Number(raw?.avg ?? 0) * 10) / 10 : 0;

    await this.profileRepo.update(
      { id: barberId },
      { rating: avg, reviewCount: count },
    );

    return { rating: avg, reviewCount: count };
  }

  async recalcAllRatings() {
    const rows: { barberId: string }[] = await this.reviewRepo
      .createQueryBuilder('review')
      .select('DISTINCT review.barberId', 'barberId')
      .getRawMany();

    // ابتدا همه مقادیر (از جمله مقادیر استاتیک قدیمی) صفر می‌شوند
    await this.profileRepo
      .createQueryBuilder()
      .update()
      .set({ rating: 0, reviewCount: 0 })
      .execute();

    for (const row of rows) {
      await this.recalcBarberRating(row.barberId);
    }
  }

  // =========================================================
  // SANITIZE OUTPUT
  // =========================================================
  private sanitize(
    review: BarberReview,
    options?: { includeAdminNote?: boolean; includeBarber?: boolean },
  ) {
    return {
      id: review.id,
      barberId: review.barberId,
      customerId: review.customerId,
      rating: review.rating,
      comment: review.comment,
      status: review.status,
      adminNote: options?.includeAdminNote ? review.adminNote : undefined,
      reviewedAt: review.reviewedAt,
      createdAt: review.createdAt,
      customer: review.customer
        ? {
            id: review.customer.id,
            fullName: review.customer.fullName,
          }
        : undefined,
      barber:
        options?.includeBarber && review.barber
          ? {
              id: review.barber.id,
              userId: review.barber.userId,
              salonName: review.barber.salonName,
            }
          : undefined,
    };
  }
}
