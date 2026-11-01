import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import cookieParser from 'cookie-parser';
import { AuthController } from 'src/auth/auth.controller';
import { AuthService } from 'src/auth/auth.service';
import { Role } from 'src/common/enum/role.enum';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { ResponseInterceptor } from 'src/common/interceptors/response.interceptor';
import { FilesService } from 'src/files/files.service';
import { OtpService } from 'src/otp/otp.service';
import { SessionRevocationService } from 'src/redis/session-revocation.service';
import { ReferralService } from 'src/referral/referral.service';
import { ServicesService } from 'src/services/services.service';
import { User } from 'src/users/entities/user.entity';
import { UsersService } from 'src/users/users.service';
import request from 'supertest';
import { DataSource } from 'typeorm';

import { BarberAdminController } from './barber.admin.controller';
import { BarberController } from './barber.controller';
import { BarberService } from './barber.service';
import { BarberProfile } from './entities/barber.entity';
import { WorkHoursService } from './work-hours.service';

/** Real controllers, authorization, JWT cookies and service logic; in-memory
 * repositories/OTP substitute for external MySQL, Redis and SMS services. */
describe('admin barber visibility and login over HTTP', () => {
  const oldAccessSecret = process.env.JWT_ACCESS_SECRET;
  const oldRefreshSecret = process.env.JWT_REFRESH_SECRET;
  let app: INestApplication;
  let barber: any;
  let profile: any;
  let admin: any;
  let userRepo: any;
  let profileRepo: any;
  let queries: string[][];
  let webhook: { notifyBarberProfileChanged: jest.Mock };

  const phoneBarber = '09121234567';
  const phoneAdmin = '09120000000';

  function buildQueryBuilder(kind: 'users' | 'profiles') {
    const clauses: string[] = [];
    queries.push(clauses);
    let isManagement = false;
    let isApprovalQueue = false;
    const sub: any = {
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getQuery: jest.fn().mockReturnValue('(SELECT 1)'),
    };
    const matches = () => {
      if (isManagement) return true;
      if (isApprovalQueue) {
        return !profile.isApproved || profile.pendingStatus === 'pending';
      }
      return (
        (!clauses.some(c => c.includes('profile.isApproved =')) ||
          profile.isApproved) &&
        (!clauses.some(c => c.includes('user.isActive =')) ||
          barber.isActive) &&
        (!clauses.some(c => c.includes('profile.isPubliclyVisible =')) ||
          profile.isPubliclyVisible)
      );
    };
    const qb: any = {
      subQuery: jest.fn(() => sub),
      where: jest.fn((clause: unknown, params: any) => {
        if (typeof clause === 'string') clauses.push(clause);
        if (params?.barberRole) isManagement = true;
        return qb;
      }),
      andWhere: jest.fn((clause: unknown) => {
        if (typeof clause === 'string') clauses.push(clause);
        else isApprovalQueue = true;
        return qb;
      }),
      innerJoin: jest.fn().mockReturnThis(),
      innerJoinAndSelect: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      distinct: jest.fn().mockReturnThis(),
      getOne: jest.fn(() => Promise.resolve(matches() ? barber : null)),
      getManyAndCount: jest.fn(() =>
        Promise.resolve(matches() ? [[barber], 1] : [[], 0]),
      ),
      getRawMany: jest.fn(() =>
        Promise.resolve(
          kind === 'profiles' && matches()
            ? [
                {
                  userId: barber.id,
                  address: profile.address,
                  citySlug: 'tehran',
                  cityName: 'تهران',
                  provinceName: 'تهران',
                },
              ]
            : [],
        ),
      ),
    };
    return qb;
  }

  beforeAll(async () => {
    process.env.JWT_ACCESS_SECRET = 'test-access-secret';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
    // Objects are reused so all services see changes made through admin routes.
    profile = {};
    barber = {};
    admin = {};
    queries = [];
    webhook = { notifyBarberProfileChanged: jest.fn() };
    userRepo = {
      findOne: jest.fn(({ where }: any) =>
        Promise.resolve(where.id === barber.id ? barber : null),
      ),
      save: jest.fn(),
      update: jest.fn(({ id }: any, values: any) => {
        if (id !== barber.id) return Promise.resolve({ affected: 0 });
        Object.assign(barber, values);
        return Promise.resolve({ affected: 1 });
      }),
      createQueryBuilder: jest.fn(() => buildQueryBuilder('users')),
      manager: {
        transaction: jest.fn(async (callback: any) => {
          const oldUser = { ...barber };
          const oldProfile = { ...profile };
          try {
            return await callback({
              getRepository: (entity: any) =>
                entity === User ? userRepo : profileRepo,
            });
          } catch (error) {
            Object.assign(barber, oldUser);
            Object.assign(profile, oldProfile);
            throw error;
          }
        }),
      },
    };
    profileRepo = {
      findOne: jest.fn(({ where }: any) =>
        Promise.resolve(
          where.id === profile.id || where.userId === barber.id
            ? profile
            : null,
        ),
      ),
      update: jest.fn(({ id }: any, values: any) => {
        if (id !== profile.id) return Promise.resolve({ affected: 0 });
        Object.assign(profile, values);
        return Promise.resolve({ affected: 1 });
      }),
      createQueryBuilder: jest.fn(() => buildQueryBuilder('profiles')),
    };
    const service = new BarberService(
      userRepo,
      profileRepo,
      {} as any,
      undefined,
      undefined,
      undefined,
      undefined,
      webhook as any,
    );
    const users = {
      findOne: jest.fn((id: number) =>
        Promise.resolve(
          id === barber.id ? barber : id === admin.id ? admin : null,
        ),
      ),
      findWithPhone: jest.fn((phone: string) =>
        Promise.resolve(
          phone === phoneBarber ? barber : phone === phoneAdmin ? admin : null,
        ),
      ),
      findWithPhoneWithPassword: jest.fn((phone: string) =>
        Promise.resolve(phone === phoneBarber ? barber : null),
      ),
    };

    const module = await Test.createTestingModule({
      controllers: [AuthController, BarberController, BarberAdminController],
      providers: [
        AuthService,
        AuthGuard,
        RolesGuard,
        JwtService,
        { provide: BarberService, useValue: service },
        { provide: UsersService, useValue: users },
        {
          provide: OtpService,
          useValue: { verifyOtp: jest.fn().mockResolvedValue(true) },
        },
        {
          provide: SessionRevocationService,
          useValue: { isSessionRevoked: jest.fn().mockResolvedValue(false) },
        },
        { provide: ServicesService, useValue: {} },
        { provide: ReferralService, useValue: {} },
        { provide: DataSource, useValue: {} },
        { provide: FilesService, useValue: {} },
        { provide: WorkHoursService, useValue: {} },
        { provide: getRepositoryToken(BarberProfile), useValue: profileRepo },
      ],
    }).compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api');
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    app.useGlobalInterceptors(new ResponseInterceptor());
    await app.init();
  });

  beforeEach(() => {
    Object.assign(profile, {
      id: 'barber-profile-42',
      userId: 42,
      slug: 'salon-42',
      salonName: 'سالن آزمایشی',
      address: 'تهران',
      activityType: 'both',
      isApproved: true,
      isPubliclyVisible: true,
      pendingStatus: 'pending',
      pendingChanges: { salonName: 'نام جدید' },
      rejectionReason: null,
      slotIntervalMinutes: 30,
      portfolioImages: [],
    });
    Object.assign(barber, {
      id: 42,
      fullName: 'آرایشگر آزمایشی',
      phone: phoneBarber,
      roles: [Role.User, Role.Barber],
      isActive: true,
      password: null,
      barberProfile: profile,
      services: [
        { id: 'service-1', name: 'اصلاح', price: 100, isActive: true },
      ],
      createdAt: new Date(),
    });
    Object.assign(admin, {
      id: 1,
      phone: phoneAdmin,
      fullName: 'مدیر',
      roles: [Role.Admin],
      isActive: true,
    });
    queries.length = 0;
    webhook.notifyBarberProfileChanged.mockClear();
    userRepo.save.mockClear();
    userRepo.update.mockClear();
    profileRepo.update.mockClear();
  });

  afterAll(async () => {
    await app.close();
    if (oldAccessSecret === undefined) delete process.env.JWT_ACCESS_SECRET;
    else process.env.JWT_ACCESS_SECRET = oldAccessSecret;
    if (oldRefreshSecret === undefined) delete process.env.JWT_REFRESH_SECRET;
    else process.env.JWT_REFRESH_SECRET = oldRefreshSecret;
  });

  async function login(phone: string) {
    const response = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ phone, code: '1111' })
      .expect(201);
    return (response.headers['set-cookie'] as unknown as string[])
      .map(cookie => cookie.split(';')[0])
      .join('; ');
  }

  it('hides and restores listings without ending the session or changing approval', async () => {
    const adminCookie = await login(phoneAdmin);
    const barberCookie = await login(phoneBarber);
    const before = await request(app.getHttpServer())
      .get('/api/barber')
      .expect(200);
    expect(before.body.data).toHaveLength(1);
    await request(app.getHttpServer()).get('/api/barber/42').expect(200);
    const initialDirectory = await request(app.getHttpServer())
      .get('/api/barber/public-directory')
      .expect(200);
    expect(initialDirectory.body.data.barbers).toEqual([{ id: 42 }]);

    await request(app.getHttpServer())
      .patch('/api/admin/barber/42/active')
      .set('Cookie', barberCookie)
      .send({ isActive: false })
      .expect(403);
    await request(app.getHttpServer())
      .patch('/api/admin/barber/42/active')
      .set('Cookie', adminCookie)
      .send({ isActive: false })
      .expect(200);
    expect(barber.isActive).toBe(true);
    expect(profile).toMatchObject({
      isApproved: true,
      isPubliclyVisible: false,
      pendingStatus: 'pending',
      pendingChanges: { salonName: 'نام جدید' },
    });
    expect(userRepo.save).not.toHaveBeenCalled();
    expect(userRepo.update).not.toHaveBeenCalled();
    expect(webhook.notifyBarberProfileChanged).toHaveBeenCalledWith({
      userId: 42,
      slugs: ['salon-42'],
    });

    const list = await request(app.getHttpServer())
      .get('/api/barber')
      .expect(200);
    expect(list.body.data).toEqual([]);
    await request(app.getHttpServer()).get('/api/barber/42').expect(404);
    const directory = await request(app.getHttpServer())
      .get('/api/barber/public-directory')
      .expect(200);
    expect(directory.body.data.barbers).toEqual([]);
    expect(
      queries.filter(q =>
        q.some(c => c.includes('profile.isPubliclyVisible =')),
      ),
    ).toHaveLength(6);

    await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Cookie', barberCookie)
      .expect(200);
    await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .set('Cookie', barberCookie)
      .expect(201);
    await login(phoneBarber);
    barber.password = await bcrypt.hash('test-password', 4);
    await request(app.getHttpServer())
      .post('/api/auth/login-with-password')
      .send({ phone: phoneBarber, password: 'test-password' })
      .expect(201);
    const myProfile = await request(app.getHttpServer())
      .get('/api/barber/profile/me')
      .set('Cookie', barberCookie)
      .expect(200);
    expect(myProfile.body.data).toMatchObject({
      isApproved: true,
      isPubliclyVisible: false,
    });

    await request(app.getHttpServer())
      .patch('/api/admin/barber/42/active')
      .set('Cookie', adminCookie)
      .send({ isActive: true })
      .expect(200);
    expect(barber.isActive).toBe(true);
    expect(profile.isApproved).toBe(true);
    expect(
      (await request(app.getHttpServer()).get('/api/barber').expect(200)).body
        .data,
    ).toHaveLength(1);
  });

  it('leaves legacy inactive accounts locked until an explicit admin repair, keeping them hidden', async () => {
    const adminCookie = await login(phoneAdmin);
    const previousBarberCookie = await login(phoneBarber);
    barber.isActive = false;
    await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Cookie', previousBarberCookie)
      .expect(401);
    // The new column defaults to true on old records; the account itself still
    // keeps them hidden until an administrator explicitly reviews the account.
    const management = await request(app.getHttpServer())
      .get('/api/admin/barber/management')
      .set('Cookie', adminCookie)
      .expect(200);
    expect(management.body.data[0]).toMatchObject({
      isActive: false,
      isAccountActive: false,
    });
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ phone: phoneBarber, code: '1111' })
      .expect(403);
    await request(app.getHttpServer())
      .patch('/api/admin/barber/42/active')
      .set('Cookie', adminCookie)
      .send({ isActive: true })
      .expect(409);
    expect(userRepo.update).not.toHaveBeenCalled();
    expect(profile.isPubliclyVisible).toBe(true);

    await request(app.getHttpServer())
      .patch('/api/admin/barber/42/restore-account')
      .set('Cookie', adminCookie)
      .expect(200);
    expect(barber.isActive).toBe(true);
    expect(profile).toMatchObject({
      isPubliclyVisible: false,
      isApproved: true,
    });
    await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Cookie', previousBarberCookie)
      .expect(200);
    await login(phoneBarber);
    expect(
      (await request(app.getHttpServer()).get('/api/barber').expect(200)).body
        .data,
    ).toEqual([]);
    const after = await request(app.getHttpServer())
      .get('/api/admin/barber/management')
      .set('Cookie', adminCookie)
      .expect(200);
    expect(after.body.data[0]).toMatchObject({
      isActive: false,
      isAccountActive: true,
    });
  });

  it('rolls back visibility if account restoration fails', async () => {
    const adminCookie = await login(phoneAdmin);
    barber.isActive = false;
    userRepo.update.mockRejectedValueOnce(new Error('database unavailable'));
    await request(app.getHttpServer())
      .patch('/api/admin/barber/42/restore-account')
      .set('Cookie', adminCookie)
      .expect(500);
    expect(userRepo.manager.transaction).toHaveBeenCalled();
    expect(profile.isPubliclyVisible).toBe(true);
    expect(barber.isActive).toBe(false);
    expect(webhook.notifyBarberProfileChanged).not.toHaveBeenCalled();
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ phone: phoneBarber, code: '1111' })
      .expect(403);
  });

  it('shows an admin-role warning for accounts requiring review', async () => {
    const adminCookie = await login(phoneAdmin);
    barber.isActive = false;
    barber.roles = [Role.User, Role.Barber, Role.Admin];
    const management = await request(app.getHttpServer())
      .get('/api/admin/barber/management')
      .set('Cookie', adminCookie)
      .expect(200);
    expect(management.body.data[0]).toMatchObject({
      isActive: false,
      isAccountActive: false,
      isAdminAccount: true,
    });
  });

  it('does not approve an unapproved profile when display is enabled', async () => {
    const adminCookie = await login(phoneAdmin);
    profile.isApproved = false;
    profile.isPubliclyVisible = false;
    await request(app.getHttpServer())
      .patch('/api/admin/barber/42/active')
      .set('Cookie', adminCookie)
      .send({ isActive: true })
      .expect(200);
    expect(profile.isApproved).toBe(false);
    expect(
      (await request(app.getHttpServer()).get('/api/barber').expect(200)).body
        .data,
    ).toEqual([]);
  });

  it('restoring an already active account does not change visibility, and non-admins cannot restore', async () => {
    const adminCookie = await login(phoneAdmin);
    const barberCookie = await login(phoneBarber);
    await request(app.getHttpServer())
      .patch('/api/admin/barber/42/restore-account')
      .set('Cookie', barberCookie)
      .expect(403);
    await request(app.getHttpServer())
      .patch('/api/admin/barber/42/restore-account')
      .set('Cookie', adminCookie)
      .expect(200);
    expect(profile.isPubliclyVisible).toBe(true);
    expect(profileRepo.update).not.toHaveBeenCalled();
    expect(userRepo.update).not.toHaveBeenCalled();
  });
});
