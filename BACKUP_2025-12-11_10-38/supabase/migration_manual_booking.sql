-- =====================================================
-- MIGRATION: Sistema de Agendamento Manual
-- =====================================================
-- Adiciona suporte para agendamento manual com link de confirmação
-- e opção de pagamento presencial
-- =====================================================

-- PASSO 1: Adicionar campos para link de confirmação
-- =====================================================

ALTER TABLE appointments ADD COLUMN IF NOT EXISTS booking_token TEXT UNIQUE;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'online';
-- payment_method: 'online' (paga via link) ou 'presential' (já pago no estabelecimento)

-- PASSO 2: Adicionar campo de ID de pagamento (para futuro Stripe)
-- =====================================================

ALTER TABLE appointments ADD COLUMN IF NOT EXISTS payment_id TEXT;

-- PASSO 3: Criar índice para busca rápida por token
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_appointments_token ON appointments(booking_token);

-- PASSO 4: Função para gerar token único
-- =====================================================

CREATE OR REPLACE FUNCTION generate_booking_token()
RETURNS TEXT AS $$
BEGIN
    RETURN encode(gen_random_bytes(16), 'hex');
END;
$$ LANGUAGE plpgsql;

-- PASSO 5: Comentários para documentação
-- =====================================================

COMMENT ON COLUMN appointments.booking_token IS 'Token único para link de confirmação do cliente';
COMMENT ON COLUMN appointments.payment_method IS 'Método de pagamento: online ou presential';
COMMENT ON COLUMN appointments.payment_id IS 'ID da transação do Stripe (quando payment_method = online)';

-- PASSO 6: Verificação final
-- =====================================================

SELECT 
    'Sistema de agendamento manual configurado!' as status,
    'Campos adicionados: booking_token, payment_method, payment_id' as campos,
    'Função criada: generate_booking_token()' as funcao;
