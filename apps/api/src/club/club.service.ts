import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { BarberProfile } from 'src/barber/entities/barber.entity';
import { Role } from 'src/common/enum/role.enum';
import { getPagination } from 'src/common/query';
import { toEnglishDigits } from 'src/common/utils/digits.util';
import {
  isValidIranMobile,
  normalizeIranMobile,
} from 'src/common/utils/phone.util';
import { User } from 'src/users/entities/user.entity';
import { Not, Repository } from 'typeorm';

import { DEFAULT_CUSTOMER_GROUPS } from './constants';
import { ClubCustomerQueryDto } from './dto/club-customer-query.dto';
import { CreateClubCustomerDto } from './dto/create-club-customer.dto';
import { CreateCustomerGroupDto } from './dto/create-customer-group.dto';
import { UpdateClubCustomerDto } from './dto/update-club-customer.dto';
import { ClubCustomer } from './entities/club-customer.entity';
import { CustomerGroup } from './entities/customer-group.entity';

@Injectable()
export class ClubService {
  constructor(
    @InjectRepository(ClubCustomer)
    private clubCustomerRepo: Repository<ClubCustomer>,
    @InjectRepository(CustomerGroup)
    private groupRepo: Repository<CustomerGroup>,
    @InjectRepository(BarberProfile)
    private barberProfileRepo: Repository<BarberProfile>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {}

  async getBarberProfile(userId: number): Promise<BarberProfile> {
    const barber = await this.barberProfileRepo.findOne({
      where: { userId },
    });

    if (!barber) {
      throw new NotFoundException('پروفایل آرایشگر یافت نشد');
    }

    return barber;
  }

  async ensureDefaultGroups(barberId: string): Promise<void> {
    const existing = await this.groupRepo.find({ where: { barberId } });
    const existingNames = new Set(existing.map(g => g.name));

    const toCreate = DEFAULT_CUSTOMER_GROUPS.filter(
      name => !existingNames.has(name),
    ).map(name =>
      this.groupRepo.create({
        barberId,
        name,
        isDefault: true,
      }),
    );

    if (toCreate.length) {
      await this.groupRepo.save(toCreate);
    }
  }

  async listGroups(userId: number) {
    const barber = await this.getBarberProfile(userId);
    await this.ensureDefaultGroups(barber.id);

    const groups = await this.groupRepo.find({
      where: { barberId: barber.id },
      order: { isDefault: 'DESC', createdAt: 'ASC' },
    });

    // تعداد اعضای هر گروه (فرانت این مقدار را به شکل `customersCount`
    // نمایش می‌دهد ولی قبلاً هیچ‌وقت از سرور نمی‌آمد).
    const counts = await this.clubCustomerRepo
      .createQueryBuilder('club')
      .select('club.groupId', 'groupId')
      .addSelect('COUNT(*)', 'count')
      .where('club.barberId = :barberId', { barberId: barber.id })
      .andWhere('club.groupId IS NOT NULL')
      .groupBy('club.groupId')
      .getRawMany<{ groupId: string; count: string }>();

    const countByGroup = new Map(
      (counts ?? []).map(row => [row.groupId, Number(row.count) || 0]),
    );

    return groups.map(group => ({
      ...group,
      customersCount: countByGroup.get(group.id) ?? 0,
    }));
  }

  async createGroup(userId: number, dto: CreateCustomerGroupDto) {
    const barber = await this.getBarberProfile(userId);
    await this.ensureDefaultGroups(barber.id);

    const name = dto.name.trim();
    const duplicate = await this.groupRepo.findOne({
      where: { barberId: barber.id, name },
    });

    if (duplicate) {
      throw new BadRequestException('گروهی با این نام از قبل وجود دارد');
    }

    const group = this.groupRepo.create({
      barberId: barber.id,
      name,
      isDefault: false,
    });

    return this.groupRepo.save(group);
  }

  async deleteGroup(userId: number, groupId: string) {
    const barber = await this.getBarberProfile(userId);
    const group = await this.groupRepo.findOne({
      where: { id: groupId, barberId: barber.id },
    });

    if (!group) {
      throw new NotFoundException('گروه یافت نشد');
    }

    if (group.isDefault) {
      throw new BadRequestException('گروه‌های پیش‌فرض قابل حذف نیستند');
    }

    await this.clubCustomerRepo.update(
      { groupId: group.id },
      { groupId: null },
    );

    await this.groupRepo.remove(group);

    return { message: 'گروه حذف شد' };
  }

  async listCustomers(userId: number, query: ClubCustomerQueryDto) {
    const barber = await this.getBarberProfile(userId);
    await this.ensureDefaultGroups(barber.id);

    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    // ⚠️ رابطهٔ `club.customer` عمداً join نمی‌شود: این رابطه به موجودیت
    // `User` اشاره می‌کند که ستون‌های حساسی مثل `password` (هش)، کد ملی،
    // ایمیل و نقش‌ها دارد و با `leftJoinAndSelect` همهٔ آن‌ها در پاسخ لیست
    // باشگاه به مرورگر آرایشگر فرستاده می‌شد. لیست باشگاه فقط به نام و
    // شمارهٔ ذخیره‌شده در خود رکورد باشگاه نیاز دارد.
    const qb = this.clubCustomerRepo
      .createQueryBuilder('club')
      .leftJoinAndSelect('club.group', 'group')
      .where('club.barberId = :barberId', { barberId: barber.id });

    if (query.groupId) {
      qb.andWhere('club.groupId = :groupId', { groupId: query.groupId });
    }

    if (query.search?.trim()) {
      const rawSearch = query.search.trim();
      const normalizedSearch = toEnglishDigits(rawSearch);
      if (normalizedSearch !== rawSearch) {
        qb.andWhere(
          '( club.fullName LIKE :search OR club.fullName LIKE :rawSearch OR club.phone LIKE :search )',
          { search: `%${normalizedSearch}%`, rawSearch: `%${rawSearch}%` },
        );
      } else {
        qb.andWhere(
          '( club.fullName LIKE :search OR club.phone LIKE :search )',
          {
            search: `%${normalizedSearch}%`,
          },
        );
      }
    }

    const { skip, take } = getPagination(page, limit);

    qb.skip(skip).take(take).orderBy('club.createdAt', 'DESC');

    const [data, total] = await qb.getManyAndCount();

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

  async addCustomer(userId: number, dto: CreateClubCustomerDto) {
    const barber = await this.getBarberProfile(userId);
    await this.ensureDefaultGroups(barber.id);

    const phone = this.normalizePhone(dto.phone);
    if (!phone) {
      throw new BadRequestException('شماره موبایل معتبر نیست');
    }

    return this.upsertMember(barber.id, {
      fullName: this.normalizeName(dto.fullName) || 'مشتری',
      phone,
      groupId: dto.groupId ?? null,
    });
  }

  /**
   * ویرایش مشتری باشگاه (نام، شمارهٔ موبایل و گروه).
   *
   * نکته‌های مهمی که اینجا رعایت می‌شوند:
   *  ۱. فقط فیلدهایی که واقعاً در بدنهٔ درخواست آمده‌اند اعمال می‌شوند؛ قبلاً
   *     هنگام تغییر فقط «گروه»، نامِ ذخیره‌شدهٔ باشگاه روی حساب کاربر
   *     بازنویسی می‌شد و نام واقعی کاربر از بین می‌رفت.
   *  ۲. شمارهٔ جدید علاوه بر رکورد باشگاه، روی حساب کاربر (که مبنای ارسال
   *     پیامک تأیید/یادآوری نوبت و لینک بیعانه است) هم به‌روز می‌شود؛
   *     وگرنه در لیست باشگاه شمارهٔ جدید دیده می‌شد ولی پیامک‌ها به شمارهٔ
   *     قبلی می‌رفتند.
   *  ۳. اگر شمارهٔ جدید متعلق به حساب دیگری باشد، تغییر انجام نمی‌شود
   *     (۴۰۹) تا دو حساب با یک شماره ساخته نشود.
   *  ۴. رکوردهای باشگاه همین مشتری نزد بقیهٔ آرایشگرها هم با نام/شمارهٔ
   *     جدید هم‌گام می‌شوند تا همه‌جا یکسان دیده شود.
   */
  async updateCustomer(userId: number, id: string, dto: UpdateClubCustomerDto) {
    const barber = await this.getBarberProfile(userId);
    const member = await this.clubCustomerRepo.findOne({
      where: { id, barberId: barber.id },
    });

    if (!member) {
      throw new NotFoundException('مشتری در باشگاه یافت نشد');
    }

    if (dto.groupId) {
      await this.assertGroup(barber.id, dto.groupId);
      member.groupId = dto.groupId;
    } else if (dto.groupId === null) {
      member.groupId = null;
    }

    // ── نام و نام خانوادگی ──
    let nextFullName: string | null = null;
    if (dto.fullName !== undefined) {
      const normalized = this.normalizeName(dto.fullName);
      if (!normalized) {
        throw new BadRequestException('نام و نام خانوادگی نمی‌تواند خالی باشد');
      }
      nextFullName = normalized;
      member.fullName = normalized;
    }

    // ── شمارهٔ موبایل ──
    let nextPhone: string | null = null;
    if (dto.phone !== undefined) {
      const normalizedPhone = this.normalizePhone(dto.phone);
      if (!normalizedPhone) {
        throw new BadRequestException('شماره موبایل معتبر نیست');
      }
      nextPhone = normalizedPhone;
      member.phone = normalizedPhone;
    }

    const user = await this.userRepo.findOne({
      where: { id: member.customerId },
    });

    if (user && (nextFullName !== null || nextPhone !== null)) {
      if (nextFullName !== null) {
        user.fullName = nextFullName;
      }

      if (nextPhone !== null && nextPhone !== user.phone) {
        // حساب آرایشگر/مدیر نباید از این مسیر شماره‌اش عوض شود.
        if ((user.roles ?? []).some(role => role !== Role.User)) {
          throw new BadRequestException(
            'این شماره متعلق به حساب آرایشگر یا مدیر است و از بخش باشگاه مشتریان قابل تغییر نیست',
          );
        }

        const owner = await this.userRepo.findOne({
          where: { phone: nextPhone },
        });

        if (owner && owner.id !== user.id) {
          throw new ConflictException(
            'این شماره قبلاً برای کاربر دیگری در سامانه ثبت شده است',
          );
        }

        user.phone = nextPhone;
      }

      await this.userRepo.save(user);

      // هم‌گام‌سازی رکوردهای باشگاه همین مشتری (در صورت ثبت نزد چند آرایشگر)
      await this.syncCustomerSnapshots(
        user.id,
        { fullName: nextFullName, phone: nextPhone },
        member.id,
      );
    }

    return this.clubCustomerRepo.save(member);
  }

  /**
   * اعمال نام/شمارهٔ جدید روی همهٔ رکوردهای باشگاهِ یک کاربر تا لیست همهٔ
   * آرایشگرها با دادهٔ حساب کاربر هم‌خوان بماند.
   */
  private async syncCustomerSnapshots(
    customerId: number,
    values: { fullName: string | null; phone: string | null },
    skipId: string,
  ) {
    const patch: { fullName?: string; phone?: string } = {};
    if (values.fullName) patch.fullName = values.fullName;
    if (values.phone) patch.phone = values.phone;

    if (Object.keys(patch).length === 0) return;

    await this.clubCustomerRepo.update({ customerId, id: Not(skipId) }, patch);
  }

  async removeCustomer(userId: number, id: string) {
    const barber = await this.getBarberProfile(userId);
    const member = await this.clubCustomerRepo.findOne({
      where: { id, barberId: barber.id },
    });

    if (!member) {
      throw new NotFoundException('مشتری در باشگاه یافت نشد');
    }

    await this.clubCustomerRepo.remove(member);

    return { message: 'مشتری از باشگاه حذف شد' };
  }

  /**
   * افزودن مشتری به باشگاه بعد از رزرو موفق (تایید شده).
   * اگر قبلاً عضو باشد تغییری ایجاد نمی‌شود.
   */
  async addFromSuccessfulBooking(params: {
    barberId: string;
    customerId: number;
  }) {
    const existing = await this.clubCustomerRepo.findOne({
      where: {
        barberId: params.barberId,
        customerId: params.customerId,
      },
    });

    if (existing) {
      return existing;
    }

    const user = await this.userRepo.findOne({
      where: { id: params.customerId },
    });

    if (!user) {
      return null;
    }

    const member = this.clubCustomerRepo.create({
      barberId: params.barberId,
      customerId: user.id,
      fullName: this.normalizeName(user.fullName) || 'مشتری',
      phone: user.phone,
      groupId: null,
    });

    return this.clubCustomerRepo.save(member);
  }

  async findMemberForBarber(barberId: string, clubCustomerId: string) {
    const member = await this.clubCustomerRepo.findOne({
      where: { id: clubCustomerId, barberId },
      relations: { customer: true },
    });

    if (!member) {
      throw new NotFoundException('مشتری در باشگاه شما یافت نشد');
    }

    return member;
  }

  private async upsertMember(
    barberId: string,
    data: {
      fullName: string;
      phone: string;
      groupId: string | null;
    },
  ) {
    if (data.groupId) {
      await this.assertGroup(barberId, data.groupId);
    }

    const user = await this.findOrCreateUser(data);

    const existing = await this.clubCustomerRepo.findOne({
      where: { barberId, customerId: user.id },
    });

    if (existing) {
      throw new BadRequestException(
        'این مشتری از قبل در باشگاه مشتریان شما ثبت شده است',
      );
    }

    const member = this.clubCustomerRepo.create({
      barberId,
      customerId: user.id,
      fullName: data.fullName,
      // شمارهٔ واردشده توسط آرایشگر (نرمال‌شده) ذخیره می‌شود؛ برای کاربر
      // موجود با همان شماره پیدا شده است، پس تفاوتی با `user.phone` ندارد.
      phone: data.phone || user.phone,
      groupId: data.groupId,
    });

    return this.clubCustomerRepo.save(member);
  }

  private async findOrCreateUser(data: {
    fullName: string;
    phone: string;
  }): Promise<User> {
    let user = await this.userRepo.findOne({ where: { phone: data.phone } });

    const { fullName } = data;

    if (!user) {
      user = this.userRepo.create({
        phone: data.phone,
        fullName,
        isActive: true,
        roles: [Role.User],
      });

      return this.userRepo.save(user);
    }

    if (!user.fullName || user.fullName.startsWith('کاربر ')) {
      user.fullName = fullName;
      await this.userRepo.save(user);
    }

    return user;
  }

  private async assertGroup(barberId: string, groupId: string) {
    const group = await this.groupRepo.findOne({
      where: { id: groupId, barberId },
    });

    if (!group) {
      throw new NotFoundException('گروه انتخاب شده یافت نشد');
    }

    return group;
  }

  private normalizeName(name: string) {
    return (name || '').trim().replace(/\s+/g, ' ');
  }

  /** شمارهٔ موبایل را به قالب یکسان `09xxxxxxxxx` می‌برد؛ نامعتبر → null */
  private normalizePhone(phone: string | null | undefined) {
    const normalized = normalizeIranMobile(phone);
    return typeof normalized === 'string' && isValidIranMobile(normalized)
      ? normalized
      : null;
  }
}
