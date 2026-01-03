-- =====================================================
-- STRIPE RECURRING PAYMENTS - Migration
-- =====================================================
-- Adiciona suporte para pagamentos recorrentes (assinaturas)
-- e pagamentos avulsos (one-time)
-- =====================================================

-- Criar ENUM para tipo de cobrança
DO $$ BEGIN
    CREATE TYPE billing_type AS ENUM ('one_time', 'recurring');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Adicionar coluna de tipo de cobrança
ALTER TABLE services 
ADD COLUMN IF NOT EXISTS billing_type billing_type DEFAULT 'one_time',
ADD COLUMN IF NOT EXISTS recurring_interval VARCHAR(20),
ADD COLUMN IF NOT EXISTS recurring_interval_count INTEGER DEFAULT 1;

-- Comentários
COMMENT ON COLUMN services.billing_type IS 'Tipo de cobrança: one_time (avulso) ou recurring (assinatura)';
COMMENT ON COLUMN services.recurring_interval IS 'Intervalo de recorrência: day, week, month, year (apenas para recurring)';
COMMENT ON COLUMN services.recurring_interval_count IS 'Quantidade de intervalos (ex: 1 month, 3 months)';

-- Constraint para garantir que se é recurring, tem intervalo
ALTER TABLE services
DROP CONSTRAINT IF EXISTS check_recurring_interval;

ALTER TABLE services
ADD CONSTRAINT check_recurring_interval 
CHECK (
  (billing_type = 'one_time') OR
  (billing_type = 'recurring' AND recurring_interval IS NOT NULL)
);

-- Índice para busca por tipo de cobrança
CREATE INDEX IF NOT EXISTS idx_services_billing_type 
ON services(billing_type);

-- Verificação
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'services' AND column_name = 'billing_type'
    ) THEN
        RAISE EXCEPTION 'Coluna billing_type não foi criada';
    END IF;

    RAISE NOTICE '✅ Suporte a pagamentos recorrentes adicionado com sucesso!';
END $$;
