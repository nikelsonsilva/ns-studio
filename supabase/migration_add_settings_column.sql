-- Migration: Add settings column to businesses table
-- This column stores module configurations and other app settings

ALTER TABLE businesses 
ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}';

-- Add comment
COMMENT ON COLUMN businesses.settings IS 'JSON object storing module configurations and app settings';

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_businesses_settings ON businesses USING GIN (settings);
