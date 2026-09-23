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
