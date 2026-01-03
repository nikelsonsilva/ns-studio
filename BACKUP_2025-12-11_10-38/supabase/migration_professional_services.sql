-- Migration: Professional Services Association
-- This table links professionals to the services they can perform

-- Create the professional_services junction table
CREATE TABLE IF NOT EXISTS professional_services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    professional_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(professional_id, service_id)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_professional_services_professional_id ON professional_services(professional_id);
CREATE INDEX IF NOT EXISTS idx_professional_services_service_id ON professional_services(service_id);
CREATE INDEX IF NOT EXISTS idx_professional_services_business_id ON professional_services(business_id);

-- Enable RLS
ALTER TABLE professional_services ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read professional_services (needed for public booking)
CREATE POLICY "Allow public read access to professional_services"
ON professional_services FOR SELECT
USING (true);

-- Policy: Business owners can manage their professional_services
CREATE POLICY "Business owners can manage professional_services"
ON professional_services FOR ALL
USING (
    business_id IN (
        SELECT id FROM businesses WHERE user_id = auth.uid()
    )
);

-- Comment
COMMENT ON TABLE professional_services IS 'Links professionals to services they can perform';
