import { NotFoundException } from '@nestjs/common';
import { Role } from 'src/common/enum/role.enum';

import { BarberService } from './barber.service';

describe('BarberService.findApprovalDetail', () => {
  const profile = {
    id: 'b7a1f0c4-1f2e-4f4a-9d1b-111111111111',
    userId: 21,
    salonName: 'سالن نمونه',
    activityType: 'men',
    provinceId: 1,
    cityId: 2,
    address: 'تهران، خیابان نمونه',
    bio: null,
    profileImage: '/uploads/profiles/a.jpg',
    portfolioImages: ['/uploads/portfolio/1.jpg'],
    workStartTime: '09:00:00',
    workEndTime: '21:00:00',
    isApproved: false,
    rejectionReason: 'اطلاعات ناقص',
    rating: 0,
    reviewCount: 0,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    city: { id: 2, name: 'تهران' },
    province: { id: 1, name: 'تهران' },
  };

  const user = {
    id: 21,
    fullName: 'علی رضایی',
    phone: '09121112233',
    email: null,
    nationalCode: '0012345678',
    birthDate: null,
    isActive: true,
    // رمز عبور نباید در پاسخ مسیر ادمین دیده شود
    password: 'hashed',
    roles: [Role.User, Role.Barber],
    services: [
      {
        id: 'svc-1',
        name: 'کوتاهی مو',
        price: '150000.00',
        depositPrice: null,
        durationMinutes: 30,
        isActive: true,
      },
      {
        id: 'svc-2',
        name: 'خدمت غیرفعال',
        price: '100000.00',
        depositPrice: null,
        durationMinutes: 15,
        isActive: false,
      },
    ],
  };

  function buildSetup(options: {
    profile?: Record<string, any> | null;
    user?: Record<string, any> | null;
  }) {
    const userRepo: any = {
      findOne: jest.fn().mockResolvedValue(options.user ?? null),
    };
    const profileRepo: any = {
      findOne: jest.fn().mockResolvedValue(options.profile ?? null),
    };
    const cityRepo: any = {};

    const service = new BarberService(userRepo, profileRepo, cityRepo);

    return { service, userRepo, profileRepo };
  }

  it('شناسهٔ عددی (User.id) را می‌پذیرد، چون لیست تایید همین شناسه را برمی‌گرداند', async () => {
    const { service, profileRepo } = buildSetup({ profile, user });

    const result = await service.findApprovalDetail('21');

    expect(profileRepo.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 21 } }),
    );
    expect(result.id).toBe(21);
    expect(result.barberProfileId).toBe(profile.id);
    expect(result.fullName).toBe('علی رضایی');
    expect(result.salonName).toBe('سالن نمونه');
    expect(result.isApproved).toBe(false);
    expect(result.rejectionReason).toBe('اطلاعات ناقص');
    expect(result.portfolioImages).toEqual(['/uploads/portfolio/1.jpg']);
    expect(result.services).toEqual([
      {
        id: 'svc-1',
        name: 'کوتاهی مو',
        price: 150000,
        depositPrice: null,
        durationMinutes: 30,
      },
    ]);
  });

  it('uuid پروفایل را هم پشتیبانی می‌کند', async () => {
    const { service, profileRepo } = buildSetup({ profile, user });

    const result = await service.findApprovalDetail(profile.id);

    expect(profileRepo.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: profile.id } }),
    );
    expect(result.id).toBe(21);
  });

  it('هیچ فیلد حساسی (رمز عبور و…) برنمی‌گرداند', async () => {
    const { service } = buildSetup({ profile, user });

    const result = await service.findApprovalDetail('21');

    expect(result).not.toHaveProperty('password');
    expect(result).not.toHaveProperty('refreshToken');
  });

  it('اگر پروفایلی وجود نداشته باشد ۴۰۴ می‌دهد', async () => {
    const { service } = buildSetup({ profile: null, user: null });

    await expect(service.findApprovalDetail('21')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('اگر کاربر آرایشگر نباشد ۴۰۴ می‌دهد', async () => {
    const { service } = buildSetup({
      profile,
      user: { ...user, roles: [Role.User] },
    });

    await expect(service.findApprovalDetail('21')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
