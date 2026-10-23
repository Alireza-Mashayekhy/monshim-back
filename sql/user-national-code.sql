-- اضافه کردن ستون کد ملی (national_code) به جدول کاربران برای احراز هویت بانکی و تطبیق شاهکار با زحل
-- فقط برای محیط production مورد نیاز است (در dev از synchronize تایپ‌ارم استفاده می‌شود)

ALTER TABLE users ADD COLUMN national_code VARCHAR(10) NULL;
ALTER TABLE users ADD UNIQUE KEY uq_users_national_code (national_code);
