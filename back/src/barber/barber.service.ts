import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { BaleNotificationService } from 'src/bale/bale-notification.service';
import {
  isAllowedSlotIntervalMinutes,
  normalizeSlotIntervalMinutes,
} from 'src/booking/slot-intervals';
import { Role } from 'src/common/enum/role.enum';
import { getPagination, QueryDto } from 'src/common/query';
import { FrontendRevalidationService } from 'src/common/services/frontend-revalidation.service';
import {
  isValidIranianNationalCode,
  normalizeNationalCode,
  toEnglishDigits,
} from 'src/common/utils/national-code.util';
import { FilesService } from 'src/files/files.service';
import { City } from 'src/locations/entities/city.entity';
import { Province } from 'src/locations/entities/province.entity';
import { BookingSmsService } from 'src/notification/booking-sms.service';
import { Service } from 'src/services/entities/service.entity';
import { User } from 'src/users/entities/user.entity';
import { Brackets, EntityManager, In, Repository } from 'typeorm';

import {
  ACTIVITY_TYPE_ERROR_MESSAGE,
  isActivityTypeValue,
} from './activity-types';
import { ReviewBarberDto } from './dto/review-barber.dto';
import { UpdateBarberDto } from './dto/update-barber.dto';
import {
  BARBER_MODERATED_DIFF_KEYS,
  BARBER_MODERATED_FIELD_LABELS,
  BarberPendingChanges,
  BarberPendingStatus,
  BarberProfile,
  getBarberChangedFieldLabels,
} from './entities/barber.entity';

function stringArraysEqual(
  left: string[] | null | undefined,
  right: string[] | null | undefined,
): boolean {
  const a = left ?? [];
  const b = right ?? [];
  if (a.length !== b.length) return false;
  return a.every((item, index) => item === b[index]);
}

@Injectable()
export class BarberService implements OnModuleInit {
  private readonly logger = new Logger(BarberService.name);

  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,

    @InjectRepository(BarberProfile)
    private profileRepository: Repository<BarberProfile>,

    @InjectRepository(City)
    private cityRepository: Repository<City>,

    @Optional()
    @InjectRepository(Province)
    private provinceRepository?: Repository<Province>,

    @Optional()
    private readonly bookingSmsService?: BookingSmsService,

    @Optional()
    private readonly filesService?: FilesService,

    @Optional()
    private readonly baleNotificationService?: BaleNotificationService,

    @Optional()
    private readonly frontendRevalidationService?: FrontendRevalidationService,
  ) {}

  /**
   * در محیط پروداکشن `synchronize` غیرفعال است؛ این متد به شکل idempotent
   * ستون‌های مربوط به پیش‌نویس ویرایش پروفایل را در جدول `barber_profile`
   * ایجاد می‌کند تا بدون نیاز به اجرای دستی SQL کار کند.
   */
  async onModuleInit() {
    if (
      typeof this.profileRepository?.query !== 'function' ||
      !this.profileRepository?.metadata?.tableName
    ) {
      return;
    }

    const tableName = this.profileRepository.metadata.tableName;
    if (!/^[a-zA-Z0-9_]+$/.test(tableName)) {
      return;
    }

    try {
      const rows: Array<{ COLUMN_NAME?: string; column_name?: string }> =
        await this.profileRepository.query(
          'SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?',
          [tableName],
        );

      const existing = new Set(
        (rows ?? []).map(row =>
          String(row.COLUMN_NAME ?? row.column_name ?? '').toLowerCase(),
        ),
      );

      if (!existing.has('pending_changes')) {
        await this.profileRepository.query(
          `ALTER TABLE \`${tableName}\` ADD COLUMN \`pending_changes\` JSON NULL`,
        );
      }

      if (!existing.has('pending_status')) {
        await this.profileRepository.query(
          `ALTER TABLE \`${tableName}\` ADD COLUMN \`pending_status\` VARCHAR(20) NOT NULL DEFAULT 'none'`,
        );
      }

      if (!existing.has('pending_rejection_reason')) {
        await this.profileRepository.query(
          `ALTER TABLE \`${tableName}\` ADD COLUMN \`pending_rejection_reason\` TEXT NULL`,
        );
      }
    } catch (error) {
      this.logger.warn(
        `بررسی/ایجاد ستون‌های pending پروفایل آرایشگر ناموفق بود: ${String(error)}`,
      );
    }
  }

  /**
   * اعلام تغییر دادهٔ عمومی آرایشگر به فرانت، تا کشِ SSR صفحه‌های عمومی
   * (`/barber/[slug]`، فهرست آرایشگرها و sitemap) همان لحظه تازه شود.
   *
   * این کار «کمربند ایمنی» است: پنل ادمین/آرایشگر خودشان هم بعد از موفقیت
   * درخواست، Server Actionِ پاک‌سازی کش را صدا می‌زنند؛ اما اگر تایید از مسیر
   * دیگری (اسکریپت/اپ/ربات) انجام شود، فقط همین اطلاع‌رسانی کشِ فرانت را
   * به‌روز می‌کند. در صورت نبود تنظیمات، بی‌صدا رد می‌شود.
   */
  private notifyPublicProfileChanged(
    userId: number | null | undefined,
    slug?: string | null,
  ) {
    const numericUserId = Number(userId);
    if (!Number.isInteger(numericUserId) || numericUserId < 1) return;

    this.frontendRevalidationService?.notifyBarberProfileChanged({
      userId: numericUserId,
      slugs: [slug ?? null],
    });
  }

  // src/barber/barber.service.ts
  async create(
    data: {
      userId: number;
      salonName: string;
      activityType?: string;
      provinceId: number;
      cityId: number;
      address: string;
      profileImage?: string;
      portfolioImages?: string[];
      isApproved?: boolean;
      workStartTime?: string | null; // اضافه کردن null
      workEndTime?: string | null; // اضافه کردن null
      bio?: string;
      referredBy?: number;
    },
    manager?: EntityManager,
  ) {
    const repository = manager
      ? manager.getRepository(BarberProfile)
      : this.profileRepository;

    // تولید کد معرف یکتا
    const referralCode = await this.generateUniqueReferralCode(manager);

    const profile = repository.create({
      ...data,
      referralCode,
      referredBy: data.referredBy || null,
    });
    return repository.save(profile);
  }

  // تولید کد معرف یکتا (۸ کاراکتر)
  private async generateUniqueReferralCode(
    manager?: EntityManager,
  ): Promise<string> {
    const repository = manager
      ? manager.getRepository(BarberProfile)
      : this.profileRepository;
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code: string;
    let isUnique = false;

    while (!isUnique) {
      code = '';
      for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      // بررسی یکتا بودن کد
      const existing = await repository.findOne({
        where: { referralCode: code },
      });
      if (!existing) {
        isUnique = true;
      }
    }

    return code!;
  }

  // دریافت پروفایل بر اساس کد معرف
  async findByReferralCode(code: string): Promise<BarberProfile | null> {
    return this.profileRepository.findOne({
      where: { referralCode: code },
    });
  }

  // دریافت اطلاعات معرف برای یک آرایشگر
  async getReferralInfo(userId: number) {
    const profile = await this.profileRepository.findOne({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException('پروفایل آرایشگر یافت نشد');
    }

    return {
      referralCode: profile.referralCode,
      referredBy: profile.referredBy,
    };
  }

  async findAll(
    query: QueryDto,
    filters?: {
      cityId?: number;
      provinceId?: number;
      minPrice?: number;
      maxPrice?: number;
      minRating?: number;
      gender?: string | null;
    },
    notApproved?: boolean,
  ) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const qb = this.userRepo.createQueryBuilder('user');
    const minActiveServicePrice = qb
      .subQuery()
      .select('MIN(priceService.price)')
      .from(Service, 'priceService')
      .where('priceService.barberId = user.id')
      .andWhere('priceService.isActive = :priceServiceActive')
      .getQuery();

    qb.where('user.roles LIKE :role', { role: '%Barber%' });

    // JOIN با پروفایل، شهر و استان
    qb.leftJoinAndSelect('user.barberProfile', 'profile')
      .leftJoinAndSelect('profile.city', 'city')
      .leftJoinAndSelect('profile.province', 'province')
      .leftJoinAndSelect(
        'user.services',
        'services',
        notApproved ? undefined : 'services.isActive = :serviceActive',
        notApproved ? undefined : { serviceActive: true },
      );

    if (notApproved) {
      qb.andWhere(
        new Brackets(subQb => {
          subQb
            .where('profile.isApproved != :isApproved', {
              isApproved: true,
            })
            .orWhere('profile.pendingStatus = :pendingStatus', {
              pendingStatus: 'pending',
            });
        }),
      );
    } else {
      qb.andWhere('profile.isApproved = :isApproved', {
        isApproved: true,
      })
        .andWhere('user.isActive = :userActive', { userActive: true })
        .andWhere('services.id IS NOT NULL');
    }

    if (filters?.cityId) {
      qb.andWhere('profile.cityId = :cityId', { cityId: filters.cityId });
    }

    if (filters?.provinceId) {
      qb.andWhere('profile.provinceId = :provinceId', {
        provinceId: filters.provinceId,
      });
    }

    if (filters?.gender === 'male') {
      qb.andWhere('profile.activityType IN (:...activityTypes)', {
        activityTypes: ['men', 'both'],
      });
    } else if (filters?.gender === 'female') {
      qb.andWhere('profile.activityType IN (:...activityTypes)', {
        activityTypes: ['women', 'both'],
      });
    }

    if (query.search?.trim()) {
      const rawTrimmed = query.search.trim();
      const normalizedTrimmed = toEnglishDigits(rawTrimmed);
      qb.andWhere(
        new Brackets(subQb => {
          subQb
            .where('user.fullName LIKE :search', {
              search: `%${normalizedTrimmed}%`,
            })
            .orWhere('profile.salonName LIKE :search', {
              search: `%${normalizedTrimmed}%`,
            })
            .orWhere('services.name LIKE :search', {
              search: `%${normalizedTrimmed}%`,
            });

          if (notApproved) {
            subQb.orWhere('CAST(profile.pendingChanges AS CHAR) LIKE :search', {
              search: `%${normalizedTrimmed}%`,
            });
          }

          if (normalizedTrimmed !== rawTrimmed) {
            subQb
              .orWhere('user.fullName LIKE :rawSearch', {
                rawSearch: `%${rawTrimmed}%`,
              })
              .orWhere('profile.salonName LIKE :rawSearch', {
                rawSearch: `%${rawTrimmed}%`,
              })
              .orWhere('services.name LIKE :rawSearch', {
                rawSearch: `%${rawTrimmed}%`,
              });

            if (notApproved) {
              subQb.orWhere(
                'CAST(profile.pendingChanges AS CHAR) LIKE :rawSearch',
                { rawSearch: `%${rawTrimmed}%` },
              );
            }
          }
        }),
      );
    }

    if (filters?.minPrice !== undefined) {
      qb.andWhere(`${minActiveServicePrice} >= :minPrice`, {
        minPrice: filters.minPrice,
      });
      qb.setParameter('priceServiceActive', true);
    }
    if (filters?.maxPrice !== undefined) {
      qb.andWhere(`${minActiveServicePrice} <= :maxPrice`, {
        maxPrice: filters.maxPrice,
      });
      qb.setParameter('priceServiceActive', true);
    }
    if (filters?.minRating !== undefined) {
      qb.andWhere('profile.rating >= :minRating', {
        minRating: filters.minRating,
      });
    }

    // مرتب‌سازی
    if (query.sort) {
      const [field, order] = query.sort.split(':');
      const direction = order?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
      switch (field) {
        case 'fullName':
          qb.orderBy('user.fullName', direction);
          break;
        case 'salonName':
          qb.orderBy('profile.salonName', direction);
          break;
        case 'rating':
          qb.orderBy('profile.rating', direction);
          break;
        case 'createdAt':
          qb.orderBy('user.createdAt', direction);
          break;
        case 'price':
          qb.orderBy(minActiveServicePrice, direction).addOrderBy(
            'user.id',
            'DESC',
          );
          qb.setParameter('priceServiceActive', true);
          break;
        default:
          qb.orderBy('user.id', direction);
      }
    } else {
      qb.orderBy('user.id', 'DESC');
    }

    const { skip, take } = getPagination(page, limit);
    qb.skip(skip).take(take);

    const [rawData, total] = await qb.getManyAndCount();

    const pendingCityMap = new Map<number, City>();
    const pendingProvinceMap = new Map<number, Province>();
    if (notApproved) {
      const pendingCityIds = Array.from(
        new Set(
          rawData
            .map((u: any) =>
              u.barberProfile?.pendingStatus === 'pending'
                ? u.barberProfile?.pendingChanges?.cityId
                : null,
            )
            .filter(
              (cid: unknown): cid is number =>
                typeof cid === 'number' && Number.isInteger(cid) && cid > 0,
            ),
        ),
      );
      if (
        pendingCityIds.length > 0 &&
        typeof this.cityRepository?.find === 'function'
      ) {
        const cities = await this.cityRepository.find({
          where: { id: In(pendingCityIds) },
          relations: { province: true },
        });
        for (const c of cities) {
          pendingCityMap.set(c.id, c);
          if (c.province) {
            pendingProvinceMap.set(c.province.id, c.province);
          }
        }
      }

      const unresolvedProvinceIds = Array.from(
        new Set(
          rawData
            .map((u: any) =>
              u.barberProfile?.pendingStatus === 'pending'
                ? u.barberProfile?.pendingChanges?.provinceId
                : null,
            )
            .filter(
              (pid: unknown): pid is number =>
                typeof pid === 'number' &&
                Number.isInteger(pid) &&
                pid > 0 &&
                !pendingProvinceMap.has(pid),
            ),
        ),
      );
      if (
        unresolvedProvinceIds.length > 0 &&
        typeof this.provinceRepository?.find === 'function'
      ) {
        const provinces = await this.provinceRepository.find({
          where: { id: In(unresolvedProvinceIds) },
        });
        for (const p of provinces) {
          pendingProvinceMap.set(p.id, p);
        }
      }
    }

    // نگاشت به فرمت دلخواه همراه با محاسبه قیمت شروع
    const data = rawData.map((user: any) => {
      const services = user.services || [];
      const prices = services
        .map((s: any) => Number(s.price))
        .filter((p: number) => Number.isFinite(p) && p >= 0);
      const minPrice = prices.length > 0 ? Math.min(...prices) : null;
      const profile: BarberProfile | undefined = user.barberProfile;

      if (notApproved) {
        const pending =
          profile?.pendingStatus === 'pending' ? profile.pendingChanges : null;
        const resolvedCity =
          pending && 'cityId' in pending
            ? pending.cityId
              ? (pendingCityMap.get(pending.cityId) ?? null)
              : null
            : (profile?.city ?? null);
        const resolvedProvince =
          pending && 'provinceId' in pending
            ? pending.provinceId
              ? (pendingProvinceMap.get(pending.provinceId) ??
                resolvedCity?.province ??
                null)
              : null
            : (profile?.province ?? null);

        return {
          id: user.id,
          fullName: pending?.fullName ?? user.fullName ?? '',
          salonName: pending?.salonName ?? profile?.salonName ?? '',
          profileImage:
            pending?.profileImage !== undefined
              ? pending.profileImage
              : profile?.profileImage || null,
          activityType:
            pending?.activityType !== undefined
              ? pending.activityType
              : (profile?.activityType ?? null),
          cityName: resolvedCity?.name || null,
          citySlug: resolvedCity?.slug || null,
          provinceName: resolvedProvince?.name || null,
          minPrice,
          servicesCount: services.length,
          rating: Number(profile?.rating || 0),
          reviewCount: Number(profile?.reviewCount || 0),
          isApproved: Boolean(profile?.isApproved),
          hasPendingChanges: profile?.pendingStatus === 'pending',
          isEditReview: Boolean(
            profile?.isApproved && profile?.pendingStatus === 'pending',
          ),
        };
      }

      return {
        id: user.id,
        salonName: profile?.salonName || '',
        profileImage: profile?.profileImage || null,
        activityType: profile?.activityType || null,
        cityName: profile?.city?.name || null,
        citySlug: profile?.city?.slug || null,
        provinceName: profile?.province?.name || null,
        minPrice,
        servicesCount: services.length,
        rating: Number(profile?.rating || 0),
        reviewCount: Number(profile?.reviewCount || 0),
      };
    });

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

  /**
   * The intentionally public profile response. Never spread User or BarberProfile
   * entities here: those entities also contain credentials and private account
   * fields. Only approved, active accounts and active services are public.
   */
  async findPublicOne(id: number) {
    const user = await this.userRepo
      .createQueryBuilder('user')
      .innerJoinAndSelect('user.barberProfile', 'profile')
      .leftJoinAndSelect('profile.city', 'city')
      .leftJoinAndSelect('profile.province', 'province')
      .leftJoinAndSelect(
        'user.services',
        'services',
        'services.isActive = :serviceActive',
        { serviceActive: true },
      )
      .where('user.id = :id', { id })
      .andWhere('(user.roles LIKE :roleLower OR user.roles LIKE :roleUpper)', {
        roleLower: '%barber%',
        roleUpper: '%Barber%',
      })
      .andWhere('user.isActive = :userActive', { userActive: true })
      .andWhere('profile.isApproved = :isApproved', { isApproved: true })
      .getOne();

    if (!user?.barberProfile) {
      throw new NotFoundException('آرایشگاه یافت نشد');
    }

    const profile = user.barberProfile;
    return {
      id: user.id,
      slug: profile.slug ?? null,
      salonName: profile.salonName,
      activityType: profile.activityType,
      profileImage: profile.profileImage,
      image: profile.profileImage,
      address: profile.address,
      bio: profile.bio,
      rating: Number(profile.rating || 0),
      reviewCount: Number(profile.reviewCount || 0),
      slotIntervalMinutes: normalizeSlotIntervalMinutes(
        profile.slotIntervalMinutes,
      ),
      portfolio: profile.portfolioImages ?? [],
      services: (user.services ?? []).map(service => ({
        id: service.id,
        name: service.name,
        price: Number(service.price),
        depositPrice:
          service.depositPrice == null ? null : Number(service.depositPrice),
        durationMinutes: service.durationMinutes,
      })),
      city: profile.city
        ? {
            id: profile.city.id,
            name: profile.city.name,
            slug: profile.city.slug,
            provinceId: profile.city.provinceId,
          }
        : null,
      province: profile.province
        ? {
            id: profile.province.id,
            name: profile.province.name,
            slug: profile.province.slug,
          }
        : null,
    };
  }

  /** Public IDs/cities for sitemap and indexable city routes; requires an
   * approved profile, an active account, and at least one active service. */
  async getPublicDirectory() {
    const rows = await this.profileRepository
      .createQueryBuilder('profile')
      .innerJoin('profile.user', 'user')
      .innerJoin(
        'user.services',
        'service',
        'service.isActive = :serviceActive',
        { serviceActive: true },
      )
      .leftJoin('profile.city', 'city')
      .leftJoin('profile.province', 'province')
      .where('profile.isApproved = :isApproved', { isApproved: true })
      .andWhere('user.isActive = :userActive', { userActive: true })
      .select('profile.userId', 'userId')
      .addSelect('city.slug', 'citySlug')
      .addSelect('city.name', 'cityName')
      .addSelect('province.name', 'provinceName')
      .addSelect('profile.address', 'address')
      .distinct(true)
      .getRawMany<{
        userId: number;
        citySlug: string | null;
        cityName: string | null;
        provinceName: string | null;
        address: string | null;
      }>();

    const barberIds = new Set<number>();
    const cities = new Map<
      string,
      {
        slug: string;
        name: string;
        provinceName: string | null;
        activeBarberCount: number;
      }
    >();

    for (const row of rows) {
      const userId = Number(row.userId);
      if (Number.isInteger(userId) && (row.address?.trim() || row.citySlug)) {
        barberIds.add(userId);
      }

      if (!row.citySlug || !row.cityName) continue;
      const city = cities.get(row.citySlug) ?? {
        slug: row.citySlug,
        name: row.cityName,
        provinceName: row.provinceName,
        activeBarberCount: 0,
      };
      city.activeBarberCount += 1;
      cities.set(row.citySlug, city);
    }

    return {
      barbers: [...barberIds].map(id => ({ id })),
      cities: [...cities.values()].sort((a, b) =>
        a.name.localeCompare(b.name, 'fa'),
      ),
    };
  }

  async findPublicCityBySlug(slug: string) {
    const city = await this.cityRepository
      .createQueryBuilder('city')
      .leftJoinAndSelect('city.province', 'province')
      .where('city.slug = :slug', { slug: slug.trim() })
      .getOne();

    if (!city) {
      throw new NotFoundException('شهر یافت نشد');
    }

    const result = await this.findAll(
      { page: 1, limit: 100, sort: 'salonName:asc' },
      { cityId: city.id },
    );

    if (result.pagination.total === 0) {
      throw new NotFoundException('آرایشگاه فعالی در این شهر یافت نشد');
    }

    return {
      data: {
        city: {
          id: city.id,
          name: city.name,
          slug: city.slug,
          provinceName: city.province?.name ?? null,
        },
        barbers: result.data,
      },
      pagination: result.pagination,
    };
  }

  async findOne(id: number): Promise<any> {
    // استفاده از QueryBuilder برای دریافت داده‌های مرتبط
    const qb = this.userRepo.createQueryBuilder('user');

    qb.where('user.id = :id', { id })
      .andWhere('(user.roles LIKE :roleLower OR user.roles LIKE :roleUpper)', {
        roleLower: '%barber%',
        roleUpper: '%Barber%',
      })
      .leftJoinAndSelect('user.barberProfile', 'profile')
      .leftJoinAndSelect('profile.city', 'city')
      .leftJoinAndSelect('profile.province', 'province')
      .leftJoinAndSelect('user.services', 'services'); // ارتباط OneToMany با Service

    // (اختیاری) اگر نمونه‌کارها در پروفایل ذخیره شده‌اند، نیازی به JOIN جداگانه نیست

    const user = await qb.getOne();

    if (!user) {
      throw new NotFoundException('آرایشگر یافت نشد');
    }

    // استخراج داده‌های مورد نیاز از user
    const profile = user.barberProfile;
    if (!profile) {
      throw new NotFoundException('پروفایل آرایشگر یافت نشد');
    }

    // ساختار خروجی
    return {
      ...user,
      ...profile,
      id: user.id,
      barberProfileId: profile.id,
    };
  }

  private prunePendingChanges(
    draft: BarberPendingChanges,
    user: User,
    profile: BarberProfile,
  ): BarberPendingChanges | null {
    const next: BarberPendingChanges = { ...draft };

    if (
      next.fullName !== undefined &&
      next.fullName.trim() === (user.fullName ?? '').trim()
    ) {
      delete next.fullName;
    }

    if (
      next.salonName !== undefined &&
      next.salonName.trim() === (profile.salonName ?? '').trim()
    ) {
      delete next.salonName;
    }

    if (
      next.activityType !== undefined &&
      (next.activityType ?? null) === (profile.activityType ?? null)
    ) {
      delete next.activityType;
    }

    if (
      next.provinceId !== undefined &&
      (next.provinceId ?? null) === (profile.provinceId ?? null)
    ) {
      delete next.provinceId;
    }

    if (
      next.cityId !== undefined &&
      (next.cityId ?? null) === (profile.cityId ?? null)
    ) {
      delete next.cityId;
    }

    if (
      next.address !== undefined &&
      next.address.trim() === (profile.address ?? '').trim()
    ) {
      delete next.address;
    }

    if (next.bio !== undefined && (next.bio ?? '') === (profile.bio ?? '')) {
      delete next.bio;
    }

    if (
      next.profileImage !== undefined &&
      (next.profileImage ?? null) === (profile.profileImage ?? null)
    ) {
      delete next.profileImage;
    }

    if (
      next.portfolioImages !== undefined &&
      stringArraysEqual(next.portfolioImages, profile.portfolioImages ?? [])
    ) {
      delete next.portfolioImages;
    }

    const hasDiff = BARBER_MODERATED_DIFF_KEYS.some(
      key => next[key] !== undefined,
    );
    if (!hasDiff) {
      return null;
    }

    next.submittedAt = new Date().toISOString();
    return next;
  }

  private hasPendingDraftChanged(
    previousDraft: BarberPendingChanges,
    nextPruned: BarberPendingChanges,
  ): boolean {
    return BARBER_MODERATED_DIFF_KEYS.some(key => {
      if (key === 'portfolioImages') {
        if (
          (previousDraft.portfolioImages === undefined) !==
          (nextPruned.portfolioImages === undefined)
        ) {
          return true;
        }
        return !stringArraysEqual(
          previousDraft.portfolioImages,
          nextPruned.portfolioImages,
        );
      }
      return previousDraft[key] !== nextPruned[key];
    });
  }

  private async resolveEffectiveLocation(
    profile: BarberProfile,
    pending: BarberPendingChanges | null | undefined,
  ): Promise<{
    provinceId: number | null;
    cityId: number | null;
    province: Province | null;
    city: City | null;
  }> {
    const hasPendingCity = Boolean(pending && 'cityId' in pending);
    const hasPendingProvince = Boolean(pending && 'provinceId' in pending);

    const effectiveCityId = hasPendingCity
      ? (pending?.cityId ?? null)
      : (profile.cityId ?? null);
    const effectiveProvinceId = hasPendingProvince
      ? (pending?.provinceId ?? null)
      : (profile.provinceId ?? null);

    let effectiveCity: City | null = null;
    if (effectiveCityId === (profile.cityId ?? null)) {
      effectiveCity = profile.city ?? null;
    } else if (
      effectiveCityId !== null &&
      typeof this.cityRepository?.findOne === 'function'
    ) {
      effectiveCity = await this.cityRepository.findOne({
        where: { id: effectiveCityId },
        relations: { province: true },
      });
    }

    let effectiveProvince: Province | null = null;
    if (effectiveProvinceId === (profile.provinceId ?? null)) {
      effectiveProvince = profile.province ?? null;
    } else if (
      effectiveCity?.province &&
      effectiveCity.province.id === effectiveProvinceId
    ) {
      effectiveProvince = effectiveCity.province;
    } else if (
      effectiveProvinceId !== null &&
      typeof this.provinceRepository?.findOne === 'function'
    ) {
      effectiveProvince = await this.provinceRepository.findOne({
        where: { id: effectiveProvinceId },
      });
    }

    return {
      provinceId: effectiveProvinceId,
      cityId: effectiveCityId,
      province: effectiveProvince,
      city: effectiveCity,
    };
  }

  async findOneByUserId(userId: number): Promise<any> {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: {
        barberProfile: {
          city: true,
          province: true,
        },
      },
    });

    if (!user) {
      throw new NotFoundException('کاربر یافت نشد');
    }

    const profile = user.barberProfile;
    if (!profile) {
      throw new NotFoundException('پروفایل آرایشگر یافت نشد');
    }

    const pendingStatus: BarberPendingStatus = profile.pendingStatus || 'none';
    const pending =
      profile.isApproved && pendingStatus !== 'none'
        ? profile.pendingChanges
        : null;

    const location = await this.resolveEffectiveLocation(profile, pending);

    return {
      id: user.id,
      fullName: pending?.fullName ?? user.fullName,
      phone: user.phone,
      nationalCode: user.nationalCode || null,
      email: user.email,
      birthDate: user.birthDate || null,
      salonName: pending?.salonName ?? profile.salonName,
      activityType:
        pending?.activityType !== undefined
          ? pending.activityType
          : (profile.activityType ?? null),
      provinceId: location.provinceId,
      cityId: location.cityId,
      provinceName: location.province?.name || null,
      cityName: location.city?.name || null,
      address: pending?.address ?? profile.address,
      bio: pending?.bio !== undefined ? pending.bio : profile.bio,
      profileImage:
        pending?.profileImage !== undefined
          ? pending.profileImage
          : profile.profileImage,
      portfolioImages:
        pending?.portfolioImages !== undefined
          ? pending.portfolioImages
          : profile.portfolioImages || [],
      workStartTime: profile.workStartTime,
      workEndTime: profile.workEndTime,
      isApproved: profile.isApproved,
      rejectionReason: profile.rejectionReason || null,
      pendingStatus,
      hasPendingChanges: pendingStatus === 'pending',
      pendingRejectionReason: profile.pendingRejectionReason || null,
      slotIntervalMinutes: normalizeSlotIntervalMinutes(
        profile.slotIntervalMinutes,
      ),
      createdAt: profile.createdAt,
    };
  }

  /**
   * ویرایش پروفایل آرایشگر از سمت ادمین.
   * کنترلر ادمین شناسهٔ پروفایل (uuid) را می‌فرستد، در حالی که متد update
   * بر اساس User.id کار می‌کند؛ قبلاً `+id` روی uuid تبدیل به NaN می‌شد و
   * درخواست همیشه شکست می‌خورد.
   */
  async updateByProfileId(profileId: string, dto: UpdateBarberDto) {
    const profile = await this.profileRepository.findOne({
      where: { id: profileId },
    });

    if (!profile) {
      throw new NotFoundException('پروفایل آرایشگر یافت نشد');
    }

    const updated = await this.update(profile.userId, dto, { byAdmin: true });

    // ویرایش مستقیم ادمین بلافاصله روی صفحهٔ عمومی اثر می‌گذارد.
    this.notifyPublicProfileChanged(
      profile.userId,
      updated?.slug ?? profile.slug,
    );

    return updated;
  }

  /** جزئیات آرایشگر برای پنل ادمین بر اساس شناسهٔ پروفایل (uuid) */
  async findOneByProfileId(profileId: string) {
    const profile = await this.profileRepository.findOne({
      where: { id: profileId },
    });

    if (!profile) {
      throw new NotFoundException('پروفایل آرایشگر یافت نشد');
    }

    return this.findOne(profile.userId);
  }

  /**
   * جزئیات پروفایل آرایشگر برای صفحهٔ «تایید آرایشگر» در پنل ادمین.
   *
   * لیست «آرایشگرهای در انتظار تایید» (`findAll` با notApproved) شناسهٔ
   * کاربر (User.id) را برمی‌گرداند، اما `findOneByProfileId` انتظار uuid
   * پروفایل را دارد؛ بنابراین `GET /admin/barber/21` همیشه ۴۰۴ می‌داد.
   *
   * این متد شناسهٔ عددی (User.id) را می‌پذیرد و برای سازگاری، uuid پروفایل
   * را هم پشتیبانی می‌کند. خروجی عمداً فقط فیلدهای لازم برای بررسی و تایید
   * را دارد و هیچ دادهٔ حساسی (رمز عبور، توکن و...) را برنمی‌گرداند.
   */
  async findApprovalDetail(id: string) {
    const numericId = Number(id);
    const profile = await this.profileRepository.findOne({
      where:
        Number.isInteger(numericId) && numericId > 0
          ? { userId: numericId }
          : { id },
      relations: { city: true, province: true },
    });

    if (!profile) {
      throw new NotFoundException('پروفایل آرایشگر یافت نشد');
    }

    const user = await this.userRepo.findOne({
      where: { id: profile.userId },
      relations: { services: true },
    });

    if (!user) {
      throw new NotFoundException('کاربر یافت نشد');
    }

    if (!user.roles?.includes(Role.Barber)) {
      throw new NotFoundException('آرایشگر یافت نشد');
    }

    const pendingStatus: BarberPendingStatus = profile.pendingStatus || 'none';
    const hasPendingEdit = Boolean(
      profile.isApproved &&
      pendingStatus === 'pending' &&
      profile.pendingChanges,
    );
    const pending = hasPendingEdit ? profile.pendingChanges : null;
    const location = await this.resolveEffectiveLocation(profile, pending);

    return {
      id: user.id,
      barberProfileId: profile.id,
      // اسلاگ صفحهٔ عمومی؛ پنل ادمین بعد از تایید از همین مقدار برای
      // پاک‌سازی دقیق کشِ `/barber/[slug]` استفاده می‌کند.
      slug: profile.slug ?? null,
      fullName: pending?.fullName ?? user.fullName,
      phone: user.phone ?? null,
      email: user.email ?? null,
      nationalCode: user.nationalCode ?? null,
      birthDate: user.birthDate ?? null,
      isActive: user.isActive,
      salonName: pending?.salonName ?? profile.salonName,
      activityType:
        pending?.activityType !== undefined
          ? (pending.activityType ?? null)
          : (profile.activityType ?? null),
      province: location.province,
      provinceId: location.provinceId,
      city: location.city,
      cityId: location.cityId,
      address: pending?.address ?? profile.address,
      bio:
        pending?.bio !== undefined
          ? (pending.bio ?? null)
          : (profile.bio ?? null),
      profileImage:
        pending?.profileImage !== undefined
          ? (pending.profileImage ?? null)
          : (profile.profileImage ?? null),
      portfolioImages:
        pending?.portfolioImages !== undefined
          ? pending.portfolioImages
          : (profile.portfolioImages ?? []),
      workStartTime: profile.workStartTime ?? null,
      workEndTime: profile.workEndTime ?? null,
      slotIntervalMinutes: normalizeSlotIntervalMinutes(
        profile.slotIntervalMinutes,
      ),
      isApproved: profile.isApproved,
      rejectionReason: profile.rejectionReason ?? null,
      pendingStatus,
      hasPendingChanges: hasPendingEdit,
      isEditReview: hasPendingEdit,
      pendingRejectionReason: profile.pendingRejectionReason ?? null,
      currentApprovedProfile: hasPendingEdit
        ? {
            fullName: user.fullName,
            salonName: profile.salonName,
            activityType: profile.activityType ?? null,
            provinceName: profile.province?.name ?? null,
            cityName: profile.city?.name ?? null,
            address: profile.address,
            bio: profile.bio ?? null,
            profileImage: profile.profileImage ?? null,
            portfolioImages: profile.portfolioImages ?? [],
          }
        : null,
      rating: Number(profile.rating || 0),
      reviewCount: Number(profile.reviewCount || 0),
      createdAt: profile.createdAt,
      services: (user.services ?? [])
        .filter(service => service.isActive)
        .map(service => ({
          id: service.id,
          name: service.name,
          price: Number(service.price),
          depositPrice:
            service.depositPrice == null ? null : Number(service.depositPrice),
          durationMinutes: service.durationMinutes,
        })),
    };
  }

  /**
   * ویرایش پروفایل آرایشگر.
   *
   * اگر پروفایل قبلاً تایید شده باشد (`profile.isApproved === true`) و ویرایش
   * توسط خود آرایشگر انجام شود (`!options?.byAdmin`)، فیلدهای عمومی پروفایل در
   * `pendingChanges` ذخیره می‌شوند تا نسخهٔ قبلی همچنان برای عموم کاربران نمایش
   * داده شود و تنها پس از تایید ادمین جایگزین گردد.
   */
  async update(
    userId: number,
    dto: UpdateBarberDto,
    options?: { byAdmin?: boolean },
  ): Promise<BarberProfile> {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: { barberProfile: true },
    });
    if (!user) {
      throw new NotFoundException('کاربر یافت نشد');
    }

    const profile = user.barberProfile;
    if (!profile) {
      throw new NotFoundException('پروفایل آرایشگر یافت نشد');
    }

    if (
      dto.slotIntervalMinutes !== undefined &&
      !isAllowedSlotIntervalMinutes(dto.slotIntervalMinutes)
    ) {
      throw new BadRequestException(
        'بازه زمانی رزرو باید یکی از مقادیر ۱۵، ۳۰، ۴۵ یا ۶۰ دقیقه باشد',
      );
    }

    // نوع فعالیت هم مثل ثبت‌نام فقط می‌تواند یکی از سه مقدار استاندارد باشد؛
    // `null` پذیرفته نمی‌شود تا این فیلد عمومی هرگز خالی نماند.
    if (
      dto.activityType !== undefined &&
      !isActivityTypeValue(dto.activityType)
    ) {
      throw new BadRequestException(ACTIVITY_TYPE_ERROR_MESSAGE);
    }

    // اعتبارسنجی و ذخیره فیلدهای خصوصی User که نیازی به تایید نمایش عمومی ندارند
    let userChanged = false;
    if (dto.birthDate !== undefined) {
      user.birthDate = dto.birthDate ? new Date(dto.birthDate) : null;
      userChanged = true;
    }
    if (dto.nationalCode !== undefined) {
      if (dto.nationalCode) {
        const cleanNc = normalizeNationalCode(dto.nationalCode);
        if (!isValidIranianNationalCode(cleanNc)) {
          throw new BadRequestException('کد ملی وارد شده معتبر نیست');
        }
        const existing = await this.userRepo.findOne({
          where: { nationalCode: cleanNc },
        });
        if (existing && existing.id !== user.id) {
          throw new ConflictException(
            'این کد ملی قبلاً برای کاربر دیگری ثبت شده است',
          );
        }
        user.nationalCode = cleanNc;
      } else {
        user.nationalCode = null;
      }
      userChanged = true;
    }

    // فیلدهای عملیاتی زمان‌بندی که مستقیماً اعمال می‌شوند
    if (dto.workStartTime !== undefined) {
      profile.workStartTime = dto.workStartTime;
    }
    if (dto.workEndTime !== undefined) {
      profile.workEndTime = dto.workEndTime;
    }
    if (dto.slotIntervalMinutes !== undefined) {
      profile.slotIntervalMinutes = dto.slotIntervalMinutes;
    }

    const byAdmin = Boolean(options?.byAdmin);
    const hasModeratedFieldInDto =
      dto.fullName !== undefined ||
      dto.salonName !== undefined ||
      dto.activityType !== undefined ||
      dto.provinceId !== undefined ||
      dto.cityId !== undefined ||
      dto.address !== undefined ||
      dto.bio !== undefined ||
      dto.profileImage !== undefined;

    if (byAdmin || !profile.isApproved) {
      const filesToDeleteAfterSave: string[] = [];
      const unapprovedChangedFields: string[] = [];

      if (!byAdmin && !profile.isApproved) {
        if (
          dto.fullName &&
          dto.fullName.trim() !== (user.fullName ?? '').trim()
        ) {
          unapprovedChangedFields.push(BARBER_MODERATED_FIELD_LABELS.fullName);
        }
        if (
          dto.salonName !== undefined &&
          dto.salonName.trim() !== (profile.salonName ?? '').trim()
        ) {
          unapprovedChangedFields.push(BARBER_MODERATED_FIELD_LABELS.salonName);
        }
        if (
          dto.activityType !== undefined &&
          (dto.activityType ?? null) !== (profile.activityType ?? null)
        ) {
          unapprovedChangedFields.push(
            BARBER_MODERATED_FIELD_LABELS.activityType,
          );
        }
        if (
          dto.provinceId !== undefined &&
          (dto.provinceId ?? null) !== (profile.provinceId ?? null)
        ) {
          unapprovedChangedFields.push(
            BARBER_MODERATED_FIELD_LABELS.provinceId,
          );
        }
        if (
          dto.cityId !== undefined &&
          (dto.cityId ?? null) !== (profile.cityId ?? null)
        ) {
          unapprovedChangedFields.push(BARBER_MODERATED_FIELD_LABELS.cityId);
        }
        if (
          dto.address !== undefined &&
          dto.address.trim() !== (profile.address ?? '').trim()
        ) {
          unapprovedChangedFields.push(BARBER_MODERATED_FIELD_LABELS.address);
        }
        if (dto.bio !== undefined && (dto.bio ?? '') !== (profile.bio ?? '')) {
          unapprovedChangedFields.push(BARBER_MODERATED_FIELD_LABELS.bio);
        }
        if (
          dto.profileImage !== undefined &&
          (dto.profileImage ?? null) !== (profile.profileImage ?? null)
        ) {
          unapprovedChangedFields.push(
            BARBER_MODERATED_FIELD_LABELS.profileImage,
          );
        }
      }

      if (dto.fullName) {
        user.fullName = dto.fullName.trim();
        userChanged = true;
      }
      if (dto.salonName !== undefined) profile.salonName = dto.salonName;
      if (dto.activityType !== undefined) {
        profile.activityType = dto.activityType;
      }
      if (dto.provinceId !== undefined) {
        profile.provinceId = dto.provinceId ?? null;
      }
      if (dto.cityId !== undefined) {
        profile.cityId = dto.cityId ?? null;
      }
      if (dto.address !== undefined) profile.address = dto.address;
      if (dto.bio !== undefined) profile.bio = dto.bio ?? null;
      if (dto.profileImage !== undefined) {
        if (
          profile.profileImage &&
          profile.profileImage !== dto.profileImage &&
          profile.pendingChanges?.profileImage !== profile.profileImage
        ) {
          filesToDeleteAfterSave.push(profile.profileImage);
        }
        profile.profileImage = dto.profileImage ?? null;
      }

      if (!byAdmin && !profile.isApproved && hasModeratedFieldInDto) {
        profile.rejectionReason = null;
      }

      if (byAdmin && profile.pendingChanges) {
        const rePruned = this.prunePendingChanges(
          profile.pendingChanges,
          user,
          profile,
        );
        profile.pendingChanges = rePruned;
        if (!rePruned) {
          profile.pendingStatus = 'none';
          profile.pendingRejectionReason = null;
        }
      }

      if (userChanged) {
        await this.userRepo.save(user);
      }

      const saved = await this.profileRepository.save(profile);
      if (filesToDeleteAfterSave.length > 0) {
        this.filesService?.deleteFiles(filesToDeleteAfterSave);
      }
      if (!byAdmin && unapprovedChangedFields.length > 0) {
        void this.baleNotificationService?.notifyBarberProfileEdited?.({
          userId: user.id,
          changedFields: unapprovedChangedFields,
          isApprovedBarber: false,
        });
      }
      return saved;
    }

    // پروفایل قبلاً تایید شده و ویرایش توسط خود آرایشگر انجام شده است:
    // نسخهٔ تاییدشدهٔ فعلی دست‌نخورده می‌ماند تا نمایش عمومی قطع نشود.
    if (userChanged) {
      await this.userRepo.save(user);
    }

    if (!hasModeratedFieldInDto) {
      // فیلدهای عملیاتی (ساعت کاری/بازهٔ نوبت) بدون تایید اعمال می‌شوند و
      // بعضی از آن‌ها (بازهٔ نوبت) در صفحهٔ عمومی هم دیده می‌شوند.
      const savedProfile = await this.profileRepository.save(profile);
      this.notifyPublicProfileChanged(user.id, profile.slug);
      return savedProfile;
    }

    const previousPendingStatus: BarberPendingStatus =
      profile.pendingStatus || 'none';
    const previousDraft = profile.pendingChanges ?? {};
    const draft: BarberPendingChanges = { ...previousDraft };
    const supersededDraftFiles: string[] = [];

    if (dto.fullName !== undefined && dto.fullName.trim()) {
      draft.fullName = dto.fullName.trim();
    }
    if (dto.salonName !== undefined) {
      draft.salonName = dto.salonName;
    }
    if (dto.activityType !== undefined) {
      draft.activityType = dto.activityType;
    }
    if (dto.provinceId !== undefined) {
      draft.provinceId = dto.provinceId ?? null;
    }
    if (dto.cityId !== undefined) {
      draft.cityId = dto.cityId ?? null;
    }
    if (dto.address !== undefined) {
      draft.address = dto.address;
    }
    if (dto.bio !== undefined) {
      draft.bio = dto.bio ?? null;
    }
    if (dto.profileImage !== undefined) {
      if (
        previousDraft.profileImage &&
        previousDraft.profileImage !== dto.profileImage &&
        previousDraft.profileImage !== profile.profileImage
      ) {
        supersededDraftFiles.push(previousDraft.profileImage);
      }
      draft.profileImage = dto.profileImage ?? null;
    }

    const pruned = this.prunePendingChanges(draft, user, profile);
    const shouldNotifyBale = Boolean(
      pruned &&
      (previousPendingStatus !== 'pending' ||
        this.hasPendingDraftChanged(previousDraft, pruned)),
    );
    if (pruned) {
      profile.pendingChanges = pruned;
      profile.pendingStatus = 'pending';
      profile.pendingRejectionReason = null;
    } else {
      profile.pendingChanges = null;
      profile.pendingStatus = 'none';
      profile.pendingRejectionReason = null;
    }

    const saved = await this.profileRepository.save(profile);
    if (supersededDraftFiles.length > 0) {
      this.filesService?.deleteFiles(supersededDraftFiles);
    }
    if (shouldNotifyBale && pruned) {
      void this.baleNotificationService?.notifyBarberProfileEdited?.({
        userId: user.id,
        changedFields: getBarberChangedFieldLabels(pruned),
        isApprovedBarber: true,
      });
    }
    return saved;
  }

  async updatePortfolioImages(
    userId: number,
    portfolioImages: string[],
  ): Promise<BarberProfile> {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: { barberProfile: true },
    });
    const profile =
      user?.barberProfile ??
      (await this.profileRepository.findOne({ where: { userId } }));

    if (!profile) {
      throw new NotFoundException('پروفایل آرایشگر یافت نشد');
    }

    const liveImages = profile.portfolioImages ?? [];

    if (!profile.isApproved) {
      const portfolioChanged = !stringArraysEqual(portfolioImages, liveImages);
      const removedLive = liveImages.filter(
        image => !portfolioImages.includes(image),
      );
      profile.portfolioImages = portfolioImages;
      profile.rejectionReason = null;
      const saved = await this.profileRepository.save(profile);
      if (removedLive.length > 0) {
        this.filesService?.deleteFiles(removedLive);
      }
      if (portfolioChanged) {
        void this.baleNotificationService?.notifyBarberProfileEdited?.({
          userId,
          changedFields: [BARBER_MODERATED_FIELD_LABELS.portfolioImages],
          isApprovedBarber: false,
        });
      }
      return saved;
    }

    // برای آرایشگر تاییدشده، عکس‌های فعلی برای نمایش عمومی دست‌نخورده می‌مانند
    // و فقط عکس‌های پیش‌نویس قبلی که دیگر استفاده نمی‌شوند پاک می‌شوند.
    const previousPendingStatus: BarberPendingStatus =
      profile.pendingStatus || 'none';
    const previousDraft = profile.pendingChanges ?? {};
    const previousDraftImages = previousDraft.portfolioImages ?? [];
    const removedDraftOnly = previousDraftImages.filter(
      image => !portfolioImages.includes(image) && !liveImages.includes(image),
    );

    const draft: BarberPendingChanges = {
      ...previousDraft,
      portfolioImages,
    };

    const effectiveUser =
      user ?? ({ id: userId, fullName: '' } as unknown as User);
    const pruned = this.prunePendingChanges(draft, effectiveUser, profile);
    const shouldNotifyBale = Boolean(
      pruned &&
      (previousPendingStatus !== 'pending' ||
        this.hasPendingDraftChanged(previousDraft, pruned)),
    );

    if (pruned) {
      profile.pendingChanges = pruned;
      profile.pendingStatus = 'pending';
      profile.pendingRejectionReason = null;
    } else {
      profile.pendingChanges = null;
      profile.pendingStatus = 'none';
      profile.pendingRejectionReason = null;
    }

    const saved = await this.profileRepository.save(profile);
    if (removedDraftOnly.length > 0) {
      this.filesService?.deleteFiles(removedDraftOnly);
    }

    if (shouldNotifyBale && pruned) {
      void this.baleNotificationService?.notifyBarberProfileEdited?.({
        userId,
        changedFields: getBarberChangedFieldLabels(pruned),
        isApprovedBarber: true,
      });
    }

    return {
      ...saved,
      portfolioImages,
    };
  }

  remove(id: number) {
    return `This action removes a #${id} barber`;
  }

  async reviewBarber(
    idOrUserId: number | string,
    dto: ReviewBarberDto,
  ): Promise<any> {
    const normalizedId =
      typeof idOrUserId === 'string'
        ? toEnglishDigits(idOrUserId.trim())
        : String(idOrUserId);
    const numericUserId = Number(normalizedId);

    let resolvedUserId = numericUserId;
    if (!Number.isInteger(numericUserId) || numericUserId < 1) {
      const profileByUuid = await this.profileRepository.findOne({
        where: { id: normalizedId },
      });
      if (!profileByUuid) {
        throw new NotFoundException('پروفایل آرایشگر برای این کاربر یافت نشد');
      }
      resolvedUserId = profileByUuid.userId;
    }

    // چون id دریافتی از فرانت User.id است
    const user = await this.userRepo.findOne({
      where: {
        id: resolvedUserId,
      },
      relations: {
        barberProfile: {
          province: true,
          city: true,
        },
      },
    });

    if (!user) {
      throw new NotFoundException('کاربر مورد نظر یافت نشد');
    }

    // بررسی اینکه کاربر واقعاً آرایشگر است
    if (!user.roles?.includes(Role.Barber)) {
      throw new BadRequestException('کاربر مورد نظر آرایشگر نیست');
    }

    const barber = user.barberProfile;

    if (!barber) {
      throw new NotFoundException('پروفایل آرایشگر برای این کاربر یافت نشد');
    }

    const wasApproved = Boolean(barber.isApproved);
    const hasPendingToApply = Boolean(
      barber.pendingChanges && barber.pendingStatus === 'pending',
    );
    const filesToDeleteAfterSave: string[] = [];

    // تایید پروفایل (ثبت‌نام اولیه یا ویرایش پروفایل)
    if (dto.isApproved === true) {
      if (hasPendingToApply && barber.pendingChanges) {
        const pending = barber.pendingChanges;

        if (pending.fullName !== undefined && pending.fullName.trim()) {
          user.fullName = pending.fullName.trim();
          await this.userRepo.save(user);
        }

        if (pending.salonName !== undefined) {
          barber.salonName = pending.salonName;
        }

        if (pending.activityType !== undefined) {
          barber.activityType = pending.activityType ?? null;
        }

        if ('provinceId' in pending) {
          barber.provinceId = pending.provinceId ?? null;
          barber.province = (pending.provinceId
            ? { id: pending.provinceId }
            : null) as unknown as Province;
        }

        if ('cityId' in pending) {
          barber.cityId = pending.cityId ?? null;
          barber.city = (pending.cityId
            ? { id: pending.cityId }
            : null) as unknown as City;
        }

        if (pending.address !== undefined) {
          barber.address = pending.address;
        }

        if (pending.bio !== undefined) {
          barber.bio = pending.bio ?? null;
        }

        if (pending.profileImage !== undefined) {
          if (
            barber.profileImage &&
            barber.profileImage !== pending.profileImage
          ) {
            filesToDeleteAfterSave.push(barber.profileImage);
          }
          barber.profileImage = pending.profileImage ?? null;
        }

        if (pending.portfolioImages !== undefined) {
          const oldImages = barber.portfolioImages ?? [];
          for (const oldImage of oldImages) {
            if (!pending.portfolioImages.includes(oldImage)) {
              filesToDeleteAfterSave.push(oldImage);
            }
          }
          barber.portfolioImages = pending.portfolioImages;
        }
      }

      barber.isApproved = true;
      barber.rejectionReason = null;
      barber.pendingChanges = null;
      barber.pendingStatus = 'none';
      barber.pendingRejectionReason = null;
    } else {
      // رد پروفایل یا رد تغییرات جدید
      const reason = dto.rejectionReason?.trim();

      if (!reason) {
        throw new BadRequestException(
          'برای رد کردن پروفایل، وارد کردن دلیل الزامی است',
        );
      }

      if (wasApproved) {
        // آرایشگر از قبل تایید شده است: پروفایل قبلی همچنان برای همه فعال می‌ماند
        // و فقط وضعیت ویرایش جدید به «رد شده» تغییر می‌کند.
        barber.isApproved = true;
        barber.rejectionReason = null;
        barber.pendingStatus = 'rejected';
        barber.pendingRejectionReason = reason;
      } else {
        barber.isApproved = false;
        barber.rejectionReason = reason;
        barber.pendingStatus = 'none';
        barber.pendingRejectionReason = null;
      }
    }

    const updatedBarber = await this.profileRepository.save(barber);

    if (filesToDeleteAfterSave.length > 0) {
      this.filesService?.deleteFiles(filesToDeleteAfterSave);
    }

    // تایید ادمین (ثبت‌نام اولیه یا اعمال ویرایشِ در انتظار) دادهٔ عمومی را
    // عوض می‌کند؛ کشِ صفحه‌های عمومی فرانت باید همان لحظه تازه شود تا نه
    // اطلاعات قدیمی دیده شود و نه صفحهٔ آرایشگرِ تازه‌تاییدشده ۴۰۴ بماند.
    if (dto.isApproved === true) {
      this.notifyPublicProfileChanged(user.id, updatedBarber.slug);
    }

    // ارسال پیامک تایید پروفایل با قالب 172833 در صورت تایید ثبت‌نام یا تایید ویرایش
    if (dto.isApproved === true && (!wasApproved || hasPendingToApply)) {
      await this.bookingSmsService?.sendBarberProfileApprovedToBarber(
        user.phone,
        { barberName: user.fullName },
      );
    }

    return {
      status: 200,
      message: dto.isApproved
        ? 'پروفایل آرایشگر با موفقیت تایید شد'
        : wasApproved
          ? 'تغییرات جدید پروفایل رد شد؛ نسخهٔ قبلی پروفایل همچنان برای کاربران فعال است'
          : 'پروفایل آرایشگر رد شد',
      data: {
        id: user.id,
        fullName: user.fullName,
        salonName: updatedBarber.salonName,
        isApproved: updatedBarber.isApproved,
        rejectionReason: updatedBarber.rejectionReason,
        pendingStatus: updatedBarber.pendingStatus,
        pendingRejectionReason: updatedBarber.pendingRejectionReason,
      },
    };
  }
}
