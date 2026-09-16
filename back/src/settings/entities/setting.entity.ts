import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum CommissionBase {
  TOTAL = 'total',
  DEPOSIT = 'deposit',
}

@Entity('site_settings')
export class SiteSettings {
  @PrimaryGeneratedColumn()
  id: number;

  // درصد بیعانه
  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 30,
  })
  depositPercent: number;

  // درصد سهم سایت
  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 10,
  })
  commissionPercent: number;

  // سهم سایت از کل مبلغ یا بیعانه
  @Column({
    type: 'enum',
    enum: CommissionBase,
    default: CommissionBase.TOTAL,
  })
  commissionBase: CommissionBase;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
