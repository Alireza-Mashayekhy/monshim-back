import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * «نگه‌داشتن موقت ساعت» هنگام رزرو آنلاین.
 *
 * چرا لازم است: رزرو آنلاین فقط بعد از پرداخت ساخته می‌شود. بین لحظهٔ
 * فرستادن مشتری به درگاه و برگشتنش، هیچ رکوردی وجود نداشت؛ پس دو مشتری
 * می‌توانستند هم‌زمان یک ساعت را انتخاب کنند و هر دو پول بدهند (و دومی
 * روی ساعت پُر‌شده بنشیند).
 *
 * این رکورد ساعت را برای چند دقیقه نگه می‌دارد. اگر پرداخت انجام شود،
 * رزرو واقعی ساخته می‌شود و این رکورد پاک می‌شود؛ اگر مشتری برگردد و
 * پرداخت نکند، رکورد با گذشت `expiresAt` خودبه‌خود بی‌اثر و پاک می‌شود.
 *
 * این جدول عمداً از `bookings` جدا است تا «نگه‌داشتن موقت» با آمار، لیست
 * نوبت‌ها و شمارش درآمد قاطی نشود.
 */
@Index(['barberId', 'date', 'expiresAt'])
@Entity('slot_holds')
export class SlotHold {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'barber_id', type: 'char', length: 36 })
  barberId: string;

  @Column({ type: 'date' })
  date: string;

  @Column({ name: 'start_minutes', type: 'int' })
  startMinutes: number;

  @Column({ name: 'end_minutes', type: 'int' })
  endMinutes: number;

  /** شناسهٔ سفارش پرداخت؛ همهٔ نگه‌داشتن‌های یک سفارش با هم پاک می‌شوند */
  @Index()
  @Column({ name: 'order_id', type: 'varchar', length: 64 })
  orderId: string;

  @Index()
  @Column({ name: 'expires_at', type: 'datetime' })
  expiresAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
