import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Role } from 'src/common/enum/role.enum';
import {
  applySearch,
  applySort,
  getPagination,
  QueryDto,
} from 'src/common/query';
import { hasRole } from 'src/common/utils/roles.util';
import { EntityManager, Repository } from 'typeorm';

import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private usersRepository: Repository<User>,
  ) {}

  async create(createUserDto: CreateUserDto) {
    const { code: _code, ...safeData } = createUserDto;
    const user = this.usersRepository.create({
      ...safeData,
      roles: [Role.User],
      isActive: true,
    });

    return await this.usersRepository.save(user);
  }

  async createWithRoles(
    data: Partial<User>,
    roles: Role[],
    manager?: EntityManager,
  ): Promise<User> {
    const repository = manager
      ? manager.getRepository(User)
      : this.usersRepository;

    const user = repository.create({
      ...data,
      roles,
    });
    return repository.save(user);
  }

  async findWithPhone(phone: string) {
    return await this.usersRepository.findOne({
      where: { phone },
      relations: { city: true, province: true },
    });
  }

  async findWithPhoneWithPassword(phone: string) {
    return await this.usersRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.city', 'city')
      .leftJoinAndSelect('user.province', 'province')
      .where('user.phone = :phone', { phone })
      .addSelect('user.password')
      .getOne();
  }

  async findByIdWithPassword(id: number) {
    return this.usersRepository.findOne({ where: { id } });
  }

  async updatePassword(id: number, hashedPassword: string) {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException('کاربر یافت نشد');
    user.password = hashedPassword;
    return this.usersRepository.save(user);
  }

  async findAll(query: QueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const qb = this.usersRepository.createQueryBuilder('user');

    // search
    applySearch(qb, query.search, ['user.fullName', 'user.phone']);

    // sort
    applySort(qb, query.sort, ['user.id', 'user.fullName', 'user.createdAt']);

    // pagination
    const { skip, take } = getPagination(page, limit);
    qb.skip(skip).take(take);

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      pagination: {
        page: page,
        limit: limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number) {
    const payload = await this.usersRepository.findOne({
      where: { id },
      relations: { city: true, province: true },
    });
    return payload;
  }

  async findOneForViewer(id: number, viewer: { id: number; roles?: string[] }) {
    if (viewer.id !== id && !hasRole(viewer.roles, Role.Admin)) {
      throw new ForbiddenException('access denied');
    }
    const user = await this.findOne(id);
    if (!user) throw new NotFoundException();
    return user;
  }

  async update(id: number, updateUserDto: UpdateUserDto, user: any) {
    if (user.id !== id && !hasRole(user.roles, Role.Admin)) {
      throw new ForbiddenException('access denied');
    }

    const userEntity = await this.usersRepository.findOne({
      where: { id },
    });

    if (!userEntity) throw new NotFoundException();

    Object.assign(userEntity, updateUserDto);

    return this.usersRepository.save(userEntity);
  }

  async updateMe(updateUserDto: UpdateUserDto, user: any) {
    if (!user.id) {
      throw new ForbiddenException('access denied');
    }

    const userEntity = await this.usersRepository.findOne({
      where: { id: user.id },
    });

    if (!userEntity) throw new NotFoundException();

    Object.assign(userEntity, updateUserDto);

    return this.usersRepository.save(userEntity);
  }

  async remove(id: number) {
    const user = await this.usersRepository.findOne({
      where: { id },
    });

    if (!user) throw new NotFoundException();

    return this.usersRepository.delete(id);
  }
}
