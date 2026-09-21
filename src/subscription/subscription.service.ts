import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import { SUBSCRIPTION_PLANS } from './constants';
import { UpdateSubscriptionPlanDto } from './dto/update-subscription.dto';
import { SubscriptionPlan } from './entities/subscription-plan.entity';

@Injectable()
export class SubscriptionService implements OnModuleInit {
  constructor(
    @InjectRepository(SubscriptionPlan)
    private readonly subscriptionPlanRepo: Repository<SubscriptionPlan>,
  ) {}

  async onModuleInit() {
    await this.seedPlans();
  }

  async seedPlans() {
    for (const definition of SUBSCRIPTION_PLANS) {
      const existing = await this.subscriptionPlanRepo.findOne({
        where: { planKey: definition.planKey },
      });

      if (existing) {
        existing.name = definition.name;
        existing.description = definition.description;
        existing.durationDays = definition.durationDays;
        existing.sortOrder = definition.sortOrder;
        existing.isActive = true;

        await this.subscriptionPlanRepo.save(existing);
        continue;
      }

      const plan = this.subscriptionPlanRepo.create({
        planKey: definition.planKey,
        name: definition.name,
        smsCount: definition.smsCount,
        price: definition.price,
        durationDays: definition.durationDays,
        description: definition.description,
        isActive: true,
        sortOrder: definition.sortOrder,
      });

      await this.subscriptionPlanRepo.save(plan);
    }

    // غیرفعال کردن پلن‌های قدیمی که هارد‌کد نیستند
    await this.subscriptionPlanRepo
      .createQueryBuilder()
      .update(SubscriptionPlan)
      .set({ isActive: false })
      .where('plan_key IS NULL OR plan_key NOT IN (:...keys)', {
        keys: SUBSCRIPTION_PLANS.map(plan => plan.planKey),
      })
      .execute();
  }

  async findAll() {
    return this.subscriptionPlanRepo.find({
      where: {
        planKey: In(SUBSCRIPTION_PLANS.map(plan => plan.planKey)),
      },
      order: {
        sortOrder: 'ASC',
      },
    });
  }

  async findActive() {
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

  async findOne(id: string) {
    const plan = await this.subscriptionPlanRepo.findOne({
      where: { id },
    });

    if (!plan) {
      throw new NotFoundException('پلن اشتراک مورد نظر یافت نشد');
    }

    return plan;
  }

  async update(id: string, dto: UpdateSubscriptionPlanDto) {
    const plan = await this.findOne(id);

    if (dto.price !== undefined) {
      plan.price = dto.price;
    }

    if (dto.smsCount !== undefined) {
      plan.smsCount = dto.smsCount;
    }

    return this.subscriptionPlanRepo.save(plan);
  }
}
