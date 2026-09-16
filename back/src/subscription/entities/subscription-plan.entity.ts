import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('subscription_plans')
export class SubscriptionPlan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    length: 100,
  })
  name: string;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
  })
  price: number;

  @Column({
    type: 'int',
  })
  durationDays: number;

  @Column({
    type: 'text',
    nullable: true,
  })
  description: string | null;

  @Column({
    default: true,
  })
  isActive: boolean;

  @Column({
    default: 0,
  })
  sortOrder: number;

  @CreateDateColumn({
    name: 'created_at',
  })
  createdAt: Date;

  @UpdateDateColumn({
    name: 'updated_at',
  })
  updatedAt: Date;
}
