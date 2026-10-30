// src/barber/entities/barber.entity.ts

import { Booking } from 'src/booking/entities/booking.entity';
import { City } from 'src/locations/entities/city.entity';
import { Province } from 'src/locations/entities/province.entity';
import { User } from 'src/users/entities/user.entity';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

import { BarberReview } from './barber-review.entity';

export type BarberPendingStatus = 'none' | 'pending' | 'rejected';

export interface BarberPendingChanges {
  fullName?: string;
  salonName?: string;
  activityType?: string | null;
  provinceId?: number | null;
  cityId?: number | null;
  address?: string;
  bio?: string | null;
  profileImage?: string | null;
  portfolioImages?: string[];
  submittedAt?: string;
}

export const BARBER_MODERATED_FIELD_LABELS: Record<
  Exclude<keyof BarberPendingChanges, 'submittedAt'>,
  string
> = {
  fullName: 'نام و نام خانوادگی',
  salonName: 'نام سالن',
  activityType: 'نوع فعالیت',
  provinceId: 'استان',
  cityId: 'شهر',
  address: 'آدرس',
  bio: 'بیوگرافی',
  profileImage: 'تصویر پروفایل',
  portfolioImages: 'نمونه‌کارها',
};

/**
 * کلیدهایی که وجودشان در پیش‌نویس ویرایش به معنای «تغییر واقعی» است.
 *
 * عمداً از خودِ نقشهٔ برچسب‌ها مشتق می‌شود تا وقتی فیلد تحت‌نظارت جدیدی
 * اضافه می‌شود، منطق تشخیص تغییر در همهٔ سرویس‌ها (BarberService و
 * UsersService) هم‌زمان به‌روز بماند و فهرست‌ها از هم واگرا نشوند.
 */
export const BARBER_MODERATED_DIFF_KEYS = Object.keys(
  BARBER_MODERATED_FIELD_LABELS,
) as Array<Exclude<keyof BarberPendingChanges, 'submittedAt'>>;

export function getBarberChangedFieldLabels(
  changes: Partial<BarberPendingChanges> | null | undefined,
): string[] {
  if (!changes) return [];
  return BARBER_MODERATED_DIFF_KEYS.filter(
    key => changes[key] !== undefined,
  ).map(key => BARBER_MODERATED_FIELD_LABELS[key]);
}

@Entity()
@Unique(['referralCode'])
export class BarberProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  userId: number;

  @Column({
    type: 'varchar',
    nullable: true,
  })
  profileImage: string | null;

  @Column({ length: 100 })
  salonName: string;

  @Column({
    name: 'activity_type',
    type: 'varchar',
    length: 30,
    nullable: true,
  })
  activityType: string | null;

  @Column({
    name: 'province_id',
    type: 'int',
    nullable: true,
  })
  provinceId?: number | null;

  @Column({
    name: 'city_id',
    type: 'int',
    nullable: true,
  })
  cityId?: number | null;

  @Column({ type: 'text' })
  address: string;

  @Column({
    type: 'text',
    nullable: true,
  })
  bio: string | null;

  @Column({
    type: 'simple-array',
    nullable: true,
  })
  portfolioImages: string[] | null;

  @Column({
    type: 'time',
    nullable: true,
  })
  workStartTime: string | null;

  @Column({
    type: 'time',
    nullable: true,
  })
  workEndTime: string | null;

  @Column({
    name: 'slot_interval_minutes',
    type: 'int',
    default: 30,
  })
  slotIntervalMinutes: number;

  @Column({ default: false })
  isApproved: boolean;

  @Column({
    type: 'decimal',
    precision: 2,
    scale: 1,
    default: 0,
  })
  rating: number;

  @Column({ name: 'review_count', type: 'int', default: 0 })
  reviewCount: number;

  @Column({
    type: 'text',
    nullable: true,
  })
  rejectionReason: string | null;

  @Column({
    name: 'pending_changes',
    type: 'json',
    nullable: true,
  })
  pendingChanges: BarberPendingChanges | null;

  @Column({
    name: 'pending_status',
    type: 'varchar',
    length: 20,
    default: 'none',
  })
  pendingStatus: BarberPendingStatus;

  @Column({
    name: 'pending_rejection_reason',
    type: 'text',
    nullable: true,
  })
  pendingRejectionReason: string | null;

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt: Date;

  // کد معرف برای دعوت آرایشگرهای دیگر
  @Column({
    type: 'varchar',
    length: 8,
    unique: true,
    nullable: true,
  })
  referralCode: string | null;

  // اسلاگ یکتای آدرس صفحهٔ اختصاصی عمومی (/provider/[slug])
  @Column({
    type: 'varchar',
    length: 80,
    unique: true,
    nullable: true,
  })
  slug: string | null;

  // شناسه کاربری که این آرایشگر را دعوت کرده
  @Column({ name: 'referred_by', type: 'int', nullable: true })
  referredBy: number | null;

  @ManyToOne(() => Province)
  @JoinColumn({ name: 'province_id' })
  province?: Province;

  @ManyToOne(() => City)
  @JoinColumn({ name: 'city_id' })
  city?: City;

  // رزروهای این آرایشگر
  @OneToMany(() => Booking, booking => booking.barber)
  bookings: Booking[];

  @OneToMany(() => BarberReview, review => review.barber)
  reviews: BarberReview[];
}
