-- Percentage discount codes for the barber public-page purchase.
-- Run in production (TypeORM synchronize is disabled there).
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
