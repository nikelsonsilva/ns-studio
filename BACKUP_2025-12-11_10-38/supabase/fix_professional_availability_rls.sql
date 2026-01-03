-- =====================================================
-- FIX: RLS Policy for professional_availability
-- =====================================================
-- Execute this in Supabase SQL Editor
-- =====================================================

-- Enable RLS on the table (if not already enabled)
ALTER TABLE professional_availability ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (to avoid duplicates)
DROP POLICY IF EXISTS "Users can view professional_availability for their business" ON professional_availability;
DROP POLICY IF EXISTS "Users can insert professional_availability for their business" ON professional_availability;
DROP POLICY IF EXISTS "Users can update professional_availability for their business" ON professional_availability;
DROP POLICY IF EXISTS "Users can delete professional_availability for their business" ON professional_availability;

-- SELECT policy
CREATE POLICY "Users can view professional_availability for their business"
ON professional_availability FOR SELECT
USING (
    professional_id IN (
        SELECT id FROM professionals WHERE business_id IN (
            SELECT id FROM businesses WHERE user_id = auth.uid()
        )
    )
);

-- INSERT policy
CREATE POLICY "Users can insert professional_availability for their business"
ON professional_availability FOR INSERT
WITH CHECK (
    professional_id IN (
        SELECT id FROM professionals WHERE business_id IN (
            SELECT id FROM businesses WHERE user_id = auth.uid()
        )
    )
);

-- UPDATE policy
CREATE POLICY "Users can update professional_availability for their business"
ON professional_availability FOR UPDATE
USING (
    professional_id IN (
        SELECT id FROM professionals WHERE business_id IN (
            SELECT id FROM businesses WHERE user_id = auth.uid()
        )
    )
);

-- DELETE policy
CREATE POLICY "Users can delete professional_availability for their business"
ON professional_availability FOR DELETE
USING (
    professional_id IN (
        SELECT id FROM professionals WHERE business_id IN (
            SELECT id FROM businesses WHERE user_id = auth.uid()
        )
    )
);

-- Verify policies
SELECT * FROM pg_policies WHERE tablename = 'professional_availability';
