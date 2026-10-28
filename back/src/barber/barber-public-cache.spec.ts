import { Role } from 'src/common/enum/role.enum';
import { User } from 'src/users/entities/user.entity';

import { BarberService } from './barber.service';
import { BarberProfile } from './entities/barber.entity';

/**
 * باگ واقعی: بعد از تایید ادمین، رکورد در دیتابیس عوض می‌شد اما صفحهٔ عمومی
 * (`/barber/[slug]`) با ISR پویا تا ۵ دقیقه نسخهٔ قبلی — یا برای آرایشگرِ
 * تازه‌تاییدشده ۴۰۴ — را نشان می‌داد. بک‌اند باید بعد از تایید/ویرایش ادمین،
 * پاک‌سازیِ on-demand کشِ فرانت را اعلام کند.
 */
describe('BarberService — اطلاع‌رسانی تغییر پروفایل عمومی به فرانت', () => {
  function buildHarness(
    options: { isApproved?: boolean; pending?: boolean } = {},
  ) {
    const profile = {
      id: 'b7a1f0c4-1f2e-4f4a-9d1b-111111111111',
      userId: 42,
      salonName: 'سالن تاییدشده',
      slug: 'salon-approved',
      provinceId: 1,
      cityId: 2,
      address: 'تهران، خیابان نمونه',
      bio: null,
      profileImage: '/uploads/profiles/a.jpg',
      portfolioImages: [],
      workStartTime: '09:00:00',
      workEndTime: '21:00:00',
      slotIntervalMinutes: 30,
      isApproved: options.isApproved ?? true,
      rejectionReason: null,
      pendingStatus: options.pending ? 'pending' : 'none',
      pendingRejectionReason: null,
      pendingChanges: options.pending
        ? { salonName: 'سالن با نام جدید', fullName: 'نام جدید' }
        : null,
    } as unknown as BarberProfile;

    const user = {
      id: 42,
      fullName: 'علی رضایی',
      phone: '09121234567',
      isActive: true,
      roles: [Role.Barber],
      barberProfile: profile,
      services: [],
    } as unknown as User;

    const userRepo = {
      findOne: jest.fn().mockResolvedValue(user),
      save: jest.fn((entity: User) => Promise.resolve(entity)),
      createQueryBuilder: jest.fn(),
    };

    const profileRepo = {
      findOne: jest.fn().mockResolvedValue(profile),
      save: jest.fn((entity: BarberProfile) => Promise.resolve(entity)),
      query: jest.fn(),
      metadata: { tableName: 'barber_profile' },
    };

    const frontendRevalidationService = {
      notifyBarberProfileChanged: jest.fn(),
    };

    const service = new BarberService(
      userRepo as any,
      profileRepo as any,
      {} as any,
      undefined,
      undefined,
      undefined,
      undefined,
      frontendRevalidationService as any,
    );

    return { service, profile, user, frontendRevalidationService, profileRepo };
  }

  it('تایید ادمین، هم شناسهٔ کاربر و هم اسلاگ صفحهٔ عمومی را برای پاک‌سازی کش اعلام می‌کند', async () => {
    const { service, frontendRevalidationService } = buildHarness({
      isApproved: false,
      pending: false,
    });

    await service.reviewBarber(42, { isApproved: true });

    expect(
      frontendRevalidationService.notifyBarberProfileChanged,
    ).toHaveBeenCalledTimes(1);
    expect(
      frontendRevalidationService.notifyBarberProfileChanged,
    ).toHaveBeenCalledWith({ userId: 42, slugs: ['salon-approved'] });
  });

  it('تایید ویرایشِ در انتظار هم کش صفحهٔ عمومی را تازه می‌کند', async () => {
    const { service, profile, frontendRevalidationService } = buildHarness({
      isApproved: true,
      pending: true,
    });

    await service.reviewBarber('42', { isApproved: true });

    expect(profile.pendingChanges).toBeNull();
    expect(profile.salonName).toBe('سالن با نام جدید');
    expect(
      frontendRevalidationService.notifyBarberProfileChanged,
    ).toHaveBeenCalledWith({ userId: 42, slugs: ['salon-approved'] });
  });

  it('رد کردن پروفایل/ویرایش هیچ تغییری در صفحهٔ عمومی ایجاد نمی‌کند و کش را پاک نمی‌کند', async () => {
    const { service, frontendRevalidationService } = buildHarness({
      isApproved: false,
    });

    await service.reviewBarber(42, {
      isApproved: false,
      rejectionReason: 'اطلاعات ناقص است',
    });

    expect(
      frontendRevalidationService.notifyBarberProfileChanged,
    ).not.toHaveBeenCalled();
  });

  it('ویرایش مستقیم ادمین (بدون جریان pending) هم باعث تازه‌شدن کش می‌شود', async () => {
    const { service, profile, frontendRevalidationService } = buildHarness({
      isApproved: true,
    });

    await service.updateByProfileId(profile.id, {
      salonName: 'نام ویرایش‌شده توسط ادمین',
    });

    expect(profile.salonName).toBe('نام ویرایش‌شده توسط ادمین');
    expect(
      frontendRevalidationService.notifyBarberProfileChanged,
    ).toHaveBeenCalledWith({ userId: 42, slugs: ['salon-approved'] });
  });

  it('تغییر بازهٔ نوبت (فیلد عمومیِ بدون نیاز به تایید) هم کش را تازه می‌کند', async () => {
    const { service, frontendRevalidationService } = buildHarness({
      isApproved: true,
    });

    await service.update(42, { slotIntervalMinutes: 45 });

    expect(
      frontendRevalidationService.notifyBarberProfileChanged,
    ).toHaveBeenCalledWith({ userId: 42, slugs: ['salon-approved'] });
  });
});
