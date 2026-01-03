-- =====================================================
-- Migration: Public Access for Appointment Confirmation
-- =====================================================
-- This migration adds RLS policies to allow public access
-- to appointments for the confirmation page
-- =====================================================

-- Enable RLS on appointments if not already enabled
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- Policy: Allow anyone to SELECT appointments by ID (for confirmation page)
-- This allows the /confirmacao/{id} page to load appointment details
DROP POLICY IF EXISTS "Allow public to view appointments by id" ON appointments;
CREATE POLICY "Allow public to view appointments by id" ON appointments
    FOR SELECT
    USING (true);

-- Policy: Allow anyone to UPDATE appointment status (for confirmation page)
-- This allows the confirmation page to update status to confirmed/paid
DROP POLICY IF EXISTS "Allow public to update appointment status" ON appointments;
CREATE POLICY "Allow public to update appointment status" ON appointments
    FOR UPDATE
    USING (true)
    WITH CHECK (true);

-- Policy: Allow anyone to INSERT appointments (for public booking)
DROP POLICY IF EXISTS "Allow public to insert appointments" ON appointments;
CREATE POLICY "Allow public to insert appointments" ON appointments
    FOR INSERT
    WITH CHECK (true);

-- =====================================================
-- INSTRUCTIONS:
-- Run this SQL in your Supabase SQL Editor to fix the
-- "Agendamento não encontrado" error on the confirmation page
-- =====================================================

-- =====================================================
-- Time Blocks RLS Policies
-- =====================================================
ALTER TABLE time_blocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all to manage time_blocks" ON time_blocks;
CREATE POLICY "Allow all to manage time_blocks" ON time_blocks
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- =====================================================
-- Services, Professionals, Businesses RLS Policies
-- (Needed for JOIN queries on confirmation page)
-- =====================================================
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public to view services" ON services;
CREATE POLICY "Allow public to view services" ON services
    FOR SELECT
    USING (true);

ALTER TABLE professionals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public to view professionals" ON professionals;
CREATE POLICY "Allow public to view professionals" ON professionals
    FOR SELECT
    USING (true);

ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public to view businesses" ON businesses;
CREATE POLICY "Allow public to view businesses" ON businesses
    FOR SELECT
    USING (true);

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all to manage clients" ON clients;
CREATE POLICY "Allow all to manage clients" ON clients
    FOR ALL
    USING (true)
    WITH CHECK (true);
