// src/wallet/entities/bank-card.entity.ts
import { User } from 'src/users/entities/user.entity';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('bank_cards')
export class BankCard {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  userId: number;

  @Column({ length: 100 })
  bankName: string;

  @Column({ length: 16 })
  cardNumber: string; // ۱۶ رقم

  @Column({ length: 26, nullable: true })
  shebaNumber: string;

  @Column({ length: 100 })
  ownerName: string;

  @Column({ default: false })
  isDefault: boolean;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
}
