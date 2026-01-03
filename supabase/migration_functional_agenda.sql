-- =====================================================
-- SISTEMA DE AGENDA FUNCIONAL COMPLETO
-- =====================================================
-- Baseado nas especificações fornecidas pelo usuário
-- =====================================================

-- PARTE 1: DISPONIBILIDADE POR PROFISSIONAL
-- =====================================================

-- Já existe da migration anterior, mas garantindo estrutura
CREATE TABLE IF NOT EXISTS professional_availability (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    professional_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0 = domingo
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    break_start TIME,
    break_end TIME,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(professional_id, day_of_week)
);

CREATE INDEX IF NOT EXISTS idx_professional_availability_professional_day
    ON professional_availability (professional_id, day_of_week);

-- PARTE 2: BLOQUEIOS DE HORÁRIO
-- =====================================================

-- Já existe da migration anterior, mas garantindo estrutura
CREATE TABLE IF NOT EXISTS time_blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    professional_id UUID REFERENCES professionals(id) ON DELETE SET NULL,
    start_datetime TIMESTAMPTZ NOT NULL,
    end_datetime TIMESTAMPTZ NOT NULL,
    reason TEXT,
    block_type TEXT CHECK (block_type IN ('vacation', 'holiday', 'personal', 'maintenance', 'event')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CHECK (end_datetime > start_datetime)
);

CREATE INDEX IF NOT EXISTS idx_time_blocks_professional_time
    ON time_blocks (professional_id, start_datetime, end_datetime);

CREATE INDEX IF NOT EXISTS idx_time_blocks_business
    ON time_blocks (business_id);

-- PARTE 3: CONFIGURAÇÃO DE AGENDAMENTO POR NEGÓCIO
-- =====================================================

-- Adicionar booking_settings se não existir
ALTER TABLE businesses 
    ADD COLUMN IF NOT EXISTS booking_settings JSONB DEFAULT '{
        "min_advance_hours": 2,
        "max_advance_days": 30,
        "buffer_minutes": 15,
        "allow_same_day": true,
        "require_payment": false,
        "api_token": null
    }'::jsonb;

-- PARTE 4: AJUSTES NA TABELA APPOINTMENTS
-- =====================================================

-- Garantir que appointments tem os campos necessários
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS start_datetime TIMESTAMPTZ;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS end_datetime TIMESTAMPTZ;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS duration_minutes INTEGER;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS customer_name TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS customer_phone TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';
-- source: 'manual', 'public_link', 'whatsapp', 'api'

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_appointments_professional_datetime
    ON appointments (professional_id, start_datetime, end_datetime);

CREATE INDEX IF NOT EXISTS idx_appointments_business_datetime
    ON appointments (business_id, start_datetime);

CREATE INDEX IF NOT EXISTS idx_appointments_status
    ON appointments (status);

-- PARTE 5: FUNÇÃO PARA GERAR API TOKEN
-- =====================================================

CREATE OR REPLACE FUNCTION generate_api_token()
RETURNS TEXT AS $$
BEGIN
    RETURN 'bk_' || encode(gen_random_bytes(32), 'hex');
END;
$$ LANGUAGE plpgsql;

-- PARTE 6: COMENTÁRIOS PARA DOCUMENTAÇÃO
-- =====================================================

COMMENT ON TABLE professional_availability IS 'Horários de trabalho fixos por profissional e dia da semana';
COMMENT ON TABLE time_blocks IS 'Bloqueios de horário (férias, feriados, folgas, manutenção)';
COMMENT ON COLUMN businesses.booking_settings IS 'Configurações de agendamento do negócio (buffer, antecedência, etc)';
COMMENT ON COLUMN appointments.start_datetime IS 'Data e hora de início do agendamento';
COMMENT ON COLUMN appointments.end_datetime IS 'Data e hora de término do agendamento';
COMMENT ON COLUMN appointments.source IS 'Origem do agendamento: manual, public_link, whatsapp, api';

-- PARTE 7: VERIFICAÇÃO FINAL
-- =====================================================

SELECT 
    'Sistema de agenda funcional configurado!' as status,
    'Tabelas: professional_availability, time_blocks' as tabelas,
    'Campo adicionado: businesses.booking_settings' as configuracao,
    'Função criada: generate_api_token()' as funcao;
