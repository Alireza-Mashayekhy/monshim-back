// src/bookings/entities/booking.entity.ts

import { BarberProfile } from 'src/barber/entities/barber.entity';
import { Service } from 'src/services/entities/service.entity';
import { User } from 'src/users/entities/user.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum BookingStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  COMPLETED = 'completed',
  CANCELED = 'canceled',
  REJECTED = 'rejected',
}

/**
 * وضعیت‌هایی که «ساعت رزرو را اشغال می‌کنند».
 *
 * تنها منبع حقیقت برای بررسی تداخل و ساخت تقویم اسلات‌های آزاد:
 * - confirmed : نوبت قطعی
 * - completed : خدمت انجام شده؛ ساعتش هنوز قابل فروش مجدد نیست
 *
 * `pending` عمداً اینجا نیست: رزرو در انتظار هیچ تاریخ انقضایی ندارد و اگر
 * ساعت را قفل کند، یک درخواست رهاشده می‌تواند آن ساعت را برای همیشه از
 * تقویم حذف کند. نوبت در انتظار هنگام «تایید» با همین فهرست دوباره
 * بررسی می‌شود (assertNoSlotConflict)، پس امکان دو نوبت قطعی روی یک ساعت
 * وجود ندارد.
 *
 * پیش از این فقط `confirmed` بررسی می‌شد؛ نتیجه‌اش این بود که نوبت
 * انجام‌شده ساعت را در تقویم آزاد نشان می‌داد و رزرو تکراری ممکن می‌شد.
 */
export const SLOT_HOLDING_STATUSES: BookingStatus[] = [
  BookingStatus.CONFIRMED,
  BookingStatus.COMPLETED,
];

@Entity('bookings')
export class Booking {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'customer_id' })
  customerId: number;

  @Column({
    name: 'barber_id',
    type: 'char',
    length: 36,
  })
  barberId: string;

  @Column({ name: 'service_id' })
  serviceId: string;

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'time' })
  time: string;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
  })
  price: number;

  @Column({
    type: 'enum',
    enum: BookingStatus,
    default: BookingStatus.PENDING,
  })
  status: BookingStatus;

  @Column({
    type: 'text',
    nullable: true,
  })
  note: string | null;

  @Column({
    name: 'barber_note',
    type: 'text',
    nullable: true,
  })
  barberNote: string | null;

  // یادداشت مربوط به مشتری (قابل نمایش در پنل نوبت‌ها)
  @Column({
    name: 'customer_note',
    type: 'text',
    nullable: true,
  })
  customerNote: string | null;

  // آیا لینک بیعانه برای مشتری ارسال شود
  @Column({
    name: 'send_deposit_link',
    default: false,
  })
  sendDepositLink: boolean;

  // آیا پیامک یادآوری برای مشتری ارسال شود
  @Column({
    name: 'send_sms_reminder',
    default: false,
  })
  sendSmsReminder: boolean;

  // چند ساعت قبل از نوبت، پیامک یادآوری ارسال شود (۱، ۲، ۴، ۶، ۱۲، ۲۴)
  @Column({
    name: 'reminder_hours',
    type: 'int',
    nullable: true,
  })
  reminderHours: number | null;

  // زمان ارسال پیامک یادآوری (برای جلوگیری از ارسال تکراری)
  @Column({
    name: 'reminder_sent_at',
    type: 'datetime',
    nullable: true,
  })
  reminderSentAt: Date | null;

  @Column({ name: 'canceled_by', type: 'varchar', length: 16, nullable: true })
  canceledBy: 'customer' | 'barber' | 'admin' | 'system' | null;

  @Column({ name: 'canceled_at', type: 'datetime', nullable: true })
  canceledAt: Date | null;

  // توکن تصادفی لینک عمومی پرداخت بیعانه (وقتی آرایشگر لینک بیعانه می‌فرستد)
  @Column({
    name: 'deposit_token',
    type: 'varchar',
    length: 64,
    nullable: true,
    unique: true,
  })
  depositToken: string | null;

  // زمان پرداخت موفق بیعانه از طریق لینک
  @Column({
    name: 'deposit_paid_at',
    type: 'datetime',
    nullable: true,
  })
  depositPaidAt: Date | null;

  // آخرین زمانی که لینک بیعانه برای مشتری فرستاده شد.
  // مبنای «مهلت پرداخت بیعانه» است؛ اگر تا این مهلت پرداخت نشود، نوبت
  // به‌صورت خودکار لغو می‌شود تا ساعت رزرو برای همیشه اشغال نماند.
  @Column({
    name: 'deposit_requested_at',
    type: 'datetime',
    nullable: true,
  })
  depositRequestedAt: Date | null;

  // زمان پرداخت موفق کل مبلغ نوبت از درگاه (رزرو آنلاینِ کاربر).
  // این ستون همراه با `depositPaidAt` مبنای شمارش «نوبت‌های پرداخت‌شده»
  // برای فعال‌سازی صفحهٔ عمومی آرایشگاه است.
  @Column({
    name: 'online_paid_at',
    type: 'datetime',
    nullable: true,
  })
  onlinePaidAt: Date | null;

  @CreateDateColumn({
    name: 'created_at',
  })
  createdAt: Date;

  @UpdateDateColumn({
    name: 'updated_at',
  })
  updatedAt: Date;

  // Customer
  @ManyToOne(() => User)
  @JoinColumn({
    name: 'customer_id',
  })
  customer: User;

  // Barber
  @ManyToOne(() => BarberProfile, barber => barber.bookings, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({
    name: 'barber_id',
    referencedColumnName: 'id',
  })
  barber: BarberProfile;

  // Service
  @ManyToOne(() => Service)
  @JoinColumn({
    name: 'service_id',
  })
  service: Service;
}
