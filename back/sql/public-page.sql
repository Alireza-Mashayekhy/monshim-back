-- «صفحهٔ عمومی آرایشگاه» — آدرس عمومی و سئوشدهٔ هر آرایشگاه: /barber/[id]
--
-- فعال‌سازی این صفحه دو شرط دارد:
--   1. خرید پکیج ۵۹۹٫۰۰۰ تومانی (یک‌باره، مادام‌العمر)؛
--   2. یا رسیدن به ۳۰۰ نوبتِ پرداخت‌شده (بیعانهٔ پرداخت‌شده یا پرداخت کامل
--      هنگام رزرو آنلاین) — به‌صورت تجمعی و بدون محدودیت زمانی.
--
-- این فایل فقط برای محیط production لازم است؛ در بقیهٔ محیط‌ها
-- `synchronize` خود TypeORM ستون‌ها و جدول را می‌سازد.

-- ۱. زمان پرداختِ کاملِ نوبت از درگاه (رزرو آنلاینِ کاربر).
ALTER TABLE bookings ADD COLUMN online_paid_at DATETIME NULL;

-- پر کردن داده‌های قدیمی (best-effort): نوبت‌هایی که با پرداخت آنلاینِ موفق
-- ساخته شده‌اند. در پرداخت‌های چندخدمتی فقط نوبتِ اول در purpose_id ثبت شده
-- است، بنابراین ممکن است تعدادی نوبتِ قدیمی بدون مقدار بمانند.
UPDATE bookings b
JOIN payments p
  ON p.purpose = 'BOOKING'
 AND p.status = 'PAID'
 AND p.purpose_id = b.id
SET b.online_paid_at = IFNULL(p.paid_at, b.created_at)
WHERE b.online_paid_at IS NULL
  AND b.deposit_paid_at IS NULL;

-- ۲. خرید پکیج صفحهٔ عمومی
CREATE TABLE IF NOT EXISTS barber_public_page_purchases (
  id VARCHAR(36) NOT NULL,
  user_id INT NOT NULL,
  barber_profile_id CHAR(36) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  payment_id CHAR(36) NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY uq_barber_public_page_purchase_payment (payment_id),
  KEY idx_barber_public_page_purchase_user (user_id),
  KEY idx_barber_public_page_purchase_profile (barber_profile_id),
  CONSTRAINT fk_barber_public_page_purchase_user
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_barber_public_page_purchase_profile
    FOREIGN KEY (barber_profile_id) REFERENCES barber_profiles (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
