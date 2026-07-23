// barber-profile.entity.ts
import { City } from 'src/locations/entities/city.entity';
import { Province } from 'src/locations/entities/province.entity';
import { User } from 'src/users/entities/user.entity';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
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

  // مشخص کردن type: 'varchar' برای جلوگیری از تشخیص اشتباه
  @Column({ type: 'varchar', nullable: true })
  profileImage: string | null;

  @Column({ length: 100 })
  salonName: string;

  @Column({ name: 'province_id', nullable: true })
  provinceId?: number;

  @Column({ name: 'city_id', nullable: true })
  cityId?: number;

  @Column({ type: 'text' })
  address: string;

  // مشخص کردن type: 'text' برای bio
  @Column({ type: 'text', nullable: true })
  bio: string | null;

  @Column({
    type: 'simple-array',
    nullable: true,
  })
  portfolioImages: string[] | null;

  @Column({ type: 'time', nullable: true })
  workStartTime: string | null;

  @Column({ type: 'time', nullable: true })
  workEndTime: string | null;

  @Column({ default: false })
  isApproved: boolean;

  @Column({ type: 'text', nullable: true })
  rejectionReason: string | null;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @ManyToOne(() => Province)
  @JoinColumn({ name: 'province_id' })
  province?: Province;

  @ManyToOne(() => City)
  @JoinColumn({ name: 'city_id' })
  city?: City;
}
