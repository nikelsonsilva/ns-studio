-- =====================================================
-- MIGRATION: Sistema de Comanda e Fechamento de Caixa
-- =====================================================

-- 1. Tabela de Comandas (agrupa agendamentos do cliente no dia)
CREATE TABLE IF NOT EXISTS comandas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) NOT NULL,
  client_id UUID REFERENCES clients(id),
  client_name TEXT NOT NULL,
  client_phone TEXT,
  client_email TEXT,
  comanda_date DATE NOT NULL,
  
  -- Valores
  subtotal DECIMAL(10,2) DEFAULT 0,
  discount_amount DECIMAL(10,2) DEFAULT 0,
  discount_type TEXT CHECK (discount_type IN ('fixed', 'percent')),
  discount_reason TEXT,
  tip_amount DECIMAL(10,2) DEFAULT 0,
  tip_professional_id UUID REFERENCES professionals(id),
  total DECIMAL(10,2) DEFAULT 0,
  
  -- Status
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed', 'cancelled')),
  closed_at TIMESTAMPTZ,
  closed_by UUID,
  
  -- NFS-e
  nfse_issued BOOLEAN DEFAULT false,
  nfse_id TEXT,
  nfse_number TEXT,
  nfse_pdf_url TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabela de Pagamentos Divididos
CREATE TABLE IF NOT EXISTS payment_splits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comanda_id UUID REFERENCES comandas(id) ON DELETE CASCADE NOT NULL,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('pix', 'credit', 'debit', 'cash')),
  amount DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Alterações na tabela appointments
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS comanda_id UUID REFERENCES comandas(id);
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS commission_amount DECIMAL(10,2);
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS commission_paid BOOLEAN DEFAULT false;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS commission_paid_at TIMESTAMPTZ;

-- 4. Índices para performance
CREATE INDEX IF NOT EXISTS idx_comandas_business_date ON comandas(business_id, comanda_date);
CREATE INDEX IF NOT EXISTS idx_comandas_client ON comandas(client_phone, comanda_date);
CREATE INDEX IF NOT EXISTS idx_appointments_comanda ON appointments(comanda_id);
CREATE INDEX IF NOT EXISTS idx_payment_splits_comanda ON payment_splits(comanda_id);

-- 5. Enable RLS
ALTER TABLE comandas ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_splits ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies for comandas
CREATE POLICY "Users can view comandas from their business" ON comandas
  FOR SELECT USING (
    business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can insert comandas for their business" ON comandas
  FOR INSERT WITH CHECK (
    business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update comandas from their business" ON comandas
  FOR UPDATE USING (
    business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid())
  );

-- 7. RLS Policies for payment_splits
CREATE POLICY "Users can manage payment_splits" ON payment_splits
  FOR ALL USING (
    comanda_id IN (
      SELECT id FROM comandas WHERE business_id IN (
        SELECT id FROM businesses WHERE user_id = auth.uid()
      )
    )
  );

-- 8. Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_comanda_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_comanda_updated_at
  BEFORE UPDATE ON comandas
  FOR EACH ROW
  EXECUTE FUNCTION update_comanda_updated_at();

-- 9. Comentários
COMMENT ON TABLE comandas IS 'Agrupa agendamentos do mesmo cliente no dia para fechamento de conta';
COMMENT ON TABLE payment_splits IS 'Formas de pagamento divididas para uma comanda';
COMMENT ON COLUMN appointments.comanda_id IS 'Referência à comanda que este agendamento pertence';
COMMENT ON COLUMN appointments.commission_amount IS 'Valor da comissão calculada para este atendimento';
