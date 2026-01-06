-- =====================================================
-- MIGRATION: Sistema de Fechamento de Caixa e Pagamento de Comissões
-- =====================================================

-- 1. Tabela de Fechamentos de Caixa (histórico diário)
CREATE TABLE IF NOT EXISTS cash_closings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) NOT NULL,
  closing_date DATE NOT NULL,
  
  -- Totais calculados
  total_revenue DECIMAL(10,2) DEFAULT 0,
  total_commissions DECIMAL(10,2) DEFAULT 0,
  total_tips DECIMAL(10,2) DEFAULT 0,
  total_discounts DECIMAL(10,2) DEFAULT 0,
  net_profit DECIMAL(10,2) DEFAULT 0,
  
  -- Por método de pagamento
  total_pix DECIMAL(10,2) DEFAULT 0,
  total_credit DECIMAL(10,2) DEFAULT 0,
  total_debit DECIMAL(10,2) DEFAULT 0,
  total_cash DECIMAL(10,2) DEFAULT 0,
  
  -- Contadores
  appointments_count INTEGER DEFAULT 0,
  comandas_count INTEGER DEFAULT 0,
  
  -- Status
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  closed_at TIMESTAMPTZ,
  closed_by UUID,
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint: one closing per business per day
  UNIQUE(business_id, closing_date)
);

-- 2. Tabela de Pagamentos de Comissões
CREATE TABLE IF NOT EXISTS commission_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) NOT NULL,
  professional_id UUID REFERENCES professionals(id) NOT NULL,
  cash_closing_id UUID REFERENCES cash_closings(id),
  
  -- Valores
  amount_due DECIMAL(10,2) NOT NULL,
  amount_paid DECIMAL(10,2) NOT NULL,
  payment_method TEXT CHECK (payment_method IN ('pix', 'cash', 'transfer', 'credit', 'debit')),
  
  -- Referência
  reference_date DATE NOT NULL,
  
  -- Status
  status TEXT DEFAULT 'paid' CHECK (status IN ('pending', 'partial', 'paid')),
  paid_at TIMESTAMPTZ DEFAULT NOW(),
  
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Índices para performance
CREATE INDEX IF NOT EXISTS idx_cash_closings_business_date ON cash_closings(business_id, closing_date);
CREATE INDEX IF NOT EXISTS idx_commission_payments_business ON commission_payments(business_id, reference_date);
CREATE INDEX IF NOT EXISTS idx_commission_payments_professional ON commission_payments(professional_id);

-- 4. Enable RLS
ALTER TABLE cash_closings ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_payments ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for cash_closings
CREATE POLICY "Users can view cash_closings from their business" ON cash_closings
  FOR SELECT USING (
    business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can insert cash_closings for their business" ON cash_closings
  FOR INSERT WITH CHECK (
    business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update cash_closings from their business" ON cash_closings
  FOR UPDATE USING (
    business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid())
  );

-- 6. RLS Policies for commission_payments
CREATE POLICY "Users can view commission_payments from their business" ON commission_payments
  FOR SELECT USING (
    business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can insert commission_payments for their business" ON commission_payments
  FOR INSERT WITH CHECK (
    business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update commission_payments from their business" ON commission_payments
  FOR UPDATE USING (
    business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid())
  );

-- 7. Comentários
COMMENT ON TABLE cash_closings IS 'Histórico de fechamentos de caixa diários';
COMMENT ON TABLE commission_payments IS 'Pagamentos de comissões aos profissionais';
