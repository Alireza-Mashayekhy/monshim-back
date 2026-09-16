import { SubscriptionPlan } from 'src/subscription/entities/subscription-plan.entity';
import { User } from 'src/users/entities/user.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum UserSubscriptionStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  CANCELED = 'canceled',
}

@Entity('user_subscriptions')
export class UserSubscription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    name: 'user_id',
  })
  userId: number;

  @Column({
    name: 'subscription_plan_id',
  })
  subscriptionPlanId: string;

  // قیمت در زمان خرید
  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
  })
  price: number;

  @Column({
    type: 'enum',
    enum: UserSubscriptionStatus,
    default: UserSubscriptionStatus.ACTIVE,
  })
  status: UserSubscriptionStatus;

  @Column({
    name: 'start_date',
    type: 'datetime',
  })
  startDate: Date;

  @Column({
    name: 'end_date',
    type: 'datetime',
  })
  endDate: Date;

  @CreateDateColumn({
    name: 'created_at',
  })
  createdAt: Date;

  @ManyToOne(() => User, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'user_id',
  })
  user: User;

  @ManyToOne(() => SubscriptionPlan, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({
    name: 'subscription_plan_id',
  })
  subscriptionPlan: SubscriptionPlan;
}
