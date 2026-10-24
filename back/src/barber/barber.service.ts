import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Role } from 'src/common/enum/role.enum';
import { getPagination, QueryDto } from 'src/common/query';
import {
  isValidIranianNationalCode,
  normalizeNationalCode,
} from 'src/common/utils/national-code.util';
import { City } from 'src/locations/entities/city.entity';
import { Service } from 'src/services/entities/service.entity';
import { User } from 'src/users/entities/user.entity';
import { Brackets, EntityManager, Repository } from 'typeorm';

import { ReviewBarberDto } from './dto/review-barber.dto';
import { UpdateBarberDto } from './dto/update-barber.dto';
import { BarberProfile } from './entities/barber.entity';

@Injectable()
export class BarberService {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,

    @InjectRepository(BarberProfile)
    private profileRepository: Repository<BarberProfile>,

    @InjectRepository(City)
    private cityRepository: Repository<City>,
  ) {}

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
      qb.andWhere('profile.isApproved != :isApproved', {
        isApproved: true,
      });
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

    if (query.search) {
      qb.andWhere(
        new Brackets(qb => {
          qb.where('user.fullName LIKE :search')
            .orWhere('profile.salonName LIKE :search')
            .orWhere('services.name LIKE :search');
        }),
        { search: `%${query.search}%` },
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

    // نگاشت به فرمت دلخواه همراه با محاسبه قیمت شروع
    const data = rawData.map((user: any) => {
      const services = user.services || [];
      const prices = services
        .map((s: any) => Number(s.price))
        .filter((p: number) => Number.isFinite(p) && p >= 0);
      const minPrice = prices.length > 0 ? Math.min(...prices) : null;

      return {
        id: user.id,
        salonName: user.barberProfile?.salonName || '',
        profileImage: user.barberProfile?.profileImage || null,
        activityType: user.barberProfile?.activityType || null,
        cityName: user.barberProfile?.city?.name || null,
        citySlug: user.barberProfile?.city?.slug || null,
        provinceName: user.barberProfile?.province?.name || null,
        minPrice,
        rating: Number(user.barberProfile?.rating || 0),
        reviewCount: Number(user.barberProfile?.reviewCount || 0),
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
      salonName: profile.salonName,
      activityType: profile.activityType,
      profileImage: profile.profileImage,
      image: profile.profileImage,
      address: profile.address,
      bio: profile.bio,
      rating: Number(profile.rating || 0),
      reviewCount: Number(profile.reviewCount || 0),
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

    return {
      id: user.id,
      fullName: user.fullName,
      phone: user.phone,
      email: user.email,
      birthDate: user.birthDate || null,
      salonName: profile.salonName,
      provinceId: profile.provinceId,
      cityId: profile.cityId,
      provinceName: profile.province?.name || null,
      cityName: profile.city?.name || null,
      address: profile.address,
      bio: profile.bio,
      profileImage: profile.profileImage,
      portfolioImages: profile.portfolioImages || [],
      workStartTime: profile.workStartTime,
      workEndTime: profile.workEndTime,
      isApproved: profile.isApproved,
      rejectionReason: profile.rejectionReason || null,
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

    return this.update(profile.userId, dto);
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

    return {
      id: user.id,
      barberProfileId: profile.id,
      fullName: user.fullName,
      phone: user.phone ?? null,
      email: user.email ?? null,
      nationalCode: user.nationalCode ?? null,
      birthDate: user.birthDate ?? null,
      isActive: user.isActive,
      salonName: profile.salonName,
      activityType: profile.activityType,
      province: profile.province ?? null,
      provinceId: profile.provinceId ?? null,
      city: profile.city ?? null,
      cityId: profile.cityId ?? null,
      address: profile.address,
      bio: profile.bio ?? null,
      profileImage: profile.profileImage ?? null,
      portfolioImages: profile.portfolioImages ?? [],
      workStartTime: profile.workStartTime ?? null,
      workEndTime: profile.workEndTime ?? null,
      isApproved: profile.isApproved,
      rejectionReason: profile.rejectionReason ?? null,
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

  // متد update اصلاح‌شده برای پشتیبانی از فیلدهای جدید
  async update(userId: number, dto: UpdateBarberDto): Promise<BarberProfile> {
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

    // به‌روزرسانی فیلدهای User
    if (dto.fullName) {
      user.fullName = dto.fullName;
    }
    if (dto.birthDate !== undefined) {
      user.birthDate = dto.birthDate ? new Date(dto.birthDate) : null;
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
    }
    await this.userRepo.save(user);

    // به‌روزرسانی فیلدهای BarberProfile
    const updateData: Partial<BarberProfile> = {};
    if (dto.salonName !== undefined) updateData.salonName = dto.salonName;
    if (dto.provinceId !== undefined) updateData.provinceId = dto.provinceId;
    if (dto.cityId !== undefined) updateData.cityId = dto.cityId;
    if (dto.address !== undefined) updateData.address = dto.address;
    if (dto.bio !== undefined) updateData.bio = dto.bio;
    if (dto.workStartTime !== undefined)
      updateData.workStartTime = dto.workStartTime;
    if (dto.workEndTime !== undefined) updateData.workEndTime = dto.workEndTime;
    if (dto.profileImage !== undefined)
      updateData.profileImage = dto.profileImage;
    // وضعیت تایید فقط از مسیر ادمین (reviewBarber) تغییر می‌کند.

    Object.assign(profile, updateData);
    return this.profileRepository.save(profile);
  }

  async updatePortfolioImages(
    userId: number,
    portfolioImages: string[],
  ): Promise<BarberProfile> {
    const profile = await this.profileRepository.findOne({
      where: { userId },
    });
    if (!profile) {
      throw new NotFoundException('پروفایل آرایشگر یافت نشد');
    }

    profile.portfolioImages = portfolioImages;
    return this.profileRepository.save(profile);
  }

  remove(id: number) {
    return `This action removes a #${id} barber`;
  }

  async reviewBarber(userId: number, dto: ReviewBarberDto): Promise<any> {
    // چون id دریافتی از فرانت User.id است
    const user = await this.userRepo.findOne({
      where: {
        id: userId,
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

    // تایید پروفایل
    if (dto.isApproved === true) {
      barber.isApproved = true;
      barber.rejectionReason = null;
    }

    // رد پروفایل
    else {
      const reason = dto.rejectionReason?.trim();

      if (!reason) {
        throw new BadRequestException(
          'برای رد کردن پروفایل، وارد کردن دلیل الزامی است',
        );
      }

      barber.isApproved = false;
      barber.rejectionReason = reason;
    }

    const updatedBarber = await this.profileRepository.save(barber);

    return {
      status: 200,
      message: dto.isApproved
        ? 'پروفایل آرایشگر با موفقیت تایید شد'
        : 'پروفایل آرایشگر رد شد',
      data: {
        id: user.id,
        fullName: user.fullName,
        salonName: updatedBarber.salonName,
        isApproved: updatedBarber.isApproved,
        rejectionReason: updatedBarber.rejectionReason,
      },
    };
  }
}
