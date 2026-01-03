-- Migration: Add payment fields to appointments table
-- This enables tracking of payment status and method for appointments

-- Add payment-related columns
ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS payment_method TEXT,
ADD COLUMN IF NOT EXISTS payment_link TEXT;

-- Add constraints for payment_status
ALTER TABLE appointments
DROP CONSTRAINT IF EXISTS check_payment_status;

ALTER TABLE appointments
ADD CONSTRAINT check_payment_status
CHECK (payment_status IN ('pending', 'paid', 'awaiting_payment'));

-- Add constraints for payment_method
ALTER TABLE appointments
DROP CONSTRAINT IF EXISTS check_payment_method;

ALTER TABLE appointments
ADD CONSTRAINT check_payment_method
CHECK (payment_method IS NULL OR payment_method IN ('online', 'presential'));

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_appointments_payment_status ON appointments(payment_status);
CREATE INDEX IF NOT EXISTS idx_appointments_payment_method ON appointments(payment_method);

-- Update existing appointments to have default payment status
UPDATE appointments
SET payment_status = 'pending'
WHERE payment_status IS NULL;

COMMENT ON COLUMN appointments.payment_status IS 'Payment status: pending, paid, awaiting_payment';
COMMENT ON COLUMN appointments.payment_method IS 'Payment method: online (link), presential (in-person)';
COMMENT ON COLUMN appointments.payment_link IS 'Generated payment link for online payments';
