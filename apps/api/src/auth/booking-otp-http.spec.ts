import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import { BarberService } from 'src/barber/barber.service';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { ResponseInterceptor } from 'src/common/interceptors/response.interceptor';
import { SmsIrService } from 'src/common/services/sms-ir.service';
import { FilesService } from 'src/files/files.service';
import { OtpService } from 'src/otp/otp.service';
import { RedisModule } from 'src/redis/redis.module';
import { RedisService } from 'src/redis/redis.service';
import { ReferralService } from 'src/referral/referral.service';
import { ServicesService } from 'src/services/services.service';
import { CreateUserDto } from 'src/users/dto/create-user.dto';
import { UsersService } from 'src/users/users.service';
import request from 'supertest';
import { DataSource } from 'typeorm';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

const phone = '09123456789';

type TestUser = {
  id: number;
  phone: string;
  fullName: string;
  gender: string;
  roles: string[];
  isActive: boolean;
};

function cookieValue(response: request.Response, name: string) {
  const cookies = (response.headers['set-cookie'] ?? []) as unknown as string[];
  const cookie = cookies.find(value => value.startsWith(`${name}=`));
  if (!cookie) throw new Error(`Missing ${name}`);
  return cookie.split(';')[0];
}

describe('quick booking OTP contract over HTTP', () => {
  let app: INestApplication;
  const savedEnv = {
    access: process.env.JWT_ACCESS_SECRET,
    refresh: process.env.JWT_REFRESH_SECRET,
    otp: process.env.OTP_UNIVERSAL_CODE,
  };
  const redisValues = new Map<string, string>();
  const expirations = new Map<string, number>();
  const redis = {
    isReady: true,
    get: jest.fn((key: string) =>
      Promise.resolve(redisValues.get(key) ?? null),
    ),
    set: jest.fn((key: string, value: string, options?: { EX: number }) => {
      redisValues.set(key, value);
      if (options) expirations.set(key, options.EX);
      return Promise.resolve('OK');
    }),
    del: jest.fn((key: string) =>
      Promise.resolve(redisValues.delete(key) ? 1 : 0),
    ),
    incr: jest.fn((key: string) => {
      const value = Number(redisValues.get(key) ?? 0) + 1;
      redisValues.set(key, String(value));
      return Promise.resolve(value);
    }),
    decr: jest.fn((key: string) => {
      const value = Number(redisValues.get(key) ?? 0) - 1;
      redisValues.set(key, String(value));
      return Promise.resolve(value);
    }),
    expire: jest.fn(() => Promise.resolve(true)),
  };
  const records = new Map<string, TestUser>();
  const users = {
    findWithPhone: jest.fn((value: string) =>
      Promise.resolve(records.get(value) ?? null),
    ),
    findOne: jest.fn((id: number) =>
      Promise.resolve(
        [...records.values()].find(user => user.id === id) ?? null,
      ),
    ),
    create: jest.fn((dto: CreateUserDto) => {
      const user: TestUser = {
        id: 42,
        phone: dto.phone,
        fullName: dto.fullName,
        gender: dto.gender ?? '',
        roles: ['user'],
        isActive: true,
      };
      records.set(user.phone, user);
      return Promise.resolve(user);
    }),
  };
  const sms = { sendVerify: jest.fn().mockResolvedValue(undefined) };

  beforeAll(async () => {
    process.env.JWT_ACCESS_SECRET = 'booking-test-access';
    process.env.JWT_REFRESH_SECRET = 'booking-test-refresh';
    process.env.OTP_UNIVERSAL_CODE = 'false';
    const module = await Test.createTestingModule({
      imports: [RedisModule],
      controllers: [AuthController],
      providers: [
        AuthService,
        AuthGuard,
        JwtService,
        OtpService,
        { provide: UsersService, useValue: users },
        { provide: SmsIrService, useValue: sms },
        { provide: BarberService, useValue: {} },
        { provide: ServicesService, useValue: {} },
        { provide: ReferralService, useValue: {} },
        { provide: DataSource, useValue: {} },
        { provide: FilesService, useValue: {} },
      ],
    })
      .overrideProvider(RedisService)
      .useValue({ getClient: () => redis })
      .compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api');
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    app.useGlobalInterceptors(new ResponseInterceptor());
    await app.init();
  });

  beforeEach(() => {
    redisValues.clear();
    expirations.clear();
    records.clear();
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await app.close();
    for (const [key, value] of Object.entries({
      JWT_ACCESS_SECRET: savedEnv.access,
      JWT_REFRESH_SECRET: savedEnv.refresh,
      OTP_UNIVERSAL_CODE: savedEnv.otp,
    })) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  async function sendCode() {
    await request(app.getHttpServer())
      .post('/api/auth/send-otp')
      .send({ phone })
      .expect(201);
    const parameters = sms.sendVerify.mock.calls[0][1] as {
      name: string;
      value: string;
    }[];
    const code = parameters.find(parameter => parameter.name === 'OTP')?.value;
    expect(code).toMatch(/^\d{4}$/);
    return code!;
  }

  it('new user verifies, supplies name and gender, and receives a usable session', async () => {
    const code = await sendCode();
    const verified = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ phone, code })
      .expect(201);
    expect(verified.body.data).toEqual({ newUser: true, phone });
    expect(verified.headers['set-cookie']).toBeUndefined();
    expect(redisValues.has(`otp:${phone}`)).toBe(false);
    expect(expirations.get(`otp:verified:${phone}`)).toBe(600);

    const registered = await request(app.getHttpServer())
      .post('/api/auth/sign-up')
      .send({ phone, code, fullName: 'سارا نمونه', gender: 'female' })
      .expect(201);
    expect(users.create).toHaveBeenCalledWith(
      expect.objectContaining({
        phone,
        code,
        fullName: 'سارا نمونه',
        gender: 'female',
      }),
    );
    const access = cookieValue(registered, 'access_token');
    cookieValue(registered, 'refresh_token');
    const me = await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Cookie', access)
      .expect(200);
    expect(me.body.data).toMatchObject({
      fullName: 'سارا نمونه',
      gender: 'female',
      roles: ['user'],
    });
  });

  it('an existing user gets a session after the same real OTP verification', async () => {
    records.set(phone, {
      id: 42,
      phone,
      fullName: 'کاربر موجود',
      gender: 'male',
      roles: ['user'],
      isActive: true,
    });
    const code = await sendCode();
    const loggedIn = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ phone, code })
      .expect(201);
    expect(loggedIn.body.data).toEqual({ newUser: false });
    expect(users.create).not.toHaveBeenCalled();
    const access = cookieValue(loggedIn, 'access_token');
    cookieValue(loggedIn, 'refresh_token');
    await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Cookie', access)
      .expect(200);
  });

  it('can log into an account created between verification and signup', async () => {
    const code = await sendCode();
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ phone, code })
      .expect(201);
    records.set(phone, {
      id: 42,
      phone,
      fullName: 'کاربر جدید دیگر',
      gender: 'female',
      roles: ['user'],
      isActive: true,
    });
    await request(app.getHttpServer())
      .post('/api/auth/sign-up')
      .send({ phone, code, fullName: 'سارا نمونه', gender: 'female' })
      .expect(409);
    const login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ phone, code })
      .expect(201);
    expect(login.body.data).toEqual({ newUser: false });
    cookieValue(login, 'access_token');
  });

  it('an expired verified code cannot create an account or issue cookies', async () => {
    const code = await sendCode();
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ phone, code })
      .expect(201);
    // Simulate Redis expiry of the 10-minute verified-code window.
    redisValues.delete(`otp:verified:${phone}`);
    const response = await request(app.getHttpServer())
      .post('/api/auth/sign-up')
      .send({ phone, code, fullName: 'سارا نمونه', gender: 'female' })
      .expect(400);
    expect(response.headers['set-cookie']).toBeUndefined();
    expect(users.create).not.toHaveBeenCalled();
  });
});
