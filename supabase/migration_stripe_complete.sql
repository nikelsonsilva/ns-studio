-- =====================================================
-- STRIPE COMPLETE INTEGRATION - Migration
-- =====================================================
-- Adiciona TODAS as colunas necessárias para integração com Stripe
-- tanto na tabela businesses quanto na tabela services
-- =====================================================

-- =====================================================
-- BUSINESSES TABLE - Stripe Configuration
-- =====================================================

-- Adicionar colunas de configuração do Stripe
ALTER TABLE businesses 
ADD COLUMN IF NOT EXISTS stripe_api_key TEXT,
ADD COLUMN IF NOT EXISTS stripe_api_key_valid BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS stripe_webhook_secret TEXT;

-- Comentários
COMMENT ON COLUMN businesses.stripe_api_key IS 'Chave API do Stripe criptografada (AES-256-GCM)';
COMMENT ON COLUMN businesses.stripe_api_key_valid IS 'Indica se a chave do Stripe foi validada';
COMMENT ON COLUMN businesses.stripe_webhook_secret IS 'Secret para validar webhooks do Stripe';

-- =====================================================
-- SERVICES TABLE - Stripe Products Sync
-- =====================================================

-- Adicionar colunas de sincronização com Stripe
ALTER TABLE services 
ADD COLUMN IF NOT EXISTS stripe_product_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_price_id TEXT,
ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMP WITH TIME ZONE;

-- Índices para busca rápida
CREATE INDEX IF NOT EXISTS idx_services_stripe_product 
ON services(stripe_product_id) 
WHERE stripe_product_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_services_stripe_price 
ON services(stripe_price_id) 
WHERE stripe_price_id IS NOT NULL;

-- Comentários
COMMENT ON COLUMN services.stripe_product_id IS 'ID do produto no Stripe (prod_xxx)';
COMMENT ON COLUMN services.stripe_price_id IS 'ID do preço no Stripe (price_xxx)';
COMMENT ON COLUMN services.last_synced_at IS 'Última vez que foi sincronizado com Stripe';

-- Constraint para garantir que se tem product_id, tem price_id
ALTER TABLE services
DROP CONSTRAINT IF EXISTS check_stripe_ids;

ALTER TABLE services
ADD CONSTRAINT check_stripe_ids 
CHECK (
  (stripe_product_id IS NULL AND stripe_price_id IS NULL) OR
  (stripe_product_id IS NOT NULL AND stripe_price_id IS NOT NULL)
);

-- =====================================================
-- APPOINTMENTS TABLE - Payment Intent Tracking
-- =====================================================

-- Adicionar coluna para rastrear Payment Intent do Stripe
ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS payment_intent_id TEXT;

-- Índice para busca rápida
CREATE INDEX IF NOT EXISTS idx_appointments_payment_intent 
ON appointments(payment_intent_id) 
WHERE payment_intent_id IS NOT NULL;

-- Comentário
COMMENT ON COLUMN appointments.payment_intent_id IS 'ID do Payment Intent no Stripe (pi_xxx)';

-- =====================================================
-- VERIFICAÇÃO
-- =====================================================

-- Verificar se todas as colunas foram criadas
DO $$
BEGIN
    -- Verificar businesses
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'businesses' AND column_name = 'stripe_api_key'
    ) THEN
        RAISE EXCEPTION 'Coluna stripe_api_key não foi criada em businesses';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'businesses' AND column_name = 'stripe_api_key_valid'
    ) THEN
        RAISE EXCEPTION 'Coluna stripe_api_key_valid não foi criada em businesses';
    END IF;

    -- Verificar services
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'services' AND column_name = 'stripe_product_id'
    ) THEN
        RAISE EXCEPTION 'Coluna stripe_product_id não foi criada em services';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'services' AND column_name = 'stripe_price_id'
    ) THEN
        RAISE EXCEPTION 'Coluna stripe_price_id não foi criada em services';
    END IF;

    -- Verificar appointments
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'appointments' AND column_name = 'payment_intent_id'
    ) THEN
        RAISE EXCEPTION 'Coluna payment_intent_id não foi criada em appointments';
    END IF;

    RAISE NOTICE '✅ Todas as colunas do Stripe foram criadas com sucesso!';
END $$;
