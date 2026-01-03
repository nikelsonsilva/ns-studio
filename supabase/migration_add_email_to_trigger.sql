-- Migration: Add email to handle_new_user trigger
-- This updates the trigger to capture email when creating new businesses

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.businesses (owner_id, business_name, business_type, email)
    VALUES (
        NEW.id,
        NEW.raw_user_meta_data->>'business_name',
        NEW.raw_user_meta_data->>'business_type',
        NEW.email
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
