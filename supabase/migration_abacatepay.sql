-- Migration: Add Abacate Pay columns to appointments table
-- This enables tracking of Abacate Pay billing ID for payment verification

-- Add abacatepay_billing_id column
ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS abacatepay_billing_id TEXT DEFAULT NULL;

-- Add payment_expires_at column for tracking payment expiration
ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS payment_expires_at TIMESTAMPTZ DEFAULT NULL;

-- Create index for faster lookups by billing ID
CREATE INDEX IF NOT EXISTS idx_appointments_abacatepay_billing_id 
ON appointments(abacatepay_billing_id) 
WHERE abacatepay_billing_id IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN appointments.abacatepay_billing_id IS 'Abacate Pay billing ID for payment tracking';
COMMENT ON COLUMN appointments.payment_expires_at IS 'Payment expiration timestamp (30 min after creation)';

-- Verify the columns were created
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'appointments' 
AND column_name IN ('abacatepay_billing_id', 'payment_expires_at');
