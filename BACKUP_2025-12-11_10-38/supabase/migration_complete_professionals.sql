-- =====================================================
-- MIGRATION: Completar Schema de Professionals
-- =====================================================
-- Adiciona todos os campos necessários para o modal funcionar
-- =====================================================

-- PASSO 1: Adicionar campos de contato (se não existirem)
ALTER TABLE professionals ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE professionals ADD COLUMN IF NOT EXISTS phone TEXT;

-- PASSO 2: Adicionar campos financeiros (se não existirem)
ALTER TABLE professionals ADD COLUMN IF NOT EXISTS commission_rate NUMERIC(5,2) DEFAULT 50.00;
ALTER TABLE professionals ADD COLUMN IF NOT EXISTS monthly_goal NUMERIC(10,2) DEFAULT 5000.00;

-- PASSO 3: Adicionar campos de buffer (se não existirem)
ALTER TABLE professionals ADD COLUMN IF NOT EXISTS buffer_minutes INTEGER DEFAULT 15;
ALTER TABLE professionals ADD COLUMN IF NOT EXISTS custom_buffer BOOLEAN DEFAULT false;

-- PASSO 4: Adicionar outros campos úteis (se não existirem)
ALTER TABLE professionals ADD COLUMN IF NOT EXISTS specialty TEXT;
ALTER TABLE professionals ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- PASSO 5: Comentários para documentação
COMMENT ON COLUMN professionals.email IS 'Email do profissional (opcional)';
COMMENT ON COLUMN professionals.phone IS 'Telefone do profissional (opcional)';
COMMENT ON COLUMN professionals.commission_rate IS 'Taxa de comissão em % (padrão 50%)';
COMMENT ON COLUMN professionals.monthly_goal IS 'Meta mensal em R$ (padrão 5000)';
COMMENT ON COLUMN professionals.buffer_minutes IS 'Intervalo entre atendimentos em minutos (padrão 15)';
COMMENT ON COLUMN professionals.custom_buffer IS 'Se TRUE, usa buffer customizado; se FALSE, usa buffer global';
COMMENT ON COLUMN professionals.specialty IS 'Especialidade do profissional';
COMMENT ON COLUMN professionals.is_active IS 'Se o profissional está ativo';

-- PASSO 6: Verificação final - Mostrar estrutura da tabela
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'professionals'
ORDER BY ordinal_position;
