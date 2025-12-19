/*
  # Add profile state and calendar link to businesses

  1. Changes
    - Add `profile_state` column (draft/live) to businesses table
    - Add `calendar_link` column for private scheduling links
    - Add `contact_name` column for private contact details
    - Update existing businesses to have 'draft' state by default
  
  2. Security
    - Maintain existing RLS policies
    - Calendar link and contact_name are stored but not exposed publicly
*/

-- Add new columns to businesses table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'profile_state'
  ) THEN
    ALTER TABLE businesses ADD COLUMN profile_state text DEFAULT 'draft' CHECK (profile_state IN ('draft', 'live'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'calendar_link'
  ) THEN
    ALTER TABLE businesses ADD COLUMN calendar_link text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'contact_name'
  ) THEN
    ALTER TABLE businesses ADD COLUMN contact_name text;
  END IF;
END $$;
