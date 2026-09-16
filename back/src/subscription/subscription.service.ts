import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CreateSubscriptionPlanDto } from './dto/create-subscription.dto';
import { UpdateSubscriptionPlanDto } from './dto/update-subscription.dto';
import { SubscriptionPlan } from './entities/subscription-plan.entity';

@Injectable()
export class SubscriptionService {
  constructor(
    @InjectRepository(SubscriptionPlan)
    private readonly subscriptionPlanRepo: Repository<SubscriptionPlan>,
  ) {}

  async findAll() {
    return this.subscriptionPlanRepo.find({
      order: {
        sortOrder: 'ASC',
        createdAt: 'DESC',
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

  async create(dto: CreateSubscriptionPlanDto) {
    const plan = this.subscriptionPlanRepo.create({
      name: dto.name,
      price: dto.price,
      durationDays: dto.durationDays,
      description: dto.description ?? null,
      isActive: dto.isActive ?? true,
      sortOrder: dto.sortOrder ?? 0,
    });

    return this.subscriptionPlanRepo.save(plan);
  }

  async update(id: string, dto: UpdateSubscriptionPlanDto) {
    const plan = await this.findOne(id);

    Object.assign(plan, dto);

    return this.subscriptionPlanRepo.save(plan);
  }

  async remove(id: string) {
    const plan = await this.findOne(id);

    await this.subscriptionPlanRepo.remove(plan);

    return {
      status: 200,
      message: 'پلن اشتراک با موفقیت حذف شد',
    };
  }

  async toggleActive(id: string) {
    const plan = await this.findOne(id);

    plan.isActive = !plan.isActive;

    await this.subscriptionPlanRepo.save(plan);

    return plan;
  }
}
