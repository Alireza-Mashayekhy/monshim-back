// src/ticket/entities/ticket-message.entity.ts
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Ticket } from './ticket.entity';

export enum MessageSender {
  USER = 'USER', // فرستنده: کاربر
  ADMIN = 'ADMIN', // فرستنده: ادمین/پشتیبانی
}

@Entity('ticket_messages')
export class TicketMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'ticket_id' })
  ticketId: string;

  @ManyToOne(() => Ticket, ticket => ticket.messages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ticket_id' })
  ticket: Ticket;

  // چه کسی این پیام را فرستاده
  @Column({ type: 'enum', enum: MessageSender })
  senderRole: MessageSender;

  // شناسه کاربر فرستنده (برای پیام‌های ادمین هم شناسه کاربر ادمین ذخیره می‌شود)
  @Column({ name: 'sender_id', type: 'int', nullable: true })
  senderId: number | null;

  // متن پیام
  @Column({ type: 'text' })
  message: string;

  // آیا کاربر این پیام را خوانده است
  @Column({ name: 'read_by_user', default: false })
  readByUser: boolean;

  // آیا ادمین این پیام را خوانده است
  @Column({ name: 'read_by_admin', default: false })
  readByAdmin: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
