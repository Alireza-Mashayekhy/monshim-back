import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { BaleNotificationService } from 'src/bale/bale-notification.service';
import {
  BARBER_MODERATED_DIFF_KEYS,
  BARBER_MODERATED_FIELD_LABELS,
  BarberPendingChanges,
  BarberProfile,
  getBarberChangedFieldLabels,
} from 'src/barber/entities/barber.entity';
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
    @Optional()
    @InjectRepository(BarberProfile)
    private barberProfileRepository?: Repository<BarberProfile>,
    @Optional()
    private readonly baleNotificationService?: BaleNotificationService,
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

  async findWithNationalCode(nationalCode: string) {
    return await this.usersRepository.findOne({
      where: { nationalCode },
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

  async findMe(id: number) {
    const payload = await this.usersRepository.findOne({
      where: { id },
      relations: { city: true, province: true, barberProfile: true },
    });
    if (!payload) return null;

    const profile = payload.barberProfile;
    if (
      profile?.isApproved &&
      profile.pendingStatus &&
      profile.pendingStatus !== 'none' &&
      profile.pendingChanges?.fullName
    ) {
      return {
        ...payload,
        fullName: profile.pendingChanges.fullName,
      };
    }

    return payload;
  }

  async findOneForViewer(id: number, viewer: { id: number; roles?: string[] }) {
    if (viewer.id !== id && !hasRole(viewer.roles, Role.Admin)) {
      throw new ForbiddenException('access denied');
    }
    const user =
      viewer.id === id && !hasRole(viewer.roles, Role.Admin)
        ? await this.findMe(id)
        : await this.findOne(id);
    if (!user) throw new NotFoundException();
    return user;
  }

  private async stageBarberFullNameIfNeeded(
    userEntity: User,
    dto: UpdateUserDto,
    byAdmin: boolean,
  ): Promise<{
    stagedFullName: string | null;
    shouldNotifyBale: boolean;
    changedFields: string[];
  }> {
    const profile = userEntity.barberProfile;
    if (
      byAdmin ||
      !profile?.isApproved ||
      dto.fullName === undefined ||
      !dto.fullName.trim() ||
      !this.barberProfileRepository
    ) {
      return {
        stagedFullName: null,
        shouldNotifyBale: false,
        changedFields: [],
      };
    }

    const previousPendingStatus = profile.pendingStatus || 'none';
    const previousDraft = profile.pendingChanges ?? {};
    const nextFullName = dto.fullName.trim();
    const draft: BarberPendingChanges = {
      ...previousDraft,
      fullName: nextFullName,
    };

    if (nextFullName === (userEntity.fullName ?? '').trim()) {
      delete draft.fullName;
    }

    const hasDiff = BARBER_MODERATED_DIFF_KEYS.some(
      key => draft[key] !== undefined,
    );
    const shouldNotifyBale = Boolean(
      hasDiff &&
      (previousPendingStatus !== 'pending' ||
        draft.fullName !== previousDraft.fullName),
    );
    const changedFields = hasDiff ? getBarberChangedFieldLabels(draft) : [];

    if (hasDiff) {
      draft.submittedAt = new Date().toISOString();
      profile.pendingChanges = draft;
      profile.pendingStatus = 'pending';
      profile.pendingRejectionReason = null;
    } else {
      profile.pendingChanges = null;
      profile.pendingStatus = 'none';
      profile.pendingRejectionReason = null;
    }

    await this.barberProfileRepository.save(profile);
    return { stagedFullName: nextFullName, shouldNotifyBale, changedFields };
  }

  async update(id: number, updateUserDto: UpdateUserDto, user: any) {
    const isAdmin = hasRole(user.roles, Role.Admin);
    if (user.id !== id && !isAdmin) {
      throw new ForbiddenException('access denied');
    }

    const userEntity = await this.usersRepository.findOne({
      where: { id },
      relations: { barberProfile: true },
    });

    if (!userEntity) throw new NotFoundException();

    const { stagedFullName, shouldNotifyBale, changedFields } =
      await this.stageBarberFullNameIfNeeded(
        userEntity,
        updateUserDto,
        isAdmin,
      );

    const unapprovedBarberChangedFullName = Boolean(
      !isAdmin &&
      userEntity.barberProfile &&
      !userEntity.barberProfile.isApproved &&
      updateUserDto.fullName !== undefined &&
      updateUserDto.fullName.trim() &&
      updateUserDto.fullName.trim() !== (userEntity.fullName ?? '').trim(),
    );

    if (
      unapprovedBarberChangedFullName &&
      userEntity.barberProfile?.rejectionReason &&
      this.barberProfileRepository
    ) {
      userEntity.barberProfile.rejectionReason = null;
      await this.barberProfileRepository.save(userEntity.barberProfile);
    }

    const safeDto = { ...updateUserDto };
    if (stagedFullName !== null) {
      delete safeDto.fullName;
    }

    Object.assign(userEntity, safeDto);
    const saved = await this.usersRepository.save(userEntity);

    if (shouldNotifyBale) {
      void this.baleNotificationService?.notifyBarberProfileEdited?.({
        userId: userEntity.id,
        changedFields,
        isApprovedBarber: true,
      });
    } else if (unapprovedBarberChangedFullName) {
      void this.baleNotificationService?.notifyBarberProfileEdited?.({
        userId: userEntity.id,
        changedFields: [BARBER_MODERATED_FIELD_LABELS.fullName],
        isApprovedBarber: false,
      });
    }

    return stagedFullName !== null
      ? { ...saved, fullName: stagedFullName }
      : saved;
  }

  async updateMe(updateUserDto: UpdateUserDto, user: any) {
    if (!user.id) {
      throw new ForbiddenException('access denied');
    }

    return this.update(user.id, updateUserDto, user);
  }

  async remove(id: number) {
    const user = await this.usersRepository.findOne({
      where: { id },
    });

    if (!user) throw new NotFoundException();

    return this.usersRepository.delete(id);
  }
}
