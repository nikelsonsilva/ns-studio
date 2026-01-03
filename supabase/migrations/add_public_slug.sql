-- =====================================================
-- ADD PUBLIC SLUG TO BUSINESSES
-- Run this migration to add custom URL slugs
-- =====================================================

-- Add public_slug column (unique, nullable until user configures it)
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS public_slug TEXT UNIQUE;

-- Create index for fast lookup by slug
CREATE INDEX IF NOT EXISTS idx_businesses_public_slug ON businesses(public_slug);

-- Add constraint to ensure slug format (lowercase, numbers, hyphens only)
-- This is enforced at application level, but good to have as reference
COMMENT ON COLUMN businesses.public_slug IS 'URL-friendly identifier for public booking pages. Format: lowercase, numbers, hyphens only. Example: ns-studio';
