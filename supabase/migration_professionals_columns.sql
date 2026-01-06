-- Migration to add missing columns to professionals table
-- Run this in Supabase SQL Editor

-- Add CPF column
ALTER TABLE professionals ADD COLUMN IF NOT EXISTS cpf VARCHAR(14);

-- Add birth_date column
ALTER TABLE professionals ADD COLUMN IF NOT EXISTS birth_date DATE;

-- Add avatar column (for photo URL)
ALTER TABLE professionals ADD COLUMN IF NOT EXISTS avatar TEXT;

-- Add rating column
ALTER TABLE professionals ADD COLUMN IF NOT EXISTS rating DECIMAL(3,2) DEFAULT 5.00;

-- Add buffer_minutes column
ALTER TABLE professionals ADD COLUMN IF NOT EXISTS buffer_minutes INTEGER DEFAULT 15;

-- Add custom_buffer column
ALTER TABLE professionals ADD COLUMN IF NOT EXISTS custom_buffer BOOLEAN DEFAULT false;

-- Add monthly_goal column
ALTER TABLE professionals ADD COLUMN IF NOT EXISTS monthly_goal DECIMAL(10,2) DEFAULT 5000.00;

-- Add commission_rate column
ALTER TABLE professionals ADD COLUMN IF NOT EXISTS commission_rate INTEGER DEFAULT 50;

-- After running this migration, uncomment the cpf and birth_date lines in Team.tsx handleSaveBarber
