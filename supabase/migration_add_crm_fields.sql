-- =====================================================
-- MIGRAÇÃO: Adicionar campos CRM avançado na tabela clients
-- =====================================================
-- Execute este script no Supabase SQL Editor para adicionar
-- os campos necessários para as funcionalidades de CRM
-- =====================================================

-- Verificar se a coluna existe antes de adicionar (evita erros)

-- 1. Notas internas do cliente
ALTER TABLE clients ADD COLUMN IF NOT EXISTS internal_notes TEXT;

-- 2. Preferência de bebida
ALTER TABLE clients ADD COLUMN IF NOT EXISTS drink_preference TEXT;

-- 3. Estilo de conversa
ALTER TABLE clients ADD COLUMN IF NOT EXISTS conversation_style TEXT;

-- 4. Alergias (array de strings)
ALTER TABLE clients ADD COLUMN IF NOT EXISTS allergies TEXT[];

-- 5. Data de nascimento
ALTER TABLE clients ADD COLUMN IF NOT EXISTS birth_date DATE;

-- 6. Pontos de fidelidade
ALTER TABLE clients ADD COLUMN IF NOT EXISTS loyalty_points INTEGER DEFAULT 0;

-- 7. Nível de fidelidade
ALTER TABLE clients ADD COLUMN IF NOT EXISTS loyalty_tier TEXT DEFAULT 'Bronze';

-- 8. Total de visitas
ALTER TABLE clients ADD COLUMN IF NOT EXISTS total_visits INTEGER DEFAULT 0;

-- 9. Valor total gasto (lifetime value)
ALTER TABLE clients ADD COLUMN IF NOT EXISTS lifetime_value NUMERIC(10,2) DEFAULT 0;

-- 10. Data da última visita
ALTER TABLE clients ADD COLUMN IF NOT EXISTS last_visit_date TIMESTAMPTZ;

-- =====================================================
-- VERIFICAÇÃO
-- =====================================================

SELECT 
    column_name, 
    data_type 
FROM information_schema.columns 
WHERE table_name = 'clients' 
ORDER BY ordinal_position;

-- Mensagem de sucesso
SELECT '✅ Campos CRM adicionados com sucesso!' as status;
