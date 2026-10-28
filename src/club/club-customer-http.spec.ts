import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Role } from 'src/common/enum/role.enum';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import request from 'supertest';

import { ClubController } from './club.controller';
import { ClubService } from './club.service';
import { ClubCustomer } from './entities/club-customer.entity';

/**
 * تست مسیر HTTP واقعی «ویرایش مشتری باشگاه».
 *
 * باگ واقعی: فرانت هنگام ذخیرهٔ ویرایش مشتری، `phone` را هم در بدنهٔ
 * `PATCH /club/customers/:id` می‌فرستاد ولی این فیلد در DTO وجود نداشت.
 * چون `ValidationPipe` با `forbidNonWhitelisted: true` در `main.ts` تنظیم شده
 * است، درخواست با ۴۰۰ رد می‌شد و **هیچ‌کدام** از تغییرات (حتی نام و نام
 * خانوادگی) ذخیره نمی‌شد.
 *
 * این تست همان پایپ‌لاین را با ورودی واقعی فرانت اجرا می‌کند تا مطمئن شویم
 * دیگر ۴۰۰ نمی‌دهد و تغییرات واقعاً اعمال می‌شوند.
 */
describe('PATCH /club/customers/:id — ویرایش مشتری (مسیر HTTP)', () => {
  let app: INestApplication;
  let member: ClubCustomer;
  let user: { id: number; phone: string; fullName: string; roles: Role[] };
  const userRepo = {
    findOne: jest.fn(({ where }: any) =>
      Promise.resolve(
        where?.id === 42 || where?.phone === user.phone ? user : null,
      ),
    ),
    save: jest.fn((entity: typeof user) => {
      Object.assign(user, entity);
      return Promise.resolve(user);
    }),
  };

  beforeAll(async () => {
    user = {
      id: 42,
      phone: '09120000000',
      fullName: 'علی رضایی',
      roles: [Role.User],
    };

    member = {
      id: 'member-1',
      barberId: 'barber-1',
      customerId: 42,
      groupId: null,
      fullName: 'علی رضایی',
      phone: '09120000000',
    } as unknown as ClubCustomer;

    const service = new ClubService(
      {
        findOne: jest.fn((args: any) =>
          Promise.resolve(
            args?.where?.id === member.id && args?.where?.barberId
              ? member
              : null,
          ),
        ),
        save: jest.fn((entity: ClubCustomer) => {
          Object.assign(member, entity);
          return Promise.resolve(member);
        }),
        update: jest.fn(() => Promise.resolve({ affected: 1 })),
      } as any,
      {
        findOne: jest.fn(),
        find: jest.fn().mockResolvedValue([]),
        save: jest.fn(),
        create: jest.fn(),
      } as any,
      { findOne: jest.fn().mockResolvedValue({ id: 'barber-1' }) } as any,
      userRepo as any,
    );

    const moduleRef = await Test.createTestingModule({
      controllers: [ClubController],
      providers: [{ provide: ClubService, useValue: service }],
    })
      .overrideGuard(AuthGuard)
      .useValue({
        canActivate: (context: any) => {
          context.switchToHttp().getRequest().user = {
            id: 7,
            roles: [Role.Barber],
          };
          return true;
        },
      })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('بدنهٔ فرانت (نام + شماره + گروه) دیگر ۴۰۰ نمی‌گیرد و مقادیر ذخیره می‌شوند', async () => {
    const response = await request(app.getHttpServer())
      .patch('/club/customers/member-1')
      .send({
        fullName: 'علی رضایی جدید',
        phone: '۰۹۱۲۱۱۱۲۲۳۳',
        groupId: null,
      })
      .expect(200);

    expect(response.body.fullName).toBe('علی رضایی جدید');
    expect(response.body.phone).toBe('09121112233');
    expect(member.fullName).toBe('علی رضایی جدید');
    expect(user.phone).toBe('09121112233');
    expect(user.fullName).toBe('علی رضایی جدید');
  });

  it('فیلدهای ناشناخته همچنان رد می‌شوند (whitelist فعال است)', async () => {
    await request(app.getHttpServer())
      .patch('/club/customers/member-1')
      .send({ fullName: 'نام', unknownField: 1 })
      .expect(400);
  });

  it('شمارهٔ نامعتبر با پیام فارسی ۴۰۰ می‌گیرد', async () => {
    const response = await request(app.getHttpServer())
      .patch('/club/customers/member-1')
      .send({ phone: '12345' })
      .expect(400);

    expect(JSON.stringify(response.body)).toContain('شماره موبایل معتبر نیست');
  });
});
