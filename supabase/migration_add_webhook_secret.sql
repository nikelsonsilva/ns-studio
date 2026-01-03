-- =====================================================
-- ADD STRIPE WEBHOOK SECRET TO BUSINESSES
-- =====================================================
-- Adiciona campo para armazenar o webhook secret do Stripe
-- Cada negócio tem seu próprio webhook secret
-- =====================================================

-- Adicionar coluna stripe_webhook_secret
ALTER TABLE businesses
ADD COLUMN IF NOT EXISTS stripe_webhook_secret TEXT;

-- Comentário
COMMENT ON COLUMN businesses.stripe_webhook_secret IS 'Stripe webhook signing secret (whsec_...) - criptografado';

-- =====================================================
-- NOTA: Configurar webhook secret
-- =====================================================
-- Para cada negócio, você precisa:
-- 1. Criar endpoint no Stripe Dashboard
-- 2. Copiar o Signing Secret (whsec_...)
-- 3. Salvar no banco (criptografado):
--
-- UPDATE businesses
-- SET stripe_webhook_secret = 'whsec_...'
-- WHERE id = 'seu_business_id';
-- =====================================================
