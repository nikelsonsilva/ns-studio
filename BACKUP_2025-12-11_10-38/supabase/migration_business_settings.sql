-- =====================================================
-- MIGRAÇÃO: Sistema de Configurações e Fidelidade
-- =====================================================
-- Execute este script no Supabase SQL Editor
-- =====================================================

-- 1. Tabela de Configurações do Negócio
CREATE TABLE IF NOT EXISTS business_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL UNIQUE REFERENCES businesses(id) ON DELETE CASCADE,
    
    -- Feature Toggles
    loyalty_enabled BOOLEAN DEFAULT true,  -- Ativo por padrão
    marketing_enabled BOOLEAN DEFAULT false,
    reminders_enabled BOOLEAN DEFAULT false,
    gallery_enabled BOOLEAN DEFAULT false,
    payments_enabled BOOLEAN DEFAULT true,
    
    -- Configurações do Programa de Fidelidade
    loyalty_visits_for_reward INTEGER DEFAULT 10,
    loyalty_reward_description TEXT DEFAULT 'Corte grátis',
    loyalty_tiers JSONB DEFAULT '[
        {"name": "Bronze", "min_visits": 0, "discount": 0, "color": "#CD7F32"},
        {"name": "Prata", "min_visits": 5, "discount": 5, "color": "#C0C0C0"},
        {"name": "Ouro", "min_visits": 15, "discount": 10, "color": "#FFD700"},
        {"name": "Diamante", "min_visits": 30, "discount": 15, "color": "#B9F2FF"}
    ]',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabela de Histórico de Resgates de Fidelidade
CREATE TABLE IF NOT EXISTS loyalty_redemptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    visits_at_redemption INTEGER NOT NULL,
    reward_description TEXT NOT NULL,
    redeemed_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_business_settings_business_id ON business_settings(business_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_redemptions_client_id ON loyalty_redemptions(client_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_redemptions_business_id ON loyalty_redemptions(business_id);

-- 4. Habilitar RLS
ALTER TABLE business_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_redemptions ENABLE ROW LEVEL SECURITY;

-- 5. Políticas de RLS para business_settings (Drop first to allow re-run)
DROP POLICY IF EXISTS "Usuários podem ver settings do seu negócio" ON business_settings;
DROP POLICY IF EXISTS "Usuários podem atualizar settings do seu negócio" ON business_settings;
DROP POLICY IF EXISTS "Usuários podem inserir settings do seu negócio" ON business_settings;

CREATE POLICY "Usuários podem ver settings do seu negócio"
    ON business_settings FOR SELECT
    USING (business_id IN (
        SELECT id FROM businesses WHERE user_id = auth.uid()
    ));

CREATE POLICY "Usuários podem atualizar settings do seu negócio"
    ON business_settings FOR UPDATE
    USING (business_id IN (
        SELECT id FROM businesses WHERE user_id = auth.uid()
    ));

CREATE POLICY "Usuários podem inserir settings do seu negócio"
    ON business_settings FOR INSERT
    WITH CHECK (business_id IN (
        SELECT id FROM businesses WHERE user_id = auth.uid()
    ));

-- 6. Políticas de RLS para loyalty_redemptions (Drop first to allow re-run)
DROP POLICY IF EXISTS "Usuários podem ver resgates do seu negócio" ON loyalty_redemptions;
DROP POLICY IF EXISTS "Usuários podem inserir resgates no seu negócio" ON loyalty_redemptions;

CREATE POLICY "Usuários podem ver resgates do seu negócio"
    ON loyalty_redemptions FOR SELECT
    USING (business_id IN (
        SELECT id FROM businesses WHERE user_id = auth.uid()
    ));

CREATE POLICY "Usuários podem inserir resgates no seu negócio"
    ON loyalty_redemptions FOR INSERT
    WITH CHECK (business_id IN (
        SELECT id FROM businesses WHERE user_id = auth.uid()
    ));

-- 7. Função para criar settings padrão automaticamente
CREATE OR REPLACE FUNCTION create_default_settings()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO business_settings (business_id)
    VALUES (NEW.id)
    ON CONFLICT (business_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. Trigger para criar settings quando um negócio é criado
DROP TRIGGER IF EXISTS trigger_create_default_settings ON businesses;
CREATE TRIGGER trigger_create_default_settings
    AFTER INSERT ON businesses
    FOR EACH ROW
    EXECUTE FUNCTION create_default_settings();

-- 9. Criar settings para negócios existentes
INSERT INTO business_settings (business_id)
SELECT id FROM businesses
ON CONFLICT (business_id) DO NOTHING;

-- 10. Adicionar campo para rastrear visitas desde último resgate
ALTER TABLE clients ADD COLUMN IF NOT EXISTS visits_since_last_reward INTEGER DEFAULT 0;

-- Verificação final
SELECT 'business_settings' as tabela, count(*) as registros FROM business_settings
UNION ALL
SELECT 'loyalty_redemptions', count(*) FROM loyalty_redemptions;

SELECT '✅ Migração de Settings e Fidelidade completada!' as status;
