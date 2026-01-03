-- Migration: Add Stripe API Keys Storage
-- Description: Allows saving Stripe keys to database so user doesn't need to reconfigure

-- Add columns to businesses table for Stripe keys
ALTER TABLE businesses 
ADD COLUMN IF NOT EXISTS stripe_publishable_key TEXT,
ADD COLUMN IF NOT EXISTS stripe_secret_key TEXT,
ADD COLUMN IF NOT EXISTS stripe_configured_at TIMESTAMPTZ;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_businesses_stripe_configured 
ON businesses(id) WHERE stripe_publishable_key IS NOT NULL;

COMMENT ON COLUMN businesses.stripe_publishable_key IS 'Stripe publishable key (pk_test_ or pk_live_)';
COMMENT ON COLUMN businesses.stripe_secret_key IS 'Stripe secret key (sk_test_ or sk_live_) - ENCRYPTED';
COMMENT ON COLUMN businesses.stripe_configured_at IS 'When Stripe was last configured';
