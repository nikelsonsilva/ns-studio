-- =====================================================
-- MIGRATION: Add email, phone, and monthly_goal to professionals
-- =====================================================
-- Execute este script no Supabase SQL Editor

-- Adicionar colunas à tabela professionals
ALTER TABLE professionals 
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS monthly_goal NUMERIC(10,2) DEFAULT 5000.00;

-- Verificação
SELECT 
    'Colunas adicionadas com sucesso!' as status,
    'email, phone, monthly_goal' as colunas_adicionadas;
