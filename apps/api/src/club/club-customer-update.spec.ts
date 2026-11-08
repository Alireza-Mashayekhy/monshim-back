import { BadRequestException, ConflictException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { Role } from 'src/common/enum/role.enum';
import { normalizeIranMobile } from 'src/common/utils/phone.util';

import { ClubService } from './club.service';
import { UpdateClubCustomerDto } from './dto/update-club-customer.dto';
import { ClubCustomer } from './entities/club-customer.entity';

describe('ClubService.updateCustomer — ویرایش مشتری باشگاه', () => {
  function buildHarness(
    options: {
      member?: Partial<ClubCustomer>;
      users?: Array<{
        id: number;
        phone: string;
        fullName: string;
        roles?: Role[];
      }>;
    } = {},
  ) {
    const member = {
      id: 'member-1',
      barberId: 'barber-1',
      customerId: 42,
      groupId: null,
      fullName: 'علی رضایی',
      phone: '09120000000',
      ...options.member,
    } as unknown as ClubCustomer;

    const users = options.users ?? [
      {
        id: 42,
        phone: '09120000000',
        fullName: 'علی رضایی',
        roles: [Role.User],
      },
    ];

    const userById = new Map(users.map(user => [user.id, user]));
    const userByPhone = new Map(users.map(user => [user.phone, user]));

    const barberProfileRepo: any = {
      findOne: jest.fn().mockResolvedValue({ id: 'barber-1', userId: 7 }),
    };

    const clubCustomerRepo: any = {
      findOne: jest.fn().mockResolvedValue(member),
      save: jest.fn((entity: ClubCustomer) =>
        Promise.resolve({ ...member, ...entity }),
      ),
      create: jest.fn((data: Partial<ClubCustomer>) => data),
      update: jest.fn(() => Promise.resolve({ affected: 1 })),
    };

    const groupRepo: any = {
      findOne: jest.fn().mockResolvedValue({ id: 'group-1' }),
      find: jest.fn().mockResolvedValue([]),
      save: jest.fn(),
      create: jest.fn(),
    };

    const userRepo: any = {
      findOne: jest.fn(({ where }: any) => {
        if (where?.id) return Promise.resolve(userById.get(where.id) ?? null);
        if (where?.phone) {
          return Promise.resolve(userByPhone.get(where.phone) ?? null);
        }
        return Promise.resolve(null);
      }),
      save: jest.fn((entity: any) => Promise.resolve({ ...entity })),
    };

    const service = new ClubService(
      clubCustomerRepo,
      groupRepo,
      barberProfileRepo,
      userRepo,
    );

    return { service, member, userRepo, clubCustomerRepo, users };
  }

  it('نام، شماره و گروه را هم روی رکورد باشگاه و هم روی حساب کاربر ذخیره می‌کند', async () => {
    const { service, member, userRepo } = buildHarness();

    const result = await service.updateCustomer(7, 'member-1', {
      fullName: '  علی   رضایی جدید ',
      phone: '09121112233',
    });

    expect(result.fullName).toBe('علی رضایی جدید');
    expect(result.phone).toBe('09121112233');

    const savedUser = userRepo.save.mock.calls[0][0];
    expect(savedUser.id).toBe(42);
    expect(savedUser.fullName).toBe('علی رضایی جدید');
    expect(savedUser.phone).toBe('09121112233');
    expect(member.phone).toBe('09121112233');
  });

  it('شماره را با ارقام فارسی و پیش‌شمارهٔ بین‌المللی هم نرمال می‌کند', async () => {
    const { service, userRepo } = buildHarness();

    const result = await service.updateCustomer(7, 'member-1', {
      phone: '+98 ۹۱۲ ۳۴۵ ۶۷۸۹',
    });

    expect(result.phone).toBe('09123456789');
    expect(userRepo.save.mock.calls[0][0].phone).toBe('09123456789');
  });

  it('تغییر فقط گروه، نام حساب کاربر را با نام قدیمی باشگاه بازنویسی نمی‌کند', async () => {
    const { service, userRepo, member } = buildHarness({
      member: { fullName: 'علی' },
      users: [
        {
          id: 42,
          phone: '09120000000',
          fullName: 'علی رضایی (نام واقعی کاربر)',
          roles: [Role.User],
        },
      ],
    });

    const result = await service.updateCustomer(7, 'member-1', {
      groupId: 'group-1',
    });

    expect(result.groupId).toBe('group-1');
    expect(member.fullName).toBe('علی');
    expect(userRepo.save).not.toHaveBeenCalled();
  });

  it('اگر شمارهٔ جدید متعلق به کاربر دیگری باشد، تغییر انجام نمی‌شود', async () => {
    const { service, userRepo, clubCustomerRepo } = buildHarness({
      users: [
        { id: 42, phone: '09120000000', fullName: 'علی', roles: [Role.User] },
        { id: 99, phone: '09129999999', fullName: 'رضا', roles: [Role.User] },
      ],
    });

    await expect(
      service.updateCustomer(7, 'member-1', { phone: '09129999999' }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(userRepo.save).not.toHaveBeenCalled();
    expect(clubCustomerRepo.save).not.toHaveBeenCalled();
  });

  it('نام خالی را رد می‌کند تا مشتری بی‌نام ذخیره نشود', async () => {
    const { service } = buildHarness();

    await expect(
      service.updateCustomer(7, 'member-1', { fullName: '   ' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('شمارهٔ حساب آرایشگر/مدیر از مسیر باشگاه تغییر نمی‌کند', async () => {
    const { service } = buildHarness({
      users: [
        {
          id: 42,
          phone: '09120000000',
          fullName: 'آرایشگر',
          roles: [Role.User, Role.Barber],
        },
      ],
    });

    await expect(
      service.updateCustomer(7, 'member-1', { phone: '09121112233' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('رکورد باشگاهِ همین مشتری نزد سایر آرایشگرها هم هم‌گام می‌شود', async () => {
    const { service, clubCustomerRepo } = buildHarness();

    await service.updateCustomer(7, 'member-1', {
      fullName: 'نام همگام',
      phone: '09121112233',
    });

    expect(clubCustomerRepo.update).toHaveBeenCalledWith(
      expect.objectContaining({ customerId: 42 }),
      { fullName: 'نام همگام', phone: '09121112233' },
    );
  });
});

describe('normalizeIranMobile', () => {
  it.each([
    ['09123456789', '09123456789'],
    ['۰۹۱۲۳۴۵۶۷۸۹', '09123456789'],
    ['+989123456789', '09123456789'],
    ['00989123456789', '09123456789'],
    ['9123456789', '09123456789'],
    ['0912 345 6789', '09123456789'],
    ['0912-345-6789', '09123456789'],
  ])('%s → %s', (input, expected) => {
    expect(normalizeIranMobile(input)).toBe(expected);
  });

  it('مقدار نامعتبر را دست‌نخورده (فقط نرمال‌شده) برمی‌گرداند تا اعتبارسنجی رد کند', () => {
    expect(normalizeIranMobile('12345')).toBe('12345');
  });
});

describe('UpdateClubCustomerDto — پذیرش شماره و جلوگیری از خطای ۴۰۰', () => {
  it('بدنهٔ واقعی فرانت (نام + شماره + گروه) را می‌پذیرد و شماره را نرمال می‌کند', async () => {
    const dto = plainToInstance(UpdateClubCustomerDto, {
      fullName: 'علی رضایی',
      phone: '۰۹۱۲۳۴۵۶۷۸۹',
      groupId: null,
    });

    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    expect(errors).toHaveLength(0);
    expect(dto.phone).toBe('09123456789');
  });

  it('شمارهٔ نامعتبر را با پیام فارسی رد می‌کند', async () => {
    const dto = plainToInstance(UpdateClubCustomerDto, { phone: '12345' });
    const errors = await validate(dto);

    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('phone');
  });
});
