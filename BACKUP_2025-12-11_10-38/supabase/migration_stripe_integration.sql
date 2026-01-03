-- Migration: Stripe Payment Integration
-- Description: Add Stripe payment support with multi-tenant configuration

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table: stripe_config
-- Stores Stripe API configuration for each business
CREATE TABLE IF NOT EXISTS stripe_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    
    -- Stripe API Keys
    publishable_key TEXT NOT NULL,
    secret_key TEXT NOT NULL, -- Should be encrypted in production
    
    -- Configuration
    is_active BOOLEAN DEFAULT false,
    test_mode BOOLEAN DEFAULT true,
    
    -- Webhook Configuration
    webhook_secret TEXT,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure one config per business
    UNIQUE(business_id)
);

-- Table: payment_transactions
-- Tracks all payment transactions
CREATE TABLE IF NOT EXISTS payment_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
    
    -- Stripe Information
    stripe_session_id TEXT UNIQUE,
    stripe_payment_intent_id TEXT,
    stripe_customer_id TEXT,
    
    -- Payment Details
    amount DECIMAL(10, 2) NOT NULL,
    currency TEXT DEFAULT 'brl',
    status TEXT NOT NULL DEFAULT 'pending', -- pending, completed, failed, refunded
    
    -- Customer Information
    customer_email TEXT,
    customer_name TEXT,
    customer_phone TEXT,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    
    -- Constraints
    CONSTRAINT valid_status CHECK (status IN ('pending', 'completed', 'failed', 'refunded', 'cancelled'))
);

-- Add Stripe fields to services table
ALTER TABLE services 
ADD COLUMN IF NOT EXISTS stripe_product_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_price_id TEXT,
ADD COLUMN IF NOT EXISTS requires_payment BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS allow_online_payment BOOLEAN DEFAULT false;

-- Add payment fields to appointments table
ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS payment_transaction_id UUID REFERENCES payment_transactions(id),
ADD COLUMN IF NOT EXISTS payment_method TEXT; -- stripe, cash, pix, etc.

-- Add constraint for payment_status
ALTER TABLE appointments
ADD CONSTRAINT IF NOT EXISTS valid_payment_status 
CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded', 'not_required'));

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_stripe_config_business ON stripe_config(business_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_business ON payment_transactions(business_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_appointment ON payment_transactions(appointment_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_session ON payment_transactions(stripe_session_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON payment_transactions(status);
CREATE INDEX IF NOT EXISTS idx_services_stripe_product ON services(stripe_product_id);
CREATE INDEX IF NOT EXISTS idx_appointments_payment_status ON appointments(payment_status);

-- RLS Policies for stripe_config
ALTER TABLE stripe_config ENABLE ROW LEVEL SECURITY;

-- Business owners can manage their Stripe config
CREATE POLICY "Business owners can manage stripe config"
ON stripe_config
FOR ALL
USING (
    business_id IN (
        SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
);

-- RLS Policies for payment_transactions
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;

-- Business owners can view their transactions
CREATE POLICY "Business owners can view transactions"
ON payment_transactions
FOR SELECT
USING (
    business_id IN (
        SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
);

-- System can insert transactions (for webhook processing)
CREATE POLICY "System can insert transactions"
ON payment_transactions
FOR INSERT
WITH CHECK (true);

-- System can update transactions (for webhook processing)
CREATE POLICY "System can update transactions"
ON payment_transactions
FOR UPDATE
USING (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_stripe_config_updated_at
    BEFORE UPDATE ON stripe_config
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_transactions_updated_at
    BEFORE UPDATE ON payment_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE stripe_config IS 'Stores Stripe API configuration for each business';
COMMENT ON TABLE payment_transactions IS 'Tracks all payment transactions processed through Stripe';
COMMENT ON COLUMN services.stripe_product_id IS 'Stripe Product ID for this service';
COMMENT ON COLUMN services.stripe_price_id IS 'Stripe Price ID for this service';
COMMENT ON COLUMN services.requires_payment IS 'Whether this service requires payment';
COMMENT ON COLUMN services.allow_online_payment IS 'Whether online payment is enabled for this service';
COMMENT ON COLUMN appointments.payment_status IS 'Payment status: pending, paid, failed, refunded, not_required';
COMMENT ON COLUMN appointments.payment_transaction_id IS 'Reference to payment transaction if paid online';
