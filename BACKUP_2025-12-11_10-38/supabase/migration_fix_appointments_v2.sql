-- =====================================================
-- MIGRAÇÃO CORRIGIDA: Atualizar Appointments
-- =====================================================
-- Este script adiciona os campos necessários para o sistema de agendamento
-- =====================================================

-- PASSO 1: Adicionar novos campos (se não existirem)
ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS start_datetime TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS end_datetime TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS payment_method TEXT,
ADD COLUMN IF NOT EXISTS payment_link TEXT;

-- PASSO 2: Para appointments existentes SEM start_datetime, criar um valor padrão
-- (apenas se houver dados antigos)
UPDATE appointments
SET 
    start_datetime = COALESCE(start_datetime, NOW()),
    end_datetime = COALESCE(end_datetime, NOW() + interval '1 hour')
WHERE start_datetime IS NULL;

-- PASSO 3: Tornar campos obrigatórios
ALTER TABLE appointments
ALTER COLUMN start_datetime SET NOT NULL,
ALTER COLUMN end_datetime SET NOT NULL;

-- PASSO 4: Atualizar/Criar constraints de payment_status
ALTER TABLE appointments
DROP CONSTRAINT IF EXISTS appointments_payment_status_check;

ALTER TABLE appointments
ADD CONSTRAINT appointments_payment_status_check
CHECK (payment_status IN ('pending', 'paid', 'awaiting_payment', 'refunded'));

-- PASSO 5: Adicionar constraint para payment_method
ALTER TABLE appointments
DROP CONSTRAINT IF EXISTS appointments_payment_method_check;

ALTER TABLE appointments
ADD CONSTRAINT appointments_payment_method_check
CHECK (payment_method IS NULL OR payment_method IN ('online', 'presential'));

-- PASSO 6: Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_appointments_start_datetime ON appointments(business_id, start_datetime);
CREATE INDEX IF NOT EXISTS idx_appointments_professional ON appointments(professional_id, start_datetime);
CREATE INDEX IF NOT EXISTS idx_appointments_payment_status ON appointments(payment_status);
CREATE INDEX IF NOT EXISTS idx_appointments_payment_method ON appointments(payment_method);

-- PASSO 7: Comentários
COMMENT ON COLUMN appointments.start_datetime IS 'Data e hora de início do agendamento';
COMMENT ON COLUMN appointments.end_datetime IS 'Data e hora de término do agendamento';
COMMENT ON COLUMN appointments.payment_status IS 'Status do pagamento: pending, paid, awaiting_payment, refunded';
COMMENT ON COLUMN appointments.payment_method IS 'Método de pagamento: online (link), presential (no local)';
COMMENT ON COLUMN appointments.payment_link IS 'Link de pagamento gerado (Stripe Payment Link)';

-- VERIFICAÇÃO FINAL
SELECT 
    'Migração concluída com sucesso!' as status,
    'Tabela appointments atualizada para usar start_datetime/end_datetime' as resultado;
