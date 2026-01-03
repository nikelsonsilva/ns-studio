-- =====================================================
-- RESET INFALÍVEL
-- =====================================================

-- Deletar tabelas em ordem (CASCADE remove tudo associado)
DROP TABLE IF EXISTS membership_subscriptions CASCADE;
DROP TABLE IF EXISTS membership_plans CASCADE;
DROP TABLE IF EXISTS financial_records CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS appointments CASCADE;
DROP TABLE IF EXISTS clients CASCADE;
DROP TABLE IF EXISTS services CASCADE;
DROP TABLE IF EXISTS professionals CASCADE;
DROP TABLE IF EXISTS businesses CASCADE;

-- Deletar funções customizadas
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;

-- =====================================================
-- PRONTO! O banco está limpo.
-- Agora execute o schema.sql
-- =====================================================
