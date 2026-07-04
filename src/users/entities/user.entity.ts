import { BarberProfile } from 'src/barber/entities/barber.entity';
import { Role } from 'src/common/enum/role.enum';
import { Service } from 'src/services/entities/service.entity';
import {
  Column,
  Entity,
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
  birthDate: Date;

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
