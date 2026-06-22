// barber-profile.entity.ts
import { User } from 'src/users/entities/user.entity';
import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity()
export class BarberProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  userId: number;

  @Column({ nullable: true })
  profileImage: string;

  @Column({ length: 100 })
  salonName: string;

  @Column({ length: 100 })
  city: string;

  @Column({ type: 'text' })
  address: string;

  @Column({ type: 'text', nullable: true })
  bio: string;

  @Column({
    type: 'simple-array',
    nullable: true,
  })
  portfolioImages: string[];

  @Column({ type: 'time', nullable: true })
  workStartTime: string;

  @Column({ type: 'time', nullable: true })
  workEndTime: string;

  @Column({ default: false })
  isApproved: boolean;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
}
