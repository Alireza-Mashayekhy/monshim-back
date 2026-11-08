import { BarberProfile } from 'src/barber/entities/barber.entity';
import { User } from 'src/users/entities/user.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * خرید «پکیج صفحهٔ عمومی» توسط آرایشگر.
 *
 * این پکیج یک‌باره خریده می‌شود و تا همیشه معتبر است (بدون تاریخ انقضا)؛
 * نگه‌داریِ تاریخچه (و نه یک فلگ ساده روی پروفایل) امکانِ رسیدگی مالی و
 * نمایشِ زمان خرید در پنل آرایشگر را فراهم می‌کند.
 */
@Entity('barber_public_page_purchases')
export class BarberPublicPagePurchase {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  /** شناسهٔ پروفایل آرایشگر (`barber_profiles.id`) — کلیدِ شمارش نوبت‌ها هم هست */
  @Index()
  @Column({ name: 'barber_profile_id', type: 'char', length: 36 })
  barberProfileId: string;

  @ManyToOne(() => BarberProfile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'barber_profile_id' })
  barberProfile: BarberProfile;

  /** مبلغ پرداخت‌شده به تومان */
  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  /** رکورد پرداخت متناظر؛ یکتا است تا کال‌بک تکراری خرید دوباره نسازد */
  @Index({ unique: true })
  @Column({ name: 'payment_id', type: 'char', length: 36, nullable: true })
  paymentId: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
