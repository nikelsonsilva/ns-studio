-- =====================================================
-- QUICK FIX - Garantir que tudo funcione
-- =====================================================
-- Execute este script no Supabase SQL Editor
-- =====================================================

-- Passo 1: Verificar se você tem um business
DO $$
DECLARE
    v_business_id UUID;
    v_user_id UUID;
BEGIN
    -- Pegar user_id atual
    SELECT auth.uid() INTO v_user_id;
    
    -- Verificar se business existe
    SELECT id INTO v_business_id
    FROM businesses
    WHERE user_id = v_user_id;
    
    -- Se não existir, criar
    IF v_business_id IS NULL THEN
        INSERT INTO businesses (user_id, business_name, business_type, email)
        VALUES (
            v_user_id,
            'NS Studio',
            'barbershop',
            (SELECT email FROM auth.users WHERE id = v_user_id)
        )
        RETURNING id INTO v_business_id;
        
        RAISE NOTICE 'Business criado com ID: %', v_business_id;
    ELSE
        RAISE NOTICE 'Business já existe com ID: %', v_business_id;
    END IF;
END $$;

-- Passo 2: Desabilitar RLS temporariamente (para debug)
ALTER TABLE businesses DISABLE ROW LEVEL SECURITY;
ALTER TABLE services DISABLE ROW LEVEL SECURITY;
ALTER TABLE professionals DISABLE ROW LEVEL SECURITY;
ALTER TABLE clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE appointments DISABLE ROW LEVEL SECURITY;
ALTER TABLE products DISABLE ROW LEVEL SECURITY;
ALTER TABLE financial_records DISABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_expenses DISABLE ROW LEVEL SECURITY;

-- Passo 3: Verificar dados
SELECT 'Businesses:' as tabela, COUNT(*) as total FROM businesses
UNION ALL
SELECT 'Services:', COUNT(*) FROM services
UNION ALL
SELECT 'Professionals:', COUNT(*) FROM professionals
UNION ALL
SELECT 'Clients:', COUNT(*) FROM clients;

-- Passo 4: Mostrar seu business
SELECT 
    id,
    business_name,
    business_type,
    email,
    created_at
FROM businesses
WHERE user_id = auth.uid();

-- =====================================================
-- RESULTADO ESPERADO:
-- - Business criado ou já existe
-- - RLS desabilitado
-- - Contagem de registros
-- - Seus dados de business
-- =====================================================
