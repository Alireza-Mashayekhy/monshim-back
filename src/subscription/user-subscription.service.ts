import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { SubscriptionPlan } from 'src/subscription/entities/subscription-plan.entity';
import { Repository } from 'typeorm';

import { CreateUserSubscriptionDto } from './dto/create-user-subscription.dto';
import {
  UserSubscription,
  UserSubscriptionStatus,
} from './entities/user-subscription.entity';

@Injectable()
export class UserSubscriptionService {
  constructor(
    @InjectRepository(UserSubscription)
    private readonly userSubscriptionRepo: Repository<UserSubscription>,

    @InjectRepository(SubscriptionPlan)
    private readonly subscriptionPlanRepo: Repository<SubscriptionPlan>,
  ) {}

  create(
    _userId: number,
    _dto: CreateUserSubscriptionDto,
  ): Promise<UserSubscription> {
    throw new BadRequestException(
      'برای فعال‌سازی اشتراک، پرداخت آنلاین الزامی است. لطفاً از طریق درگاه پرداخت زیبال اقدام نمایید.',
    );
  }

  async getCurrent(userId: number) {
    const userSubscription = await this.userSubscriptionRepo.findOne({
      where: {
        userId,
        status: UserSubscriptionStatus.ACTIVE,
      },
      relations: {
        subscriptionPlan: true,
      },
      order: {
        endDate: 'DESC',
      },
    });

    if (!userSubscription) {
      return null;
    }

    // اگر منقضی شده
    if (userSubscription.endDate <= new Date()) {
      userSubscription.status = UserSubscriptionStatus.EXPIRED;

      await this.userSubscriptionRepo.save(userSubscription);

      return null;
    }

    return userSubscription;
  }

  async findAll(userId: number) {
    return this.userSubscriptionRepo.find({
      where: {
        userId,
      },
      relations: {
        subscriptionPlan: true,
      },
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async findOne(id: string, userId: number) {
    const userSubscription = await this.userSubscriptionRepo.findOne({
      where: {
        id,
        userId,
      },
      relations: {
        subscriptionPlan: true,
      },
    });

    if (!userSubscription) {
      throw new NotFoundException('اشتراک کاربر یافت نشد');
    }

    return userSubscription;
  }

  async getActivePlans() {
    return this.subscriptionPlanRepo.find({
      where: {
        isActive: true,
      },
      order: {
        sortOrder: 'ASC',
        price: 'ASC',
      },
    });
  }
}
