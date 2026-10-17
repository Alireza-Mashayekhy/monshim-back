-- فعال‌سازی «صفحه عمومی» برای آرایشگرها
-- اجرا کنید قبل از استقرار کد مرتبط در محیط production
-- (در محیط توسعه synchronize خودکار تغییرات entity را اعمال می‌کند).

-- ۱) هدف پرداخت جدید برای خرید پکیج صفحه عمومی
ALTER TABLE `payments`
  MODIFY COLUMN `purpose` ENUM('SUBSCRIPTION', 'BOOKING', 'WALLET', 'PUBLIC_PAGE') NOT NULL;

-- ۲) ایندکس برای بررسی سریع خرید پکیج صفحه عمومی هر کاربر
ALTER TABLE `payments`
  ADD INDEX `idx_payments_user_purpose_status` (`user_id`, `purpose`, `status`);

-- ۳) ایندکس برای شمارش سریع رزروهای بیعانه‌دار هر آرایشگر
ALTER TABLE `bookings`
  ADD INDEX `idx_bookings_barber_status` (`barber_id`, `status`);
