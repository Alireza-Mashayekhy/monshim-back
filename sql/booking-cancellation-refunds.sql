-- Apply this once before deploying the booking cancellation/refund code in production.
ALTER TABLE bookings
  ADD COLUMN canceled_by VARCHAR(16) NULL,
  ADD COLUMN canceled_at DATETIME NULL;
