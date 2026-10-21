import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { SubscriptionPlan } from 'src/subscription/entities/subscription-plan.entity';
import { Repository } from 'typeorm';

import { SmsUsage } from './entities/sms-usage.entity';
import {
  UserSubscription,
  UserSubscriptionStatus,
} from './entities/user-subscription.entity';

@Injectable()
export class UserSubscriptionService {
  private readonly logger = new Logger(UserSubscriptionService.name);

  constructor(
    @InjectRepository(UserSubscription)
    private readonly userSubscriptionRepo: Repository<UserSubscription>,

    @InjectRepository(SubscriptionPlan)
    private readonly subscriptionPlanRepo: Repository<SubscriptionPlan>,

    @InjectRepository(SmsUsage)
    private readonly smsUsageRepo: Repository<SmsUsage>,
  ) {}

  /**
   * انقضای خودکار اشتراک‌ها.
   *
   * پیش از این وضعیت `expired` فقط وقتی نوشته می‌شد که کاربر صفحهٔ اشتراک را
   * باز می‌کرد؛ یعنی گزارش‌ها و بررسی اعتبار پیامک می‌توانستند اشتراک
   * منقضی‌شده را «فعال» ببینند.
   */
  @Cron(CronExpression.EVERY_HOUR)
  async expireOverdueSubscriptions(): Promise<number> {
    const result = await this.userSubscriptionRepo
      .createQueryBuilder()
      .update(UserSubscription)
      .set({ status: UserSubscriptionStatus.EXPIRED })
      .where('status = :status', { status: UserSubscriptionStatus.ACTIVE })
      .andWhere('end_date < :now', { now: new Date() })
      .execute();

    const affected = result.affected ?? 0;
    if (affected > 0) {
      this.logger.log(`${affected} اشتراک منقضی‌شده به‌صورت خودکار بسته شد`);
    }

    return affected;
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

  async deductSms(
    userId: number,
    count = 1,
    reason = 'ارسال پیامک',
  ): Promise<UserSubscription> {
    if (count < 1) {
      throw new BadRequestException('تعداد پیامک برای کسر باید حداقل ۱ باشد');
    }

    const subscription = await this.getCurrent(userId);

    if (!subscription) {
      throw new BadRequestException(
        'برای ارسال پیامک ابتدا باید یکی از پلن‌های اشتراک را خریداری کنید',
      );
    }

    const remaining = subscription.smsTotal - subscription.smsUsed;

    if (remaining < count) {
      throw new BadRequestException(
        `اعتبار پیامک کافی نیست (پیامک باقی‌مانده: ${remaining})`,
      );
    }

    subscription.smsUsed += count;

    const saved = await this.userSubscriptionRepo.save(subscription);

    // ثبت در دفتر مصرف پیامک
    await this.smsUsageRepo.save(
      this.smsUsageRepo.create({
        userId,
        userSubscriptionId: subscription.id,
        count,
        reason,
      }),
    );

    return saved;
  }

  async getSmsUsageHistory(userId: number) {
    return this.smsUsageRepo.find({
      where: {
        userId,
      },
      order: {
        createdAt: 'DESC',
      },
      take: 50,
    });
  }
}
