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

  async create(
    userId: number,
    dto: CreateUserSubscriptionDto,
  ): Promise<UserSubscription> {
    // پیدا کردن پلن
    const plan = await this.subscriptionPlanRepo.findOne({
      where: {
        id: dto.subscriptionPlanId,
        isActive: true,
      },
    });

    if (!plan) {
      throw new NotFoundException('پلن اشتراک مورد نظر یافت نشد یا فعال نیست');
    }

    const now = new Date();

    // منقضی کردن اشتراک‌های قبلی
    await this.userSubscriptionRepo
      .createQueryBuilder()
      .update(UserSubscription)
      .set({
        status: UserSubscriptionStatus.EXPIRED,
      })
      .where('user_id = :userId', { userId })
      .andWhere('status = :status', {
        status: UserSubscriptionStatus.ACTIVE,
      })
      .andWhere('end_date <= :now', { now })
      .execute();

    // بررسی اشتراک فعال
    const activeSubscription = await this.userSubscriptionRepo.findOne({
      where: {
        userId,
        status: UserSubscriptionStatus.ACTIVE,
      },
      relations: {
        subscriptionPlan: true,
      },
    });

    if (activeSubscription) {
      throw new BadRequestException('شما در حال حاضر یک اشتراک فعال دارید');
    }

    // محاسبه تاریخ پایان
    const startDate = new Date();

    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + plan.durationDays);

    // ایجاد اشتراک کاربر
    const userSubscription = this.userSubscriptionRepo.create({
      userId,
      subscriptionPlanId: plan.id,
      price: plan.price,
      status: UserSubscriptionStatus.ACTIVE,
      startDate,
      endDate,
    });

    return this.userSubscriptionRepo.save(userSubscription);
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
}
