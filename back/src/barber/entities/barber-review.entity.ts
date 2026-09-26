// src/barber/entities/barber-review.entity.ts

import { BarberProfile } from 'src/barber/entities/barber.entity';
import { User } from 'src/users/entities/user.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

export enum BarberReviewStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

@Entity('barber_reviews')
@Unique(['barberId', 'customerId'])
export class BarberReview {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // آرایشگر (BarberProfile.id)
  @Column({ name: 'barber_id', type: 'char', length: 36 })
  barberId: string;

  @ManyToOne(() => BarberProfile, barber => barber.reviews, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'barber_id' })
  barber: BarberProfile;

  // مشتری ثبت‌کننده نظر
  @Column({ name: 'customer_id' })
  customerId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'customer_id' })
  customer: User;

  // امتیاز از ۱ تا ۵
  @Column({ type: 'int' })
  rating: number;

  // متن نظر
  @Column({ type: 'text', nullable: true })
  comment: string | null;

  // وضعیت تایید توسط ادمین
  @Column({
    type: 'enum',
    enum: BarberReviewStatus,
    default: BarberReviewStatus.PENDING,
  })
  status: BarberReviewStatus;

  // یادداشت ادمین (مثلاً دلیل رد شدن)
  @Column({ name: 'admin_note', type: 'text', nullable: true })
  adminNote: string | null;

  @Column({
    name: 'reviewed_at',
    type: 'datetime',
    nullable: true,
  })
  reviewedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
