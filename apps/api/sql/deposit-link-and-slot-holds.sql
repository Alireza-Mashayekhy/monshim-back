-- اعمال یک‌باره پیش از استقرار قابلیت‌های «بیعانه + نگه‌داشتن موقت ساعت».
-- در محیط توسعه با synchronize خودکار ساخته می‌شود؛ production نیاز به این فایل دارد.

-- ۱) مهلت پرداخت بیعانه: زمان آخرین ارسال لینک بیعانه
ALTER TABLE bookings
  ADD COLUMN deposit_requested_at DATETIME NULL;

-- ۲) ستون «اشغال ساعت» روی رزرو
--    رزرو آنلاینِ پرداخت‌شده در وضعیت pending منتظر تایید آرایشگر است، اما
--    چون پول گرفته شده باید ساعت را نگه دارد. درخواست بدون پرداخت این ستون
--    را false می‌گیرد تا ساعت را برای همیشه قفل نکند.
ALTER TABLE bookings
  ADD COLUMN holds_slot TINYINT(1) NOT NULL DEFAULT 0;

-- نوبت‌های موجود: قطعی، انجام‌شده و درخواست آنلاینِ پرداخت‌شده ساعت را
-- نگه می‌دارند. درخواست بدون پرداخت عمداً false می‌ماند.
UPDATE bookings
SET holds_slot = 1
WHERE status IN ('confirmed', 'completed')
   OR (status = 'pending' AND online_paid_at IS NOT NULL);

ALTER TABLE bookings
  ADD INDEX IDX_bookings_barber_date_holds (barber_id, date, holds_slot);

-- ۳) نگه‌داشتن موقت ساعت هنگام رفتن مشتری به درگاه پرداخت
CREATE TABLE IF NOT EXISTS slot_holds (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  barber_id CHAR(36) NOT NULL,
  date DATE NOT NULL,
  start_minutes INT NOT NULL,
  end_minutes INT NOT NULL,
  order_id VARCHAR(64) NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  INDEX IDX_slot_holds_barber_date_expires (barber_id, date, expires_at),
  INDEX IDX_slot_holds_order (order_id),
  INDEX IDX_slot_holds_expires (expires_at)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4;
