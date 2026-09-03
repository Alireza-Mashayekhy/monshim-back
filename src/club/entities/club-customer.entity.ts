import { BarberProfile } from 'src/barber/entities/barber.entity';
import { User } from 'src/users/entities/user.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

import { CustomerGroup } from './customer-group.entity';

@Entity('club_customers')
@Unique(['barberId', 'customerId'])
export class ClubCustomer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'barber_id', type: 'char', length: 36 })
  barberId: string;

  @Column({ name: 'customer_id' })
  customerId: number;

  @Column({ name: 'group_id', type: 'char', length: 36, nullable: true })
  groupId: string | null;

  @Column({ length: 80 })
  firstName: string;

  @Column({ length: 80 })
  lastName: string;

  @Column({ length: 11 })
  phone: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => BarberProfile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'barber_id', referencedColumnName: 'id' })
  barber: BarberProfile;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'customer_id' })
  customer: User;

  @ManyToOne(() => CustomerGroup, group => group.customers, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'group_id' })
  group: CustomerGroup | null;
}
