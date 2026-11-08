// src/ticket/entities/ticket.entity.ts
import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { TicketMessage } from './ticket-message.entity';

export enum TicketStatus {
  OPEN = 'OPEN', // در انتظار پاسخ پشتیبانی
  ANSWERED = 'ANSWERED', // پاسخ داده شده - در انتظار کاربر
  CLOSED = 'CLOSED', // بسته شده
}

export enum TicketPriority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export enum TicketDepartment {
  GENERAL = 'GENERAL', // عمومی
  PAYMENT = 'PAYMENT', // مالی و پرداخت
  TECHNICAL = 'TECHNICAL', // فنی
  COMPLAINT = 'COMPLAINT', // شکایت
  SUGGESTION = 'SUGGESTION', // پیشنهاد
}

@Entity('tickets')
export class Ticket {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // صاحب تیکت
  @Column({ name: 'user_id' })
  userId: number;

  // موضوع تیکت
  @Column({ type: 'varchar', length: 200 })
  subject: string;

  // دپارتمان (اختیاری)
  @Column({
    type: 'enum',
    enum: TicketDepartment,
    nullable: true,
  })
  department: TicketDepartment | null;

  // اولویت
  @Column({
    type: 'enum',
    enum: TicketPriority,
    default: TicketPriority.NORMAL,
  })
  priority: TicketPriority;

  // وضعیت تیکت
  @Column({
    type: 'enum',
    enum: TicketStatus,
    default: TicketStatus.OPEN,
  })
  status: TicketStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => TicketMessage, message => message.ticket)
  messages: TicketMessage[];
}
