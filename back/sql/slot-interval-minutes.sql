-- گام زمانی (به دقیقه) برای نمایش ساعت‌های خالی قابل رزرو هر آرایشگر
-- مقادیر مجاز در لایه اپلیکیشن: 15، 30 (پیش‌فرض)، 45 و 60 دقیقه.
--
-- این اسکریپت برای محیط production است؛ در سایر محیط‌ها synchronize خود TypeORM ستون را ایجاد می‌کند.

ALTER TABLE barber_profile
  ADD COLUMN slot_interval_minutes INT NOT NULL DEFAULT 30;
