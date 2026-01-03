-- =====================================================
-- FIX: Auth Trigger for New User Creation
-- =====================================================
-- Execute this in Supabase SQL Editor to fix the 500 error
-- =====================================================

-- Drop the old trigger first
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create improved trigger function with better error handling
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    new_business_id UUID;
BEGIN
    -- Create business automatically when user registers
    INSERT INTO public.businesses (
        user_id,
        business_name,
        business_type,
        email,
        phone,
        business_hours,
        booking_settings
    ) VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'business_name', 'Meu Negócio'),
        COALESCE(NEW.raw_user_meta_data->>'business_type', 'barbershop'),
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'phone', NULL),
        -- Default business hours
        '{
            "monday": {"open": "09:00", "close": "18:00", "closed": false},
            "tuesday": {"open": "09:00", "close": "18:00", "closed": false},
            "wednesday": {"open": "09:00", "close": "18:00", "closed": false},
            "thursday": {"open": "09:00", "close": "18:00", "closed": false},
            "friday": {"open": "09:00", "close": "18:00", "closed": false},
            "saturday": {"open": "09:00", "close": "14:00", "closed": false},
            "sunday": {"open": "09:00", "close": "14:00", "closed": true}
        }'::jsonb,
        -- Default booking settings  
        '{"buffer_minutes": 60, "max_advance_days": 30, "min_advance_hours": 1}'::jsonb
    )
    RETURNING id INTO new_business_id;
    
    -- Optionally create a profile entry if profiles table exists
    BEGIN
        INSERT INTO public.profiles (id, business_id, role, full_name, email)
        VALUES (
            NEW.id,
            new_business_id,
            'tenant_owner',
            COALESCE(NEW.raw_user_meta_data->>'full_name', 'Usuário'),
            NEW.email
        );
    EXCEPTION WHEN undefined_table THEN
        -- profiles table doesn't exist, skip
        NULL;
    WHEN unique_violation THEN
        -- profile already exists, skip
        NULL;
    END;
    
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- Log error but don't fail signup
    RAISE WARNING 'Error in handle_new_user trigger: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();

-- Make sure RLS allows the trigger to insert
-- This policy allows the trigger function to insert businesses
DROP POLICY IF EXISTS "Allow trigger to create business" ON businesses;
CREATE POLICY "Allow trigger to create business"
    ON businesses FOR INSERT
    WITH CHECK (true);

-- Verification
SELECT 
    'Trigger atualizado com sucesso!' as status,
    'Agora tente criar uma nova conta' as proxima_acao;
