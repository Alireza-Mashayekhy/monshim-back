// src/referral/entities/referral.entity.ts
import { BarberProfile } from 'src/barber/entities/barber.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum ReferralStatus {
  PENDING = 'PENDING', // در انتظار تکمیل شدن شرط (۵ رزرو)
  COMPLETED = 'COMPLETED', // پاداش دریافت شده
}

@Entity('referrals')
export class Referral {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // شناسه آرایشگری که دعوت کرده (دعوت‌کننده)
  @Column({ name: 'referrer_user_id' })
  referrerUserId: number;

  // شناسه آرایشگری که دعوت شده (دعوت‌شده)
  @Column({ name: 'referred_user_id' })
  referredUserId: number;

  @Column({
    type: 'enum',
    enum: ReferralStatus,
    default: ReferralStatus.PENDING,
  })
  status: ReferralStatus;

  // تعداد رزروهای تکمیل شده توسط دعوت‌شده
  @Column({ default: 0 })
  completedBookingsCount: number;

  // آیا پاداش (۵۰,۰۰۰ تومان) پرداخت شده؟
  @Column({ default: false })
  rewardPaid: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // ارتباط با پروفایل دعوت‌کننده
  @ManyToOne(() => BarberProfile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'referrer_profile_id' })
  referrerProfile: BarberProfile;

  @Column({ name: 'referrer_profile_id', type: 'varchar', length: 36 })
  referrerProfileId: string;

  // ارتباط با پروفایل دعوت‌شده
  @ManyToOne(() => BarberProfile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'referred_profile_id' })
  referredProfile: BarberProfile;

  @Column({ name: 'referred_profile_id', type: 'varchar', length: 36 })
  referredProfileId: string;
}
