-- اعمال یک‌باره پیش از استقرار قابلیت‌های «بیعانه + نگه‌داشتن موقت ساعت».
-- در محیط توسعه با synchronize خودکار ساخته می‌شود؛ production نیاز به این فایل دارد.

-- ۱) مهلت پرداخت بیعانه: زمان آخرین ارسال لینک بیعانه
ALTER TABLE bookings
  ADD COLUMN deposit_requested_at DATETIME NULL;

-- ۲) نگه‌داشتن موقت ساعت هنگام رفتن مشتری به درگاه پرداخت
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
