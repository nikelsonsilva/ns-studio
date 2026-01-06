-- =====================================================
-- MIGRAÇÃO: Tabela client_photos para galeria de clientes
-- =====================================================
-- Esta tabela armazena fotos/registros visuais de cortes
-- organizados por data (timeline) para cada cliente
-- =====================================================

-- 1. Criar tabela de fotos de clientes
CREATE TABLE IF NOT EXISTS client_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    
    -- Dados da foto
    url TEXT NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    type TEXT DEFAULT 'after' CHECK (type IN ('before', 'after')),
    notes TEXT,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Índices para performance
CREATE INDEX IF NOT EXISTS idx_client_photos_client_id ON client_photos(client_id);
CREATE INDEX IF NOT EXISTS idx_client_photos_business_id ON client_photos(business_id);
CREATE INDEX IF NOT EXISTS idx_client_photos_date ON client_photos(date DESC);

-- 3. Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_client_photos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS client_photos_updated_at ON client_photos;
CREATE TRIGGER client_photos_updated_at
    BEFORE UPDATE ON client_photos
    FOR EACH ROW
    EXECUTE FUNCTION update_client_photos_updated_at();

-- 4. RLS (Row Level Security) para multi-tenant
ALTER TABLE client_photos ENABLE ROW LEVEL SECURITY;

-- Policy: Permitir operações apenas para o próprio business
DROP POLICY IF EXISTS "Business can manage own client photos" ON client_photos;
CREATE POLICY "Business can manage own client photos"
    ON client_photos
    FOR ALL
    USING (
        business_id IN (
            SELECT id FROM businesses WHERE user_id = auth.uid()
        )
    )
    WITH CHECK (
        business_id IN (
            SELECT id FROM businesses WHERE user_id = auth.uid()
        )
    );

-- =====================================================
-- VERIFICAÇÃO
-- =====================================================

SELECT 
    column_name, 
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'client_photos' 
ORDER BY ordinal_position;

SELECT '✅ Tabela client_photos criada com sucesso!' as status;
