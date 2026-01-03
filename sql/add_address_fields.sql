-- Script SQL para adicionar campos de endereço na tabela businesses
-- Execute este script no Supabase SQL Editor

-- 1. Adicionar coluna complement na tabela businesses
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS complement TEXT;

-- 2. Adicionar coluna zip_code na tabela businesses
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS zip_code TEXT;

-- 3. Adicionar coluna city na tabela businesses
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS city TEXT;

-- 4. Adicionar coluna state na tabela businesses
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS state TEXT;

-- 5. Comentários nas colunas
COMMENT ON COLUMN businesses.complement IS 'Complemento do endereço (número, sala, bloco, etc.)';
COMMENT ON COLUMN businesses.zip_code IS 'CEP do estabelecimento para localização precisa no mapa';
COMMENT ON COLUMN businesses.city IS 'Cidade do estabelecimento';
COMMENT ON COLUMN businesses.state IS 'Estado do estabelecimento (sigla, ex: SP)';

-- 6. Verificação
SELECT 
    'Campos adicionados com sucesso!' as status,
    'complement, zip_code, city, state' as campos_novos;
