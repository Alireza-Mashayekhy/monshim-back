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
  PENDING = 'pending', // در انتظار تایید آرایشگر
  CONFIRMED = 'confirmed', // تایید شده
  COMPLETED = 'completed', // انجام شده
  CANCELED = 'canceled', // لغو شده توسط مشتری یا آرایشگر
  REJECTED = 'rejected', // رد شده توسط آرایشگر
}

@Entity('bookings')
export class Booking {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'customer_id' })
  customerId: number;

  @Column({ name: 'barber_id' })
  barberId: number;

  @Column({ name: 'service_id' })
  serviceId: string;

  @Column({ type: 'date' })
  date: string; // تاریخ به فرمت YYYY-MM-DD

  @Column({ type: 'time' })
  time: string; // ساعت به فرمت HH:mm

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number; // قیمت در زمان رزرو (از سرویس گرفته می‌شود)

  @Column({ type: 'enum', enum: BookingStatus, default: BookingStatus.PENDING })
  status: BookingStatus;

  @Column({ type: 'text', nullable: true })
  note: string; // توضیحات اضافی (اختیاری)

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // روابط
  @ManyToOne(() => User)
  @JoinColumn({ name: 'customer_id' })
  customer: User;

  @ManyToOne(() => BarberProfile)
  @JoinColumn({ name: 'barber_id' })
  barber: BarberProfile;

  @ManyToOne(() => Service)
  @JoinColumn({ name: 'service_id' })
  service: Service;
}
