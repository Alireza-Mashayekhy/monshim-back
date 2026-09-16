import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { BarberProfile } from './barber.entity';

@Entity('barber_work_hours')
export class BarberWorkHours {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'barber_id' })
  barberId: string;

  @ManyToOne(() => BarberProfile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'barber_id' })
  barber: BarberProfile;

  @Column({ type: 'tinyint' })
  dayOfWeek: number;

  @Column({ type: 'time' })
  startTime: string;

  @Column({ type: 'time' })
  endTime: string;
}
