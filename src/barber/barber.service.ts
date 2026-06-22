import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { getPagination, QueryDto } from 'src/common/query';
import { User } from 'src/users/entities/user.entity';
import { Brackets, Repository } from 'typeorm';

import { CreateBarberDto } from './dto/create-barber.dto';
import { UpdateBarberDto } from './dto/update-barber.dto';

@Injectable()
export class BarberService {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {}

  async create(createBarberDto: CreateBarberDto) {
    return 'This action adds a new barber';
  }

  async findAll(
    query: QueryDto,
    filters?: {
      categoryIds?: number[];
      colorIds?: number[];
      sizeIds?: number[];
      city?: boolean;
    },
  ) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const qb = this.userRepo.createQueryBuilder('user');

    qb.where('user.roles LIKE :role', { role: '%Barber%' });

    qb.leftJoinAndSelect('user.barberProfile', 'profile');

    qb.andWhere('profile.isApproved = :isApproved', {
      isApproved: true,
    });

    if (filters?.city) {
      qb.andWhere('profile.city = :city', { city: filters.city });
    }

    if (query.search) {
      qb.andWhere(
        new Brackets(qb => {
          qb.where('user.fullName LIKE :search')
            .orWhere('profile.salonName LIKE :search')
            .orWhere('service.name LIKE :search');
        }),
        { search: `%${query.search}%` },
      );
    }

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

  findOne(id: number) {
    return `This action returns a #${id} barber`;
  }

  update(id: number, updateBarberDto: UpdateBarberDto) {
    return `This action updates a #${id} barber`;
  }

  remove(id: number) {
    return `This action removes a #${id} barber`;
  }
}
