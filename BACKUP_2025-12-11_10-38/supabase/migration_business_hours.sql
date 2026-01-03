-- =====================================================
-- MIGRATION: Horário de Funcionamento do Estabelecimento
-- =====================================================
-- Adiciona horário de funcionamento global do negócio
-- e buffer individual por profissional
-- =====================================================

-- PASSO 1: Adicionar horário de funcionamento em businesses
-- =====================================================

ALTER TABLE businesses ADD COLUMN IF NOT EXISTS business_hours JSONB DEFAULT '{
    "monday": {"open": "09:00", "close": "18:00", "closed": false},
    "tuesday": {"open": "09:00", "close": "18:00", "closed": false},
    "wednesday": {"open": "09:00", "close": "18:00", "closed": false},
    "thursday": {"open": "09:00", "close": "18:00", "closed": false},
    "friday": {"open": "09:00", "close": "18:00", "closed": false},
    "saturday": {"open": "09:00", "close": "14:00", "closed": false},
    "sunday": {"open": "09:00", "close": "14:00", "closed": true}
}'::jsonb;

-- PASSO 2: Adicionar buffer individual por profissional
-- =====================================================

ALTER TABLE professionals ADD COLUMN IF NOT EXISTS buffer_minutes INTEGER DEFAULT 15;
ALTER TABLE professionals ADD COLUMN IF NOT EXISTS custom_buffer BOOLEAN DEFAULT false;

-- Comentário: 
-- - buffer_minutes: tempo de intervalo entre atendimentos (padrão 15min)
-- - custom_buffer: se TRUE, usa o buffer do profissional; se FALSE, usa o buffer global do negócio

-- PASSO 3: Atualizar booking_settings com buffer global
-- =====================================================

-- Garantir que todos os negócios tenham o buffer_minutes configurado
UPDATE businesses
SET booking_settings = jsonb_set(
    COALESCE(booking_settings, '{}'::jsonb),
    '{buffer_minutes}',
    '15'::jsonb
)
WHERE booking_settings IS NULL 
   OR booking_settings->>'buffer_minutes' IS NULL;

-- PASSO 4: Função para validar horário dentro do expediente
-- =====================================================

CREATE OR REPLACE FUNCTION is_within_business_hours(
    p_business_id UUID,
    p_day_of_week INTEGER,
    p_time TIME
) RETURNS BOOLEAN AS $$
DECLARE
    v_business_hours JSONB;
    v_day_key TEXT;
    v_open TIME;
    v_close TIME;
    v_closed BOOLEAN;
BEGIN
    -- Mapear dia da semana para chave JSON
    v_day_key := CASE p_day_of_week
        WHEN 0 THEN 'sunday'
        WHEN 1 THEN 'monday'
        WHEN 2 THEN 'tuesday'
        WHEN 3 THEN 'wednesday'
        WHEN 4 THEN 'thursday'
        WHEN 5 THEN 'friday'
        WHEN 6 THEN 'saturday'
    END;

    -- Buscar horário do negócio
    SELECT business_hours INTO v_business_hours
    FROM businesses
    WHERE id = p_business_id;

    -- Extrair dados do dia
    v_closed := (v_business_hours->v_day_key->>'closed')::BOOLEAN;
    
    IF v_closed THEN
        RETURN FALSE;
    END IF;

    v_open := (v_business_hours->v_day_key->>'open')::TIME;
    v_close := (v_business_hours->v_day_key->>'close')::TIME;

    -- Verificar se está dentro do horário
    RETURN p_time >= v_open AND p_time < v_close;
END;
$$ LANGUAGE plpgsql;

-- PASSO 5: Função para obter buffer do profissional
-- =====================================================

CREATE OR REPLACE FUNCTION get_professional_buffer(
    p_professional_id UUID,
    p_business_id UUID
) RETURNS INTEGER AS $$
DECLARE
    v_custom_buffer BOOLEAN;
    v_buffer_minutes INTEGER;
    v_global_buffer INTEGER;
BEGIN
    -- Buscar configuração do profissional
    SELECT custom_buffer, buffer_minutes 
    INTO v_custom_buffer, v_buffer_minutes
    FROM professionals
    WHERE id = p_professional_id;

    -- Se usa buffer customizado, retornar o do profissional
    IF v_custom_buffer THEN
        RETURN v_buffer_minutes;
    END IF;

    -- Caso contrário, retornar o buffer global do negócio
    SELECT (booking_settings->>'buffer_minutes')::INTEGER
    INTO v_global_buffer
    FROM businesses
    WHERE id = p_business_id;

    RETURN COALESCE(v_global_buffer, 15);
END;
$$ LANGUAGE plpgsql;

-- PASSO 6: Popular dados padrão (opcional)
-- =====================================================

-- Atualizar profissionais existentes com buffer padrão
UPDATE professionals
SET 
    buffer_minutes = 15,
    custom_buffer = false
WHERE buffer_minutes IS NULL;

-- PASSO 7: Exemplos de uso
-- =====================================================

-- Exemplo 1: Verificar se 14:30 está dentro do horário de segunda-feira
/*
SELECT is_within_business_hours(
    'seu_business_id'::UUID,
    1, -- Segunda-feira
    '14:30'::TIME
);
*/

-- Exemplo 2: Obter buffer de um profissional
/*
SELECT get_professional_buffer(
    'professional_id'::UUID,
    'business_id'::UUID
);
*/

-- Exemplo 3: Configurar horário especial (sábado 9h-14h)
/*
UPDATE businesses
SET business_hours = jsonb_set(
    business_hours,
    '{saturday}',
    '{"open": "09:00", "close": "14:00", "closed": false}'::jsonb
)
WHERE user_id = auth.uid();
*/

-- Exemplo 4: Fechar aos domingos
/*
UPDATE businesses
SET business_hours = jsonb_set(
    business_hours,
    '{sunday,closed}',
    'true'::jsonb
)
WHERE user_id = auth.uid();
*/

-- Exemplo 5: Configurar buffer customizado para profissional
/*
UPDATE professionals
SET 
    custom_buffer = true,
    buffer_minutes = 30
WHERE id = 'professional_id';
*/

-- PASSO 8: Verificação final
-- =====================================================

SELECT 
    'Horário de funcionamento configurado!' as status,
    'Campos adicionados: business_hours, buffer_minutes, custom_buffer' as campos,
    'Funções criadas: is_within_business_hours, get_professional_buffer' as funcoes;
