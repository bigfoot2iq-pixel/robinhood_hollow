-- Add slug column to raffles table for URL-friendly access
-- Run this in Supabase SQL Editor

-- Add slug column (nullable first to allow existing data to be migrated)
ALTER TABLE hollow_raffles_raffles ADD COLUMN slug VARCHAR(255) UNIQUE;

-- Create a function to generate slug from title
CREATE OR REPLACE FUNCTION generate_raffle_slug(title TEXT)
RETURNS TEXT AS $$
BEGIN
  -- Convert to lowercase, replace spaces with underscores, remove special characters
  RETURN lower(
    regexp_replace(
      regexp_replace(title, '[^a-zA-Z0-9\s]', '', 'g'),
      '\s+',
      '_',
      'g'
    )
  );
END;
$$ LANGUAGE plpgsql;

-- Update existing raffles with generated slugs
UPDATE hollow_raffles_raffles
SET slug = generate_raffle_slug(title)
WHERE slug IS NULL;

-- Make slug NOT NULL after populating existing data
ALTER TABLE hollow_raffles_raffles ALTER COLUMN slug SET NOT NULL;

-- Create index for slug lookups
CREATE INDEX idx_raffles_slug ON hollow_raffles_raffles(slug);

-- Create a trigger to auto-generate slug on insert if not provided
CREATE OR REPLACE FUNCTION set_raffle_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug = generate_raffle_slug(COALESCE(NEW.title, NEW.id::TEXT));
  ELSE
    -- Ensure provided slug is properly formatted
    NEW.slug = lower(
      regexp_replace(
        regexp_replace(NEW.slug, '[^a-zA-Z0-9\s]', '', 'g'),
        '\s+',
        '_',
        'g'
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_raffle_slug ON hollow_raffles_raffles;
CREATE TRIGGER trigger_set_raffle_slug
  BEFORE INSERT ON hollow_raffles_raffles
  FOR EACH ROW
  EXECUTE FUNCTION set_raffle_slug();