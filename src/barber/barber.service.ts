import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { getPagination, QueryDto } from 'src/common/query';
import { User } from 'src/users/entities/user.entity';
import { Brackets, Repository } from 'typeorm';

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
  }) {
    const profile = this.profileRepository.create(data);
    return this.profileRepository.save(profile);
  }

  async findAll(
    query: QueryDto,
    filters?: {
      cityId?: number;
    },
  ) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const qb = this.userRepo.createQueryBuilder('user');

    qb.where('user.roles LIKE :role', { role: '%Barber%' });

    // JOIN با پروفایل، شهر و استان
    qb.leftJoinAndSelect('user.barberProfile', 'profile')
      .leftJoinAndSelect('profile.city', 'city')
      .leftJoinAndSelect('profile.province', 'province');

    qb.andWhere('profile.isApproved = :isApproved', {
      isApproved: true,
    });

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
      id: user.id,
      name: user.fullName,
      shopName: profile.salonName,
      image: profile.profileImage || null,
      address: profile.address,
      bio: profile.bio || '',
      rating: 4.8, // در صورت وجود فیلد امتیاز، از آن استفاده کنید
      reviewCount: 0, // در صورت وجود جدول نظرات
      services:
        user.services?.map(service => ({
          id: service.id,
          name: service.name,
          price: service.price,
          durationMinutes: service.durationMinutes,
        })) || [],
      portfolio: profile.portfolioImages || [],
      city: profile.city?.name || null,
      province: profile.province?.name || null,
    };
  }

  update(id: number, updateBarberDto: UpdateBarberDto) {
    return `This action updates a #${id} barber`;
  }

  remove(id: number) {
    return `This action removes a #${id} barber`;
  }
}
