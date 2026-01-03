-- Script SQL para adicionar coluna logo_url na tabela businesses
-- Execute este script no Supabase SQL Editor

-- 1. Adicionar coluna logo_url na tabela businesses
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- 2. Comentário na coluna
COMMENT ON COLUMN businesses.logo_url IS 'URL da logo do estabelecimento (pode ser do Storage ou URL externa)';

-- 3. Criar bucket para logos (execute isso no Storage do Supabase ou via SQL)
-- NOTA: Buckets são gerenciados via Dashboard ou API, não via SQL direto
-- Acesse: Supabase > Storage > New Bucket > Nome: "business-logos" > Public: ON

-- 4. Policy para permitir upload e leitura pública (se o bucket for criado via SQL)
-- INSERT INTO storage.buckets (id, name, public) 
-- VALUES ('business-logos', 'business-logos', true);

-- CREATE POLICY "Allow public access to business logos"
-- ON storage.objects FOR SELECT
-- USING (bucket_id = 'business-logos');

-- CREATE POLICY "Allow authenticated users to upload logos"
-- ON storage.objects FOR INSERT
-- WITH CHECK (bucket_id = 'business-logos' AND auth.role() = 'authenticated');

-- CREATE POLICY "Allow users to update their own logos"
-- ON storage.objects FOR UPDATE
-- USING (bucket_id = 'business-logos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- CREATE POLICY "Allow users to delete their own logos"
-- ON storage.objects FOR DELETE
-- USING (bucket_id = 'business-logos' AND auth.uid()::text = (storage.foldername(name))[1]);
