-- =====================================================
-- PRODUCTION SCHEMA - Multi-Tenant SaaS
-- Barbearias & Salões de Beleza
-- =====================================================
-- EXECUTE ESTE ARQUIVO COMPLETO NO SUPABASE SQL EDITOR
-- =====================================================

-- PASSO 1: LIMPAR TUDO
-- =====================================================

DROP TABLE IF EXISTS appointments CASCADE;
DROP TABLE IF EXISTS financial_records CASCADE;
DROP TABLE IF EXISTS recurring_expenses CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS clients CASCADE;
DROP TABLE IF EXISTS professionals CASCADE;
DROP TABLE IF EXISTS services CASCADE;
DROP TABLE IF EXISTS businesses CASCADE;

DROP FUNCTION IF EXISTS handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- PASSO 2: CRIAR FUNÇÕES AUXILIARES
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- PASSO 3: CRIAR TABELA PRINCIPAL (businesses)
-- =====================================================

CREATE TABLE businesses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Informações do Negócio
    business_name TEXT NOT NULL,
    business_type TEXT NOT NULL CHECK (business_type IN ('barbershop', 'salon')),
    
    -- Contato
    email TEXT NOT NULL,
    phone TEXT,
    address TEXT,
    
    -- Stripe Integration (cada negócio tem sua própria API key)
    stripe_api_key TEXT,
    stripe_account_id TEXT,
    
    -- Configurações
    timezone TEXT DEFAULT 'America/Sao_Paulo',
    currency TEXT DEFAULT 'BRL',
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para performance
CREATE INDEX idx_businesses_user_id ON businesses(user_id);

-- PASSO 4: CRIAR TABELAS DEPENDENTES (Multi-Tenant)
-- =====================================================

-- Serviços
CREATE TABLE services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC(10,2) NOT NULL,
    duration_minutes INTEGER NOT NULL,
    category TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_services_business_id ON services(business_id);
CREATE INDEX idx_services_active ON services(business_id, is_active);

-- Profissionais
CREATE TABLE professionals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    specialty TEXT,
    avatar_url TEXT,
    commission_rate NUMERIC(5,2) DEFAULT 50.00,
    monthly_goal NUMERIC(10,2) DEFAULT 5000.00,
    rating NUMERIC(3,2) DEFAULT 5.00,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_professionals_business_id ON professionals(business_id);

-- Clientes
CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    preferences TEXT,
    tags TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_clients_business_id ON clients(business_id);
CREATE INDEX idx_clients_phone ON clients(business_id, phone);

-- Agendamentos
CREATE TABLE appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    professional_id UUID REFERENCES professionals(id) ON DELETE SET NULL,
    service_id UUID REFERENCES services(id) ON DELETE SET NULL,
    
    -- Data/Hora
    date DATE NOT NULL,
    time TIME NOT NULL,
    
    -- Status
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled', 'no_show')),
    
    -- Pagamento
    payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded')),
    payment_intent_id TEXT, -- Stripe Payment Intent ID
    amount_paid NUMERIC(10,2),
    
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_appointments_business_id ON appointments(business_id);
CREATE INDEX idx_appointments_date ON appointments(business_id, date);
CREATE INDEX idx_appointments_status ON appointments(business_id, status);

-- Produtos
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC(10,2) NOT NULL,
    stock INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_products_business_id ON products(business_id);

-- Registros Financeiros
CREATE TABLE financial_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
    amount NUMERIC(10,2) NOT NULL,
    description TEXT,
    category TEXT,
    date DATE NOT NULL,
    payment_method TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_financial_records_business_id ON financial_records(business_id);
CREATE INDEX idx_financial_records_date ON financial_records(business_id, date);

-- Despesas Recorrentes
CREATE TABLE recurring_expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    amount NUMERIC(10,2) NOT NULL,
    frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly', 'yearly')),
    next_due_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_recurring_expenses_business_id ON recurring_expenses(business_id);

-- PASSO 5: CONFIGURAR RLS (Row Level Security)
-- =====================================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE professionals ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_expenses ENABLE ROW LEVEL SECURITY;

-- Policies para businesses
CREATE POLICY "Users can view own business"
    ON businesses FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can update own business"
    ON businesses FOR UPDATE
    USING (user_id = auth.uid());

-- Policies para services
CREATE POLICY "Users can view own services"
    ON services FOR SELECT
    USING (business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert own services"
    ON services FOR INSERT
    WITH CHECK (business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid()));

CREATE POLICY "Users can update own services"
    ON services FOR UPDATE
    USING (business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete own services"
    ON services FOR DELETE
    USING (business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid()));

-- Policies para professionals
CREATE POLICY "Users can view own professionals"
    ON professionals FOR SELECT
    USING (business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert own professionals"
    ON professionals FOR INSERT
    WITH CHECK (business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid()));

CREATE POLICY "Users can update own professionals"
    ON professionals FOR UPDATE
    USING (business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete own professionals"
    ON professionals FOR DELETE
    USING (business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid()));

-- Policies para clients
CREATE POLICY "Users can view own clients"
    ON clients FOR SELECT
    USING (business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert own clients"
    ON clients FOR INSERT
    WITH CHECK (business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid()));

CREATE POLICY "Users can update own clients"
    ON clients FOR UPDATE
    USING (business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete own clients"
    ON clients FOR DELETE
    USING (business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid()));

-- Policies para appointments
CREATE POLICY "Users can view own appointments"
    ON appointments FOR SELECT
    USING (business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert own appointments"
    ON appointments FOR INSERT
    WITH CHECK (business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid()));

CREATE POLICY "Users can update own appointments"
    ON appointments FOR UPDATE
    USING (business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete own appointments"
    ON appointments FOR DELETE
    USING (business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid()));

-- Policies para products
CREATE POLICY "Users can view own products"
    ON products FOR SELECT
    USING (business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert own products"
    ON products FOR INSERT
    WITH CHECK (business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid()));

CREATE POLICY "Users can update own products"
    ON products FOR UPDATE
    USING (business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete own products"
    ON products FOR DELETE
    USING (business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid()));

-- Policies para financial_records
CREATE POLICY "Users can view own financial records"
    ON financial_records FOR SELECT
    USING (business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert own financial records"
    ON financial_records FOR INSERT
    WITH CHECK (business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid()));

CREATE POLICY "Users can update own financial records"
    ON financial_records FOR UPDATE
    USING (business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete own financial records"
    ON financial_records FOR DELETE
    USING (business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid()));

-- Policies para recurring_expenses
CREATE POLICY "Users can view own recurring expenses"
    ON recurring_expenses FOR SELECT
    USING (business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert own recurring expenses"
    ON recurring_expenses FOR INSERT
    WITH CHECK (business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid()));

CREATE POLICY "Users can update own recurring expenses"
    ON recurring_expenses FOR UPDATE
    USING (business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete own recurring expenses"
    ON recurring_expenses FOR DELETE
    USING (business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid()));

-- PASSO 6: CRIAR TRIGGER AUTOMÁTICO
-- =====================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Criar business automaticamente quando usuário se registra
    INSERT INTO public.businesses (
        user_id,
        business_name,
        business_type,
        email
    ) VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'business_name', 'Meu Negócio'),
        COALESCE(NEW.raw_user_meta_data->>'business_type', 'barbershop'),
        NEW.email
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger que dispara quando usuário é criado
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();

-- PASSO 7: CRIAR TRIGGERS DE UPDATE
-- =====================================================

CREATE TRIGGER update_businesses_updated_at
    BEFORE UPDATE ON businesses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_services_updated_at
    BEFORE UPDATE ON services
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_professionals_updated_at
    BEFORE UPDATE ON professionals
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clients_updated_at
    BEFORE UPDATE ON clients
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at
    BEFORE UPDATE ON appointments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- PASSO 8: VERIFICAÇÃO FINAL
-- =====================================================

SELECT 
    'Schema criado com sucesso!' as status,
    'Agora faça logout e crie uma nova conta para testar' as proxima_acao;
