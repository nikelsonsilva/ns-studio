-- Migration: Add NFS-e support to the system
-- Run this in Supabase SQL Editor

-- Add nfse_config column to businesses table (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'businesses' AND column_name = 'nfse_config'
    ) THEN
        ALTER TABLE businesses ADD COLUMN nfse_config JSONB DEFAULT '{}';
    END IF;
END $$;

-- Create nfse_history table for storing emitted invoices
CREATE TABLE IF NOT EXISTS nfse_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE NOT NULL,
    appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
    nuvem_fiscal_id TEXT, -- ID da nota na Nuvem Fiscal
    numero TEXT, -- Número da nota fiscal
    status TEXT DEFAULT 'pendente', -- pendente, autorizada, cancelada, erro
    valor DECIMAL(10,2),
    cliente_nome TEXT,
    cliente_cpf_cnpj TEXT,
    servico_descricao TEXT,
    xml_url TEXT,
    pdf_url TEXT,
    erro_mensagem TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_nfse_history_business_id ON nfse_history(business_id);
CREATE INDEX IF NOT EXISTS idx_nfse_history_appointment_id ON nfse_history(appointment_id);
CREATE INDEX IF NOT EXISTS idx_nfse_history_status ON nfse_history(status);
CREATE INDEX IF NOT EXISTS idx_nfse_history_created_at ON nfse_history(created_at DESC);

-- Enable RLS
ALTER TABLE nfse_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for nfse_history
DROP POLICY IF EXISTS "Users can view their business NFS-e" ON nfse_history;
CREATE POLICY "Users can view their business NFS-e" ON nfse_history
    FOR SELECT USING (
        business_id IN (
            SELECT b.id FROM businesses b
            WHERE b.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can insert NFS-e for their business" ON nfse_history;
CREATE POLICY "Users can insert NFS-e for their business" ON nfse_history
    FOR INSERT WITH CHECK (
        business_id IN (
            SELECT b.id FROM businesses b
            WHERE b.user_id = auth.uid()
        )
    );

-- Add comment to clarify nfse_config structure
COMMENT ON COLUMN businesses.nfse_config IS 'NFS-e configuration: {empresa_id, certificado_id, cnpj, inscricao_municipal, status, ambiente}';
COMMENT ON TABLE nfse_history IS 'History of all NFS-e (Nota Fiscal de Serviços) emitted by each business';
