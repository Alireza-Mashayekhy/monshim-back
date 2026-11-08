import { BarberProfile } from 'src/barber/entities/barber.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

import { ClubCustomer } from './club-customer.entity';

@Entity('customer_groups')
@Unique(['barberId', 'name'])
export class CustomerGroup {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'barber_id', type: 'char', length: 36 })
  barberId: string;

  @Column({ length: 100 })
  name: string;

  @Column({ default: false })
  isDefault: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => BarberProfile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'barber_id', referencedColumnName: 'id' })
  barber: BarberProfile;

  @OneToMany(() => ClubCustomer, customer => customer.group)
  customers: ClubCustomer[];
}
