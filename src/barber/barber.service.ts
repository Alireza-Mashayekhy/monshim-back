import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Role } from 'src/common/enum/role.enum';
import { getPagination, QueryDto } from 'src/common/query';
import { User } from 'src/users/entities/user.entity';
import { Brackets, Repository } from 'typeorm';

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
  ) {}

  // src/barber/barber.service.ts
  async create(data: {
    userId: number;
    salonName: string;
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
  }) {
    // تولید کد معرف یکتا
    const referralCode = await this.generateUniqueReferralCode();

    const profile = this.profileRepository.create({
      ...data,
      referralCode,
      referredBy: data.referredBy || null,
    });
    return this.profileRepository.save(profile);
  }

  // تولید کد معرف یکتا (۸ کاراکتر)
  private async generateUniqueReferralCode(): Promise<string> {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code: string;
    let isUnique = false;

    while (!isUnique) {
      code = '';
      for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      // بررسی یکتا بودن کد
      const existing = await this.profileRepository.findOne({
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
    },
    notApproved?: boolean,
  ) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const qb = this.userRepo.createQueryBuilder('user');

    qb.where('user.roles LIKE :role', { role: '%Barber%' });

    // JOIN با پروفایل، شهر و استان
    qb.leftJoinAndSelect('user.barberProfile', 'profile')
      .leftJoinAndSelect('profile.city', 'city')
      .leftJoinAndSelect('profile.province', 'province');

    if (notApproved) {
      qb.andWhere('profile.isApproved != :isApproved', {
        isApproved: true,
      });
    } else {
      qb.andWhere('profile.isApproved = :isApproved', {
        isApproved: true,
      });
    }

    if (filters?.cityId) {
      qb.andWhere('profile.cityId = :cityId', { cityId: filters.cityId });
    }

    if (query.search) {
      qb.leftJoin('user.services', 'service');
      qb.andWhere(
        new Brackets(qb => {
          qb.where('user.fullName LIKE :search')
            .orWhere('profile.salonName LIKE :search')
            .orWhere('service.name LIKE :search');
        }),
        { search: `%${query.search}%` },
      );
    }

    // (اختیاری) انتخاب فقط فیلدهای مورد نیاز برای کاهش حجم
    qb.select([
      'user.id',
      'user.fullName',
      'profile.id',
      'profile.salonName',
      'profile.profileImage',
      'city.name',
      'province.name',
    ]);

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
        case 'createdAt':
          qb.orderBy('user.createdAt', direction);
          break;
        default:
          qb.orderBy('user.id', direction);
      }
    }

    const { skip, take } = getPagination(page, limit);
    qb.skip(skip).take(take);

    const [rawData, total] = await qb.getManyAndCount();

    // نگاشت به فرمت دلخواه
    const data = rawData.map((user: any) => ({
      id: user.id,
      fullName: user.fullName,
      salonName: user.barberProfile?.salonName || '',
      profileImage: user.barberProfile?.profileImage || null,
      cityName: user.barberProfile?.city?.name || null,
      provinceName: user.barberProfile?.province?.name || null,
    }));

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

  async findOne(id: number): Promise<any> {
    // استفاده از QueryBuilder برای دریافت داده‌های مرتبط
    const qb = this.userRepo.createQueryBuilder('user');

    qb.where('user.id = :id', { id })
      .andWhere('user.roles LIKE :role', { role: '%Barber%' })
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
    if (dto.isApproved !== undefined) updateData.isApproved = dto.isApproved;
    if (dto.rejectionReason !== undefined) {
      updateData.rejectionReason = dto.rejectionReason;
    }

    Object.assign(profile, updateData);
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
