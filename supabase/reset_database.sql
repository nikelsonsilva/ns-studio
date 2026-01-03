-- =====================================================
-- RESET SIMPLES - Remove apenas o necessário
-- =====================================================
-- Execute este script no Supabase SQL Editor
-- =====================================================

-- Remover tabelas na ordem correta (dependências primeiro)
DROP TABLE IF EXISTS appointments CASCADE;
DROP TABLE IF EXISTS financial_records CASCADE;
DROP TABLE IF EXISTS recurring_expenses CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS clients CASCADE;
DROP TABLE IF EXISTS professionals CASCADE;
DROP TABLE IF EXISTS services CASCADE;
DROP TABLE IF EXISTS businesses CASCADE;

-- Remover funções e triggers
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS get_current_business_id() CASCADE;

-- Remover tipos ENUM
DROP TYPE IF EXISTS business_type CASCADE;
DROP TYPE IF EXISTS appointment_status CASCADE;
DROP TYPE IF EXISTS payment_method CASCADE;
DROP TYPE IF EXISTS transaction_type CASCADE;

-- Mensagem de sucesso
SELECT 'Reset concluído! Agora execute o schema.sql' as status;
