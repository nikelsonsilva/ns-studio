-- =====================================================
-- Migration: Add source field to clients table
-- Purpose: Track client origin (manual, public_link, whatsapp, api)
-- =====================================================

-- Add source column to clients table
ALTER TABLE clients ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';

-- Valid values: 'manual' (balcão), 'public_link', 'whatsapp', 'api'
COMMENT ON COLUMN clients.source IS 'Origin: manual (balcão), public_link, whatsapp, api';

-- Update existing clients to have 'manual' as default source
UPDATE clients SET source = 'manual' WHERE source IS NULL;
