import { BarberProfile } from 'src/barber/entities/barber.entity';
import { Role } from 'src/common/enum/role.enum';
import { City } from 'src/locations/entities/city.entity';
import { Province } from 'src/locations/entities/province.entity';
import { Service } from 'src/services/entities/service.entity';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  fullName: string;

  @Column({ unique: true })
  phone: string;

  @Column({
    type: 'varchar',
    unique: true,
    nullable: true,
  })
  email: string | null;

  @Column({
    type: 'date',
    nullable: true,
  })
  birthDate: Date | null;

  @Column({
    name: 'province_id',
    nullable: true,
  })
  provinceId?: number | null;

  @Column({
    name: 'city_id',
    nullable: true,
  })
  cityId?: number | null;

  @ManyToOne(() => Province, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'province_id' })
  province?: Province | null;

  @ManyToOne(() => City, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'city_id' })
  city?: City | null;

  @Column({
    type: 'simple-array',
  })
  roles: Role[] = [Role.User];

  @Column({ default: true })
  isActive: boolean;

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt: Date;

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updatedAt: Date;

  @OneToMany(() => Service, service => service.barber)
  services: Service[];

  @OneToOne(() => BarberProfile, profile => profile.user)
  barberProfile: BarberProfile;
}
