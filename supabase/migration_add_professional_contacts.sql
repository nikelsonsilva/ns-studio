-- =====================================================
-- MIGRATION: Adicionar Email e Phone em Professionals
-- =====================================================
-- Adiciona colunas de contato que estavam faltando
-- =====================================================

-- Adicionar colunas de contato
ALTER TABLE professionals ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE professionals ADD COLUMN IF NOT EXISTS phone TEXT;

-- Comentários
COMMENT ON COLUMN professionals.email IS 'Email do profissional (opcional)';
COMMENT ON COLUMN professionals.phone IS 'Telefone do profissional (opcional)';

-- Verificação
SELECT 
    'Colunas adicionadas com sucesso!' as status,
    'professionals.email e professionals.phone' as colunas;
