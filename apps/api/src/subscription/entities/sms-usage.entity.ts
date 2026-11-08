import { UserSubscription } from 'src/subscription/entities/user-subscription.entity';
import { User } from 'src/users/entities/user.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('sms_usages')
export class SmsUsage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    name: 'user_id',
  })
  userId: number;

  @Column({
    name: 'user_subscription_id',
  })
  userSubscriptionId: string;

  @Column({
    type: 'int',
  })
  count: number;

  @Column({
    length: 255,
  })
  reason: string;

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

  @ManyToOne(() => UserSubscription, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'user_subscription_id',
  })
  userSubscription: UserSubscription;
}
