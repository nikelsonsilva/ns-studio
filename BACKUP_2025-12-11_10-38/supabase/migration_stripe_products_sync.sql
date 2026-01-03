-- =====================================================
-- STRIPE PRODUCTS SYNC - Migration
-- =====================================================
-- Adiciona colunas para sincronização com produtos do Stripe
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
ADD CONSTRAINT check_stripe_ids 
CHECK (
  (stripe_product_id IS NULL AND stripe_price_id IS NULL) OR
  (stripe_product_id IS NOT NULL AND stripe_price_id IS NOT NULL)
);
