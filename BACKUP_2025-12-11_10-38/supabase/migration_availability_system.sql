-- =====================================================
-- MIGRATION: Sistema de Disponibilidade de Agenda
-- =====================================================
-- Adiciona sistema completo de disponibilidade para agendamentos
-- com suporte para horários de trabalho, bloqueios e configurações
-- =====================================================

-- PASSO 1: Adicionar configurações de agendamento em businesses
-- =====================================================

ALTER TABLE businesses ADD COLUMN IF NOT EXISTS booking_settings JSONB DEFAULT '{
    "min_advance_hours": 2,
    "max_advance_days": 30,
    "buffer_minutes": 15,
    "allow_same_day": true,
    "require_payment": false,
    "api_token": null,
    "slot_duration_minutes": 30
}'::jsonb;

-- PASSO 2: Criar tabela de disponibilidade de profissionais
-- =====================================================

CREATE TABLE IF NOT EXISTS professional_availability (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    professional_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
    
    -- Dia da semana: 0=Domingo, 1=Segunda, ..., 6=Sábado
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    
    -- Horários
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    
    -- Intervalo (almoço, etc)
    break_start TIME,
    break_end TIME,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Garantir que não haja duplicatas
    UNIQUE(professional_id, day_of_week)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_prof_availability_professional ON professional_availability(professional_id);
CREATE INDEX IF NOT EXISTS idx_prof_availability_business ON professional_availability(business_id);
CREATE INDEX IF NOT EXISTS idx_prof_availability_day ON professional_availability(day_of_week);

-- PASSO 3: Criar tabela de bloqueios de horários
-- =====================================================

CREATE TABLE IF NOT EXISTS time_blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    professional_id UUID REFERENCES professionals(id) ON DELETE CASCADE,
    
    -- Período bloqueado
    start_datetime TIMESTAMPTZ NOT NULL,
    end_datetime TIMESTAMPTZ NOT NULL,
    
    -- Informações
    reason TEXT,
    block_type TEXT DEFAULT 'personal' CHECK (block_type IN ('vacation', 'holiday', 'personal', 'maintenance', 'event')),
    
    -- Se NULL, bloqueia para todos os profissionais
    -- Se preenchido, bloqueia apenas para aquele profissional
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Validação: end_datetime deve ser depois de start_datetime
    CHECK (end_datetime > start_datetime)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_time_blocks_business ON time_blocks(business_id);
CREATE INDEX IF NOT EXISTS idx_time_blocks_professional ON time_blocks(professional_id);
CREATE INDEX IF NOT EXISTS idx_time_blocks_dates ON time_blocks(start_datetime, end_datetime);

-- PASSO 4: Configurar RLS (Row Level Security)
-- =====================================================

ALTER TABLE professional_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_blocks ENABLE ROW LEVEL SECURITY;

-- Policies para professional_availability
CREATE POLICY "Users can view own professional availability"
    ON professional_availability FOR SELECT
    USING (business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert own professional availability"
    ON professional_availability FOR INSERT
    WITH CHECK (business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid()));

CREATE POLICY "Users can update own professional availability"
    ON professional_availability FOR UPDATE
    USING (business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete own professional availability"
    ON professional_availability FOR DELETE
    USING (business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid()));

-- Policies para time_blocks
CREATE POLICY "Users can view own time blocks"
    ON time_blocks FOR SELECT
    USING (business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert own time blocks"
    ON time_blocks FOR INSERT
    WITH CHECK (business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid()));

CREATE POLICY "Users can update own time blocks"
    ON time_blocks FOR UPDATE
    USING (business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete own time blocks"
    ON time_blocks FOR DELETE
    USING (business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid()));

-- PASSO 5: Criar triggers de updated_at
-- =====================================================

CREATE TRIGGER update_professional_availability_updated_at
    BEFORE UPDATE ON professional_availability
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_time_blocks_updated_at
    BEFORE UPDATE ON time_blocks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- PASSO 6: Função auxiliar para gerar API token
-- =====================================================

CREATE OR REPLACE FUNCTION generate_api_token()
RETURNS TEXT AS $$
BEGIN
    RETURN 'bk_' || encode(gen_random_bytes(32), 'hex');
END;
$$ LANGUAGE plpgsql;

-- PASSO 7: Popular dados de exemplo (opcional)
-- =====================================================
-- Descomente para adicionar horários padrão aos profissionais existentes

/*
INSERT INTO professional_availability (business_id, professional_id, day_of_week, start_time, end_time, break_start, break_end)
SELECT 
    p.business_id,
    p.id,
    day_num,
    '09:00'::TIME,
    '18:00'::TIME,
    '12:00'::TIME,
    '13:00'::TIME
FROM professionals p
CROSS JOIN generate_series(1, 5) AS day_num -- Segunda a Sexta
WHERE p.is_active = true
ON CONFLICT (professional_id, day_of_week) DO NOTHING;
*/

-- PASSO 8: Verificação final
-- =====================================================

SELECT 
    'Sistema de disponibilidade criado com sucesso!' as status,
    'Tabelas criadas: professional_availability, time_blocks' as tabelas,
    'Campo adicionado: businesses.booking_settings' as configuracao;
