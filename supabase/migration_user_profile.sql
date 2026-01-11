-- =====================================================
-- MIGRATION: User Profile System
-- Tabelas para suporte ao modal de perfil do admin
-- =====================================================

-- =====================================================
-- 1. TABELA: subscription_plans (Planos SaaS)
-- =====================================================

CREATE TABLE IF NOT EXISTS subscription_plans (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    price DECIMAL(10,2) NOT NULL DEFAULT 0,
    features JSONB NOT NULL DEFAULT '[]',
    max_professionals INTEGER DEFAULT 1,
    is_recommended BOOLEAN DEFAULT false,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inserir planos padrão
INSERT INTO subscription_plans (id, name, price, features, max_professionals, is_recommended, sort_order) VALUES
    ('starter', 'Starter', 0, '["1 Barbeiro", "Agenda Básica", "Link Público"]', 1, false, 1),
    ('pro', 'Professional', 97, '["Até 5 Barbeiros", "Financeiro Completo", "Lembretes WhatsApp", "Relatórios Avançados"]', 5, true, 2),
    ('empire', 'Empire', 197, '["Barbeiros Ilimitados", "Múltiplas Unidades", "API de Integração", "Gerente de Conta Dedicado"]', 999, false, 3)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 2. TABELA: admin_activity_logs (Logs de Atividade)
-- =====================================================

CREATE TABLE IF NOT EXISTS admin_activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    log_type TEXT NOT NULL CHECK (log_type IN ('login', 'security', 'alert', 'profile', 'billing')),
    device TEXT,
    ip_address TEXT,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_business ON admin_activity_logs(business_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON admin_activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON admin_activity_logs(created_at DESC);

-- =====================================================
-- 3. TABELA: subscription_invoices (Faturas)
-- =====================================================

CREATE TABLE IF NOT EXISTS subscription_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    invoice_date DATE NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('paid', 'pending', 'failed', 'refunded')),
    description TEXT,
    stripe_invoice_id TEXT,
    invoice_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoices_business ON subscription_invoices(business_id);
CREATE INDEX IF NOT EXISTS idx_invoices_date ON subscription_invoices(invoice_date DESC);

-- =====================================================
-- 4. ADICIONAR COLUNAS EM businesses
-- =====================================================

-- Plano de assinatura
ALTER TABLE businesses 
    ADD COLUMN IF NOT EXISTS subscription_plan_id TEXT DEFAULT 'starter' REFERENCES subscription_plans(id);

-- Status da assinatura
ALTER TABLE businesses 
    ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'trial' 
    CHECK (subscription_status IN ('trial', 'active', 'past_due', 'canceled'));

-- Data fim do trial
ALTER TABLE businesses 
    ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;

-- Próxima data de cobrança
ALTER TABLE businesses 
    ADD COLUMN IF NOT EXISTS next_billing_date DATE;

-- Método de pagamento (cartão)
ALTER TABLE businesses 
    ADD COLUMN IF NOT EXISTS payment_method_brand TEXT;

ALTER TABLE businesses 
    ADD COLUMN IF NOT EXISTS payment_method_last4 TEXT;

ALTER TABLE businesses 
    ADD COLUMN IF NOT EXISTS payment_method_exp_month INTEGER;

ALTER TABLE businesses 
    ADD COLUMN IF NOT EXISTS payment_method_exp_year INTEGER;

-- Stripe Customer ID
ALTER TABLE businesses 
    ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

-- =====================================================
-- 5. ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Habilitar RLS nas novas tabelas
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_invoices ENABLE ROW LEVEL SECURITY;

-- subscription_plans: Tabela pública (todos podem ver os planos)
DROP POLICY IF EXISTS "Anyone can view plans" ON subscription_plans;
CREATE POLICY "Anyone can view plans" 
    ON subscription_plans FOR SELECT 
    USING (true);

-- admin_activity_logs: Usuário só vê logs do próprio negócio
DROP POLICY IF EXISTS "Users can view own activity logs" ON admin_activity_logs;
CREATE POLICY "Users can view own activity logs"
    ON admin_activity_logs FOR SELECT
    USING (business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert own activity logs" ON admin_activity_logs;
CREATE POLICY "Users can insert own activity logs"
    ON admin_activity_logs FOR INSERT
    WITH CHECK (business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid()));

-- subscription_invoices: Usuário só vê faturas do próprio negócio
DROP POLICY IF EXISTS "Users can view own invoices" ON subscription_invoices;
CREATE POLICY "Users can view own invoices"
    ON subscription_invoices FOR SELECT
    USING (business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid()));

-- =====================================================
-- 6. FUNÇÃO PARA REGISTRAR ATIVIDADE
-- =====================================================

CREATE OR REPLACE FUNCTION log_admin_activity(
    p_business_id UUID,
    p_action TEXT,
    p_log_type TEXT DEFAULT 'profile',
    p_device TEXT DEFAULT NULL,
    p_ip_address TEXT DEFAULT NULL,
    p_details JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    log_id UUID;
BEGIN
    INSERT INTO admin_activity_logs (business_id, user_id, action, log_type, device, ip_address, details)
    VALUES (p_business_id, auth.uid(), p_action, p_log_type, p_device, p_ip_address, p_details)
    RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 7. TRIGGER PARA LOG DE LOGIN
-- =====================================================

-- Nota: Logs de login são registrados via Edge Function ou cliente
-- Esta função pode ser chamada pelo cliente após login bem-sucedido

-- =====================================================
-- 8. ATUALIZAR NEGÓCIOS EXISTENTES
-- =====================================================

-- Definir trial_ends_at para negócios que ainda não têm (30 dias a partir de agora)
UPDATE businesses 
SET trial_ends_at = NOW() + INTERVAL '30 days',
    subscription_plan_id = COALESCE(subscription_plan_id, 'pro'),
    subscription_status = COALESCE(subscription_status, 'trial')
WHERE trial_ends_at IS NULL;

-- =====================================================
-- VERIFICAÇÃO
-- =====================================================

SELECT 'Migration completed successfully!' as status;
