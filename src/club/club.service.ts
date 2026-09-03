import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { BarberProfile } from 'src/barber/entities/barber.entity';
import { Role } from 'src/common/enum/role.enum';
import { getPagination } from 'src/common/query';
import { User } from 'src/users/entities/user.entity';
import { Repository } from 'typeorm';

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

    return this.groupRepo.find({
      where: { barberId: barber.id },
      order: { isDefault: 'DESC', createdAt: 'ASC' },
    });
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

    const qb = this.clubCustomerRepo
      .createQueryBuilder('club')
      .leftJoinAndSelect('club.group', 'group')
      .leftJoinAndSelect('club.customer', 'customer')
      .where('club.barberId = :barberId', { barberId: barber.id });

    if (query.groupId) {
      qb.andWhere('club.groupId = :groupId', { groupId: query.groupId });
    }

    if (query.search) {
      qb.andWhere(
        '(club.firstName LIKE :search OR club.lastName LIKE :search OR club.phone LIKE :search)',
        { search: `%${query.search}%` },
      );
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

    return this.upsertMember(barber.id, {
      firstName: dto.firstName.trim(),
      lastName: dto.lastName.trim(),
      phone: dto.phone,
      groupId: dto.groupId ?? null,
    });
  }

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

    if (dto.firstName) member.firstName = dto.firstName.trim();
    if (dto.lastName) member.lastName = dto.lastName.trim();

    const user = await this.userRepo.findOne({
      where: { id: member.customerId },
    });

    if (user) {
      user.fullName = `${member.firstName} ${member.lastName}`.trim();
      await this.userRepo.save(user);
    }

    return this.clubCustomerRepo.save(member);
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

    const { firstName, lastName } = this.splitFullName(user.fullName);

    const member = this.clubCustomerRepo.create({
      barberId: params.barberId,
      customerId: user.id,
      firstName,
      lastName,
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
      firstName: string;
      lastName: string;
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
      firstName: data.firstName,
      lastName: data.lastName,
      phone: user.phone,
      groupId: data.groupId,
    });

    return this.clubCustomerRepo.save(member);
  }

  private async findOrCreateUser(data: {
    firstName: string;
    lastName: string;
    phone: string;
  }): Promise<User> {
    let user = await this.userRepo.findOne({ where: { phone: data.phone } });

    const fullName = `${data.firstName} ${data.lastName}`.trim();

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

  private splitFullName(fullName: string) {
    const parts = (fullName || '').trim().split(/\s+/);
    const firstName = parts.shift() || 'مشتری';
    const lastName = parts.join(' ') || '';

    return { firstName, lastName };
  }
}
