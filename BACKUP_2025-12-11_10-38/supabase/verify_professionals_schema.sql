-- =====================================================
-- VERIFICAR SCHEMA DA TABELA PROFESSIONALS
-- =====================================================
-- Execute este script para ver exatamente quais colunas existem
-- =====================================================

-- Ver estrutura completa da tabela
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'professionals'
ORDER BY ordinal_position;

-- Ver constraints
SELECT
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name = 'professionals';
