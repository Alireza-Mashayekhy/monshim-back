import { User } from 'src/users/entities/user.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum PaymentPurpose {
  SUBSCRIPTION = 'SUBSCRIPTION',
  BOOKING = 'BOOKING',
  WALLET = 'WALLET',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  FAILED = 'FAILED',
  CANCELED = 'CANCELED',
}

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  amount: number; // به تومان

  @Index()
  @Column({ type: 'bigint', nullable: true })
  trackId: number | null; // کد رهگیری درگاه زیبال

  @Index({ unique: true })
  @Column({ length: 64 })
  orderId: string; // شناسه سفارش یکتا

  @Column({
    type: 'enum',
    enum: PaymentPurpose,
  })
  purpose: PaymentPurpose;

  @Column({ type: 'varchar', length: 128, nullable: true })
  purposeId: string | null; // مثلاً شناسه پلن اشتراک یا شناسه رزرو

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  status: PaymentStatus;

  @Column({ type: 'varchar', length: 64, nullable: true })
  refNumber: string | null; // شماره مرجع پرداخت شاپرک

  @Column({ type: 'varchar', length: 32, nullable: true })
  cardNumber: string | null; // شماره کارت ماسک شده خریدار

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'text', nullable: true })
  metadata: string | null; // اطلاعات تکمیلی به صورت JSON

  @Column({ type: 'timestamp', nullable: true })
  paidAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
