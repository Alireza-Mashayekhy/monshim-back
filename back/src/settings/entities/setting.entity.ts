import {
  type CommissionMode,
  type CommissionTier,
  DEFAULT_COMMISSION_MAX_AMOUNT,
} from 'src/payment/deposit-amount';
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

  // درصد سهم سایت (برای حالت درصد ثابت)
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

  // حالت محاسبه کمیسیون: پلکانی (پیش‌فرض) یا درصد ثابت
  @Column({
    name: 'commission_mode',
    type: 'varchar',
    length: 20,
    default: 'tiered',
  })
  commissionMode: CommissionMode;

  // پله‌های کمیسیون پلکانی (در صورت null از پله‌های استاندارد ۱۰٪/۷٪/۵٪/۳٪ استفاده می‌شود)
  @Column({
    name: 'commission_tiers',
    type: 'json',
    nullable: true,
  })
  commissionTiers: CommissionTier[] | null;

  // سقف مبلغ کمیسیون برای هر رزرو به تومان (پیش‌فرض ۲۰۰٬۰۰۰ تومان؛ null یعنی بدون سقف)
  @Column({
    name: 'commission_max_amount',
    type: 'int',
    nullable: true,
    default: DEFAULT_COMMISSION_MAX_AMOUNT,
  })
  commissionMaxAmount: number | null;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
