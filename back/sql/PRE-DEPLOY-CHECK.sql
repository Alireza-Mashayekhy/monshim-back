-- ============================================================================
-- بررسی پیش از deploy — فقط SELECT است، هیچ چیزی را تغییر نمی‌دهد
-- ============================================================================
-- هدف: قبل از اینکه سرویس جدید بالا بیاید، مطمئن شویم همهٔ ستون‌های
-- الزامی وجود دارند. اگر یکی نباشد، سرویس در بوت DDL می‌زند و اگر
-- دیتابیس اجازهٔ ALTER ندهد، **سرویس اصلاً بالا نمی‌آید**.
--
-- اجرا:
--   mysql -u root -p monshim < back/sql/PRE-DEPLOY-CHECK.sql
--
-- خروجی: هر ردیف یک ستون مورد نیاز است و ستون `status` می‌گوید OK یا MISSING.
-- اگر هیچ ردیف MISSING نبود، deploy امن است.
-- ============================================================================

SELECT 'barber_profile.is_publicly_visible (الزامی — نبودش سرویس را بالا نمی‌آورد)' AS requirement,
       IF(COUNT(*) > 0, 'OK', 'MISSING') AS status
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'barber_profile'
  AND COLUMN_NAME = 'is_publicly_visible'

UNION ALL
SELECT 'barber_profile.pending_changes',
       IF(COUNT(*) > 0, 'OK', 'MISSING')
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'barber_profile'
  AND COLUMN_NAME = 'pending_changes'

UNION ALL
SELECT 'barber_profile.pending_status',
       IF(COUNT(*) > 0, 'OK', 'MISSING')
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'barber_profile'
  AND COLUMN_NAME = 'pending_status'

UNION ALL
SELECT 'barber_profile.pending_rejection_reason',
       IF(COUNT(*) > 0, 'OK', 'MISSING')
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'barber_profile'
  AND COLUMN_NAME = 'pending_rejection_reason'

UNION ALL
SELECT 'site_settings.commission_mode',
       IF(COUNT(*) > 0, 'OK', 'MISSING')
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'site_settings'
  AND COLUMN_NAME = 'commission_mode'

UNION ALL
SELECT 'site_settings.commission_tiers',
       IF(COUNT(*) > 0, 'OK', 'MISSING')
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'site_settings'
  AND COLUMN_NAME = 'commission_tiers'

UNION ALL
SELECT 'site_settings.commission_max_amount',
       IF(COUNT(*) > 0, 'OK', 'MISSING')
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'site_settings'
  AND COLUMN_NAME = 'commission_max_amount'

UNION ALL
SELECT 'blog_articles (table)',
       IF(COUNT(*) > 0, 'OK', 'MISSING')
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'blog_articles'

UNION ALL
SELECT 'user.national_code',
       IF(COUNT(*) > 0, 'OK', 'MISSING')
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user'
  AND COLUMN_NAME = 'national_code'

UNION ALL
SELECT 'booking.slot_interval_minutes',
       IF(COUNT(*) > 0, 'OK', 'MISSING')
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'booking'
  AND COLUMN_NAME = 'slot_interval_minutes'

UNION ALL
SELECT 'booking.deposit_token (لینک بیعانه)',
       IF(COUNT(*) > 0, 'OK', 'MISSING')
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'booking'
  AND COLUMN_NAME = 'deposit_token'

UNION ALL
SELECT 'barber_profile (table)',
       IF(COUNT(*) > 0, 'OK', 'MISSING')
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'barber_profile'

UNION ALL
SELECT 'site_settings (table)',
       IF(COUNT(*) > 0, 'OK', 'MISSING')
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'site_settings';
