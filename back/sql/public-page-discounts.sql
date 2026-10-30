-- Percentage discount codes for the barber public-page purchase.
--
-- اجرای دستی این فایل در production دیگر **الزامی** نیست: `PublicPageSchemaService`
-- هنگام بالا آمدن بک‌اند، وجودِ جدول `public_page_discounts` را بررسی و در صورت
-- نبود، آن را از روی متادیتای entity (همین ستون‌ها + کلید یکتای `code`) می‌سازد.
-- این فایل برای زمانی نگه داشته شده که بخواهید جدول را پیش از deploy یا با دسترسی
-- CREATE محدود، دستی بسازید.
--
-- اگر جدول وجود نداشته باشد، «افزودن کد تخفیف» در پنل ادمین با خطای
-- `ER_NO_SUCH_TABLE` و در نتیجه HTTP 500/503 شکست می‌خورد.
CREATE TABLE IF NOT EXISTS public_page_discounts (
  id CHAR(36) NOT NULL,
  code VARCHAR(32) NOT NULL,
  percent_off TINYINT UNSIGNED NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY uq_public_page_discount_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
