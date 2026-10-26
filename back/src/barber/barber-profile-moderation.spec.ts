import { BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { Booking } from '../booking/entities/booking.entity';
import { Role } from '../common/enum/role.enum';
import { FilesService } from '../files/files.service';
import { City } from '../locations/entities/city.entity';
import { Province } from '../locations/entities/province.entity';
import { BookingSmsService } from '../notification/booking-sms.service';
import { SMS_TEMPLATES } from '../notification/sms-templates';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { BarberAdminController } from './barber.admin.controller';
import { BarberController } from './barber.controller';
import { BarberService } from './barber.service';
import { BarberReviewService } from './barber-review.service';
import { BarberProfile } from './entities/barber.entity';
import { BarberReview } from './entities/barber-review.entity';
import { BarberWorkHours } from './entities/barber-work-hours.entity';
import { WorkHoursService } from './work-hours.service';

describe('Barber profile approval SMS (172833) & non-disruptive profile editing', () => {
  const tehranProvince = {
    id: 1,
    name: 'تهران',
    slug: 'tehran',
    telPrefix: '021',
    location: null,
    cities: [],
  } as unknown as Province;
  const alborzProvince = {
    id: 2,
    name: 'البرز',
    slug: 'alborz',
    telPrefix: '026',
    location: null,
    cities: [],
  } as unknown as Province;
  const tehranCity = {
    id: 10,
    name: 'تهران',
    slug: 'tehran',
    provinceId: 1,
    location: null,
    province: tehranProvince,
  } as unknown as City;
  const karajCity = {
    id: 20,
    name: 'کرج',
    slug: 'karaj',
    provinceId: 2,
    location: null,
    province: alborzProvince,
  } as unknown as City;

  function createHarness(initialApproved = false) {
    const profile: BarberProfile = {
      id: '11111111-2222-3333-4444-555555555555',
      userId: 42,
      salonName: 'پیرایش کلاسیک',
      activityType: 'آرایشگاه مردانه',
      provinceId: 1,
      province: tehranProvince,
      cityId: 10,
      city: tehranCity,
      address: 'تهران، خیابان ولیعصر، پلاک ۱۰',
      bio: 'بیوگرافی تاییدشده اولیه',
      profileImage: '/uploads/profiles/live-avatar.webp',
      portfolioImages: [
        '/uploads/portfolio/live-1.webp',
        '/uploads/portfolio/live-2.webp',
      ],
      workStartTime: '09:00',
      workEndTime: '21:00',
      slotIntervalMinutes: 30,
      isApproved: initialApproved,
      rejectionReason: null,
      pendingChanges: null,
      pendingStatus: 'none',
      pendingRejectionReason: null,
      rating: 4.9,
      reviewCount: 15,
      referralCode: 'REF42',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    } as unknown as BarberProfile;

    const user: User = {
      id: 42,
      fullName: 'علی رضایی',
      phone: '09121234567',
      email: 'ali@example.com',
      nationalCode: null,
      birthDate: null,
      isActive: true,
      roles: [Role.Barber],
      barberProfile: profile,
      services: [
        {
          id: 1,
          name: 'اصلاح مو',
          price: 250000,
          depositPrice: null,
          durationMinutes: 30,
          isActive: true,
          sortOrder: 0,
        },
      ],
    } as unknown as User;
    profile.user = user;

    const citiesById = new Map<number, City>([
      [10, tehranCity],
      [20, karajCity],
    ]);
    const provincesById = new Map<number, Province>([
      [1, tehranProvince],
      [2, alborzProvince],
    ]);

    const syncRelations = () => {
      profile.city = (profile.cityId
        ? (citiesById.get(profile.cityId) ?? null)
        : null) as unknown as City | undefined;
      profile.province = (profile.provinceId
        ? (provincesById.get(profile.provinceId) ?? null)
        : null) as unknown as Province | undefined;
    };

    const makeSubQb = () => {
      const sub: any = {
        select: jest.fn().mockReturnThis(),
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getQuery: jest.fn(() => '(SELECT 1)'),
      };
      return sub;
    };

    const makePublicQb = () => {
      let mode: 'publicList' | 'adminQueue' | 'publicOne' = 'publicList';
      const qb: any = {
        subQuery: jest.fn(() => makeSubQb()),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn((clause: any, params?: any) => {
          if (
            typeof clause === 'string' &&
            clause.includes('services.id IS NOT NULL')
          ) {
            mode = 'publicList';
          } else if (typeof clause === 'function' || clause?.whereFactory) {
            mode = 'adminQueue';
          } else if (
            params &&
            'isApproved' in params &&
            clause.includes('profile.isApproved = :isApproved')
          ) {
            mode = 'publicOne';
          }
          return qb;
        }),
        orWhere: jest.fn().mockReturnThis(),
        innerJoinAndSelect: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getOne: jest.fn(() => {
          syncRelations();
          return Promise.resolve(
            profile.isApproved && user.isActive ? user : null,
          );
        }),
        getManyAndCount: jest.fn(() => {
          syncRelations();
          if (mode === 'adminQueue') {
            const matches =
              !profile.isApproved || profile.pendingStatus === 'pending';
            return Promise.resolve(matches ? [[user], 1] : [[], 0]);
          }
          const matches = Boolean(profile.isApproved && user.isActive);
          return Promise.resolve(matches ? [[user], 1] : [[], 0]);
        }),
      };
      return qb;
    };

    const userRepo = {
      findOne: jest.fn(({ where }: any) => {
        if (where?.nationalCode) {
          return Promise.resolve(
            user.nationalCode === where.nationalCode ? user : null,
          );
        }
        if (where?.id === user.id) {
          syncRelations();
          return Promise.resolve(user);
        }
        return Promise.resolve(null);
      }),
      save: jest.fn((entity: User) => {
        Object.assign(user, entity);
        return Promise.resolve(user);
      }),
      createQueryBuilder: jest.fn(() => makePublicQb()),
    } as unknown as ConstructorParameters<typeof BarberService>[0];

    const profileQueryMock = jest.fn(() =>
      Promise.resolve([
        { COLUMN_NAME: 'pending_changes' },
        { COLUMN_NAME: 'pending_status' },
        { COLUMN_NAME: 'pending_rejection_reason' },
      ]),
    );

    const profileRepo = {
      metadata: { tableName: 'barber_profile' },
      query: profileQueryMock,
      findOne: jest.fn(({ where }: any) => {
        syncRelations();
        if (where?.userId === user.id || where?.id === profile.id) {
          return Promise.resolve(profile);
        }
        return Promise.resolve(null);
      }),
      save: jest.fn((entity: BarberProfile) => {
        // شبیه‌سازی دقیق رفتار TypeORM زمانی که relation بارگذاری شده روی FK اولویت دارد
        if (entity.province && 'id' in entity.province) {
          entity.provinceId = entity.province.id;
        } else if (entity.province === null) {
          entity.provinceId = null;
        }
        if (entity.city && 'id' in entity.city) {
          entity.cityId = entity.city.id;
        } else if (entity.city === null) {
          entity.cityId = null;
        }
        Object.assign(profile, entity);
        syncRelations();
        return Promise.resolve(profile);
      }),
    } as unknown as ConstructorParameters<typeof BarberService>[1];

    const cityRepo = {
      findOne: jest.fn(({ where }: any) =>
        Promise.resolve(citiesById.get(where?.id) ?? null),
      ),
      find: jest.fn(() => Promise.resolve(Array.from(citiesById.values()))),
    } as unknown as ConstructorParameters<typeof BarberService>[2];

    const provinceRepo = {
      findOne: jest.fn(({ where }: any) =>
        Promise.resolve(provincesById.get(where?.id) ?? null),
      ),
      find: jest.fn(() => Promise.resolve(Array.from(provincesById.values()))),
    } as unknown as ConstructorParameters<typeof BarberService>[3];

    const smsIrService = {
      sendTemplate: jest.fn().mockResolvedValue({ status: 1 }),
    };
    const bookingSmsService = new BookingSmsService(smsIrService as any);

    const filesService = {
      saveFile: jest.fn((_file: any, folder: string) =>
        Promise.resolve(
          `/uploads/${folder}/uploaded-${Math.random().toString(36).slice(2, 7)}.webp`,
        ),
      ),
      deleteFiles: jest.fn(),
    };

    const baleNotificationService = {
      notifyBarberProfileEdited: jest.fn().mockResolvedValue(undefined),
    };

    const service = new BarberService(
      userRepo,
      profileRepo,
      cityRepo,
      provinceRepo,
      bookingSmsService,
      filesService as any,
      baleNotificationService as any,
    );

    const controller = new BarberController(
      service,
      filesService as any,
      {} as any,
      profileRepo,
    );

    return {
      user,
      profile,
      service,
      controller,
      smsIrService,
      filesService,
      baleNotificationService,
      profileRepo,
      profileQueryMock,
      userRepo,
    };
  }

  it('هنگام تایید اولیه پروفایل آرایشگر پیامک قالب 172833 را با نام آرایشگر ارسال می‌کند', async () => {
    const { service, smsIrService, profile } = createHarness(false);

    const result = await service.reviewBarber(42, { isApproved: true });

    expect(result.data.isApproved).toBe(true);
    expect(profile.isApproved).toBe(true);
    expect(smsIrService.sendTemplate).toHaveBeenCalledTimes(1);
    expect(smsIrService.sendTemplate).toHaveBeenCalledWith(
      '09121234567',
      SMS_TEMPLATES.BARBER_PROFILE_APPROVED,
      [{ name: 'NAME', value: 'علی رضایی' }],
    );
  });

  it('در کل چرخه ویرایش پروفایل، رد ویرایش، و تایید مجدد هرگز پروفایل تاییدشده قبلی را از دید کاربران پنهان نمی‌کند', async () => {
    const { service, smsIrService, filesService, profile } =
      createHarness(true);

    // ۱. آرایشگر تاییدشده اطلاعات پروفایل و عکس خود را ویرایش می‌کند
    await service.update(42, {
      fullName: 'علی رضایی جدید',
      salonName: 'سالن رویال VIP',
      provinceId: 2,
      cityId: 20,
      address: 'کرج، عظیمیه، بلوار شریعتی',
      bio: 'بیوگرافی جدید در انتظار بررسی',
      profileImage: '/uploads/profiles/draft-avatar-1.webp',
    });

    // عکس قبلی نباید از دیسک پاک شده باشد چون هنوز برای عموم نمایش داده می‌شود
    expect(filesService.deleteFiles).not.toHaveBeenCalled();

    // ۲. کاربران عادی در صفحه عمومی و لیست آرایشگرها همچنان اطلاعات تاییدشده قبلی را می‌بینند
    const publicDetailWhilePending = await service.findPublicOne(42);
    expect(publicDetailWhilePending.salonName).toBe('پیرایش کلاسیک');
    expect(publicDetailWhilePending.address).toBe(
      'تهران، خیابان ولیعصر، پلاک ۱۰',
    );
    expect(publicDetailWhilePending.city?.name).toBe('تهران');
    expect(publicDetailWhilePending.profileImage).toBe(
      '/uploads/profiles/live-avatar.webp',
    );

    const publicListWhilePending = await service.findAll({
      page: 1,
      limit: 10,
    });
    expect(publicListWhilePending.data).toHaveLength(1);
    expect(publicListWhilePending.data[0].salonName).toBe('پیرایش کلاسیک');

    // ۳. خود آرایشگر در پروفایلش اطلاعات جدید + وضعیت «در انتظار تایید» را می‌بیند
    const selfViewWhilePending = await service.findOneByUserId(42);
    expect(selfViewWhilePending.isApproved).toBe(true);
    expect(selfViewWhilePending.pendingStatus).toBe('pending');
    expect(selfViewWhilePending.hasPendingChanges).toBe(true);
    expect(selfViewWhilePending.fullName).toBe('علی رضایی جدید');
    expect(selfViewWhilePending.salonName).toBe('سالن رویال VIP');
    expect(selfViewWhilePending.provinceName).toBe('البرز');
    expect(selfViewWhilePending.cityName).toBe('کرج');
    expect(selfViewWhilePending.profileImage).toBe(
      '/uploads/profiles/draft-avatar-1.webp',
    );

    // ۴. ادمین در صف تاییدها، درخواست را با برچسب ویرایش پروفایل و مقادیر قبلی و جدید می‌بیند
    const adminQueue = await service.findAll(
      { page: 1, limit: 10 },
      undefined,
      true,
    );
    expect(adminQueue.data).toHaveLength(1);
    expect(adminQueue.data[0].isEditReview).toBe(true);
    expect(adminQueue.data[0].salonName).toBe('سالن رویال VIP');
    expect(adminQueue.data[0].cityName).toBe('کرج');

    const approvalDetail = await service.findApprovalDetail('42');
    expect(approvalDetail.isEditReview).toBe(true);
    expect(approvalDetail.salonName).toBe('سالن رویال VIP');
    expect(approvalDetail.city?.name).toBe('کرج');
    expect(approvalDetail.currentApprovedProfile).toMatchObject({
      fullName: 'علی رضایی',
      salonName: 'پیرایش کلاسیک',
      cityName: 'تهران',
      provinceName: 'تهران',
    });

    // ۵. ادمین ویرایش جدید را رد می‌کند! پروفایل قبلی همچنان باید فعال و عمومی بماند!
    await service.reviewBarber(42, {
      isApproved: false,
      rejectionReason: 'تصویر پروفایل کیفیت مناسبی ندارد',
    });

    expect(profile.isApproved).toBe(true);
    expect(smsIrService.sendTemplate).not.toHaveBeenCalled();

    const publicDetailAfterReject = await service.findPublicOne(42);
    expect(publicDetailAfterReject.salonName).toBe('پیرایش کلاسیک');
    expect(publicDetailAfterReject.profileImage).toBe(
      '/uploads/profiles/live-avatar.webp',
    );

    const publicListAfterReject = await service.findAll({
      page: 1,
      limit: 10,
    });
    expect(publicListAfterReject.data).toHaveLength(1);
    expect(publicListAfterReject.data[0].salonName).toBe('پیرایش کلاسیک');

    // از صف بررسی ادمین خارج شده تا زمانی که آرایشگر اصلاح کند
    const adminQueueAfterReject = await service.findAll(
      { page: 1, limit: 10 },
      undefined,
      true,
    );
    expect(adminQueueAfterReject.data).toHaveLength(0);

    // خود آرایشگر همچنان اطلاعات واردشده و دلیل رد شدن ویرایش را می‌بیند
    const selfViewAfterReject = await service.findOneByUserId(42);
    expect(selfViewAfterReject.isApproved).toBe(true);
    expect(selfViewAfterReject.pendingStatus).toBe('rejected');
    expect(selfViewAfterReject.pendingRejectionReason).toBe(
      'تصویر پروفایل کیفیت مناسبی ندارد',
    );
    expect(selfViewAfterReject.salonName).toBe('سالن رویال VIP');

    // ۶. آرایشگر عکس جدید آپلود می‌کند -> عکس پیش‌نویس قبلی پاک می‌شود ولی عکس عمومی هنوز دست‌نخورده است
    await service.update(42, {
      profileImage: '/uploads/profiles/draft-avatar-2.webp',
    });
    expect(filesService.deleteFiles).toHaveBeenCalledWith([
      '/uploads/profiles/draft-avatar-1.webp',
    ]);
    filesService.deleteFiles.mockClear();

    // ۷. ادمین ویرایش جدید را تایید می‌کند -> تغییرات جایگزین پروفایل عمومی می‌شوند + پیامک 172833 ارسال می‌شود
    await service.reviewBarber(42, { isApproved: true });

    expect(filesService.deleteFiles).toHaveBeenCalledWith([
      '/uploads/profiles/live-avatar.webp',
    ]);
    expect(smsIrService.sendTemplate).toHaveBeenCalledTimes(1);
    expect(smsIrService.sendTemplate).toHaveBeenCalledWith(
      '09121234567',
      172833,
      [{ name: 'NAME', value: 'علی رضایی جدید' }],
    );

    const publicDetailAfterApprove = await service.findPublicOne(42);
    expect(publicDetailAfterApprove.salonName).toBe('سالن رویال VIP');
    expect(publicDetailAfterApprove.city?.name).toBe('کرج');
    expect(publicDetailAfterApprove.province?.name).toBe('البرز');
    expect(publicDetailAfterApprove.profileImage).toBe(
      '/uploads/profiles/draft-avatar-2.webp',
    );

    const selfViewAfterApprove = await service.findOneByUserId(42);
    expect(selfViewAfterApprove.pendingStatus).toBe('none');
    expect(selfViewAfterApprove.hasPendingChanges).toBe(false);
    expect(selfViewAfterApprove.pendingRejectionReason).toBeNull();
  });

  it('ذخیره مقادیر یکسان یا بازگرداندن مقادیر به حالت تاییدشده قبلی، وضعیت pending ایجاد نمی‌کند', async () => {
    const { service, profile } = createHarness(true);

    // ذخیره بدون تغییر واقعی
    await service.update(42, {
      salonName: 'پیرایش کلاسیک',
      address: 'تهران، خیابان ولیعصر، پلاک ۱۰',
    });
    expect(profile.pendingStatus).toBe('none');
    expect(profile.pendingChanges).toBeNull();

    // ایجاد تغییر و سپس بازگرداندن به مقدار قبلی
    await service.update(42, { salonName: 'نام موقت' });
    expect(profile.pendingStatus).toBe('pending');

    await service.update(42, { salonName: 'پیرایش کلاسیک' });
    expect(profile.pendingStatus).toBe('none');
    expect(profile.pendingChanges).toBeNull();
  });

  it('فیلدهای زمان‌بندی و خصوصی (کد ملی، تاریخ تولد، بازه نوبت) بدون نیاز به تایید مجدد مستقیماً ذخیره می‌شوند', async () => {
    const { service, profile } = createHarness(true);

    await service.update(42, {
      slotIntervalMinutes: 45,
      workStartTime: '10:00',
      workEndTime: '22:00',
      nationalCode: '0013542419',
    });

    expect(profile.pendingStatus).toBe('none');
    expect(profile.slotIntervalMinutes).toBe(45);

    const selfView = await service.findOneByUserId(42);
    expect(selfView.nationalCode).toBe('0013542419');
    expect(selfView.slotIntervalMinutes).toBe(45);
  });

  it('ویرایش متوالی نمونه‌کارها در حالت pending خطای مالکیت عکس نمی‌دهد و عکس‌های عمومی را پاک نمی‌کند', async () => {
    const { controller, service, filesService, profile } = createHarness(true);

    // ویرایش اول نمونه‌کار: نگه داشتن یکی از عکس‌های فعلی + آپلود یک عکس جدید
    const firstRes = await controller.updatePortfolioImages(
      { user: { id: 42 } },
      [{} as Express.Multer.File],
      JSON.stringify(['/uploads/portfolio/live-1.webp']),
    );
    const firstUploaded = firstRes.data.portfolioImages![1];

    // عکس live-2 نباید پاک شده باشد چون در نمایش عمومی فعال است!
    expect(filesService.deleteFiles).not.toHaveBeenCalled();
    expect(profile.portfolioImages).toEqual([
      '/uploads/portfolio/live-1.webp',
      '/uploads/portfolio/live-2.webp',
    ]);

    // ویرایش دوم نمونه‌کار قبل از تایید ادمین: نگه داشتن عکس جدیدِ پیش‌نویس (firstUploaded)
    const secondRes = await controller.updatePortfolioImages(
      { user: { id: 42 } },
      [{} as Express.Multer.File],
      JSON.stringify(['/uploads/portfolio/live-1.webp', firstUploaded]),
    );
    const secondUploaded = secondRes.data.portfolioImages![2];
    expect(filesService.deleteFiles).not.toHaveBeenCalled();

    // ویرایش سوم: حذف هر دو فایل پیش‌نویس -> فقط فایل‌های پیش‌نویس حذف می‌شوند، نه عکس‌های عمومی
    await controller.updatePortfolioImages(
      { user: { id: 42 } },
      [],
      JSON.stringify(['/uploads/portfolio/live-1.webp']),
    );
    expect(filesService.deleteFiles).toHaveBeenCalledWith([
      firstUploaded,
      secondUploaded,
    ]);
    filesService.deleteFiles.mockClear();

    // تایید ادمین -> اکنون live-2 که از مجموعه نهایی حذف شده پاک می‌شود
    await service.reviewBarber(42, { isApproved: true });
    expect(filesService.deleteFiles).toHaveBeenCalledWith([
      '/uploads/portfolio/live-2.webp',
    ]);
    expect(profile.portfolioImages).toEqual(['/uploads/portfolio/live-1.webp']);
  });

  it('رد کردن بدون دلیل خطای ۴۰۰ برمی‌گرداند و onModuleInit ستون‌های جامانده را به صورت idempotent می‌سازد', async () => {
    const { service, profileQueryMock } = createHarness(true);

    await expect(
      service.reviewBarber(42, { isApproved: false, rejectionReason: '   ' }),
    ).rejects.toBeInstanceOf(BadRequestException);

    profileQueryMock.mockResolvedValueOnce([{ COLUMN_NAME: 'id' }]);
    await service.onModuleInit();

    expect(profileQueryMock).toHaveBeenCalledWith(
      expect.stringContaining('ADD COLUMN `pending_changes` JSON NULL'),
    );
    expect(profileQueryMock).toHaveBeenCalledWith(
      expect.stringContaining(
        "ADD COLUMN `pending_status` VARCHAR(20) NOT NULL DEFAULT 'none'",
      ),
    );
    expect(profileQueryMock).toHaveBeenCalledWith(
      expect.stringContaining(
        'ADD COLUMN `pending_rejection_reason` TEXT NULL',
      ),
    );
  });

  it('مسیر UsersService.updateMe نیز برای آرایشگر تاییدشده نام جدید را در pendingChanges نگه می‌دارد و نام عمومی را تغییر نمی‌دهد', async () => {
    const { user, profile, userRepo, profileRepo, service } =
      createHarness(true);
    const usersService = new UsersService(userRepo, profileRepo);

    const updatedSelf = await usersService.updateMe(
      { fullName: 'نام جدید از مسیر پروفایل کاربر' },
      { id: 42, roles: [Role.User, Role.Barber] },
    );

    expect(updatedSelf.fullName).toBe('نام جدید از مسیر پروفایل کاربر');
    // نام عمومی در جدول user همچنان مقدار تاییدشده قبلی است
    expect(user.fullName).toBe('علی رضایی');
    expect(profile.pendingStatus).toBe('pending');
    expect(profile.pendingChanges?.fullName).toBe(
      'نام جدید از مسیر پروفایل کاربر',
    );

    const meView = await usersService.findMe(42);
    expect(meView?.fullName).toBe('نام جدید از مسیر پروفایل کاربر');

    // تایید با شناسه فارسی یا UUID پروفایل نیز به درستی کار می‌کند
    await service.reviewBarber('۴۲', { isApproved: true });
    expect(user.fullName).toBe('نام جدید از مسیر پروفایل کاربر');
    expect(profile.pendingStatus).toBe('none');

    // ویرایش مستقیم توسط ادمین بدون ورود به وضعیت pending اعمال می‌شود
    await service.updateByProfileId(profile.id, {
      salonName: 'سالن ویرایش‌شده توسط ادمین',
    });
    expect(profile.salonName).toBe('سالن ویرایش‌شده توسط ادمین');
    expect(profile.pendingStatus).toBe('none');
  });

  it('تزریق وابستگی‌های NestJS برای BarberService، BarberController، BarberAdminController و UsersService بدون خطا انجام می‌شود', async () => {
    const emptyRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [BarberController, BarberAdminController],
      providers: [
        BarberService,
        WorkHoursService,
        BarberReviewService,
        UsersService,
        { provide: getRepositoryToken(BarberProfile), useValue: emptyRepo },
        { provide: getRepositoryToken(User), useValue: emptyRepo },
        { provide: getRepositoryToken(Booking), useValue: emptyRepo },
        { provide: getRepositoryToken(BarberWorkHours), useValue: emptyRepo },
        { provide: getRepositoryToken(BarberReview), useValue: emptyRepo },
        { provide: getRepositoryToken(City), useValue: emptyRepo },
        { provide: getRepositoryToken(Province), useValue: emptyRepo },
        {
          provide: BookingSmsService,
          useValue: { sendBarberProfileApprovedToBarber: jest.fn() },
        },
        {
          provide: FilesService,
          useValue: { saveFile: jest.fn(), deleteFiles: jest.fn() },
        },
        {
          provide: JwtService,
          useValue: { verifyAsync: jest.fn() },
        },
      ],
    }).compile();

    expect(moduleRef.get(BarberService)).toBeInstanceOf(BarberService);
    expect(moduleRef.get(BarberController)).toBeInstanceOf(BarberController);
    expect(moduleRef.get(BarberAdminController)).toBeInstanceOf(
      BarberAdminController,
    );
    expect(moduleRef.get(UsersService)).toBeInstanceOf(UsersService);
  });

  it('هنگام ویرایش پروفایل توسط آرایشگر (تاییدشده یا تاییدنشده) اعلان بله ارسال می‌شود و در ذخیرهٔ تکراری یا ویرایش ادمین اسپم نمی‌شود', async () => {
    const { service, baleNotificationService, userRepo, profileRepo, profile } =
      createHarness(true);
    const usersService = new UsersService(
      userRepo,
      profileRepo,
      baleNotificationService as any,
    );

    // ۱. ویرایش فیلد غیرعملیاتی بدون نیاز به تایید (بازه رزرو) -> نباید پیام بله بفرستد
    await service.update(42, { slotIntervalMinutes: 45 });
    expect(
      baleNotificationService.notifyBarberProfileEdited,
    ).not.toHaveBeenCalled();

    // ۲. ویرایش نام سالن توسط آرایشگر تاییدشده -> ارسال اعلان بله با ذکر فیلد
    await service.update(42, { salonName: 'پیرایش رویال جدید' });
    expect(
      baleNotificationService.notifyBarberProfileEdited,
    ).toHaveBeenCalledTimes(1);
    expect(
      baleNotificationService.notifyBarberProfileEdited,
    ).toHaveBeenLastCalledWith({
      userId: 42,
      changedFields: ['نام سالن'],
      isApprovedBarber: true,
    });

    // ۳. ذخیره مجدد همان مقدار بدون تغییر جدید -> عدم ارسال پیام تکراری
    await service.update(42, { salonName: 'پیرایش رویال جدید' });
    expect(
      baleNotificationService.notifyBarberProfileEdited,
    ).toHaveBeenCalledTimes(1);

    // ۴. ویرایش نمونه‌کارها -> ارسال اعلان بله شامل تمام تغییرات در انتظار تایید
    await service.updatePortfolioImages(42, [
      '/uploads/portfolio/live-1.webp',
      '/uploads/portfolio/new-2.webp',
    ]);
    expect(
      baleNotificationService.notifyBarberProfileEdited,
    ).toHaveBeenCalledTimes(2);
    expect(
      baleNotificationService.notifyBarberProfileEdited,
    ).toHaveBeenLastCalledWith({
      userId: 42,
      changedFields: ['نام سالن', 'نمونه‌کارها'],
      isApprovedBarber: true,
    });

    // ۵. ویرایش نام از مسیر UsersService.updateMe -> ارسال اعلان بله
    await usersService.updateMe(
      { fullName: 'استاد علی رضایی' },
      { id: 42, roles: [Role.User, Role.Barber] },
    );
    expect(
      baleNotificationService.notifyBarberProfileEdited,
    ).toHaveBeenCalledTimes(3);
    expect(
      baleNotificationService.notifyBarberProfileEdited,
    ).toHaveBeenLastCalledWith({
      userId: 42,
      changedFields: ['نام و نام خانوادگی', 'نام سالن', 'نمونه‌کارها'],
      isApprovedBarber: true,
    });

    // ۶. ویرایش توسط ادمین -> نباید اعلان تایید پروفایل به بله ارسال شود
    await service.updateByProfileId(profile.id, {
      address: 'آدرس اصلاح‌شده توسط ادمین',
    });
    expect(
      baleNotificationService.notifyBarberProfileEdited,
    ).toHaveBeenCalledTimes(3);

    // ۷. ویرایش پروفایل آرایشگر تاییدنشده (مثلاً پس از رد اولیه) -> ارسال اعلان بله
    const unapprovedHarness = createHarness(false);
    unapprovedHarness.profile.rejectionReason = 'آدرس ناقص است';
    await unapprovedHarness.service.update(42, {
      address: 'تهران، سعادت‌آباد، پلاک ۱۲',
    });
    expect(
      unapprovedHarness.baleNotificationService.notifyBarberProfileEdited,
    ).toHaveBeenCalledTimes(1);
    expect(
      unapprovedHarness.baleNotificationService.notifyBarberProfileEdited,
    ).toHaveBeenCalledWith({
      userId: 42,
      changedFields: ['آدرس'],
      isApprovedBarber: false,
    });
  });
});
