/*
  # Add Commission Details to Offers Table

  This migration adds detailed commission tracking fields to the offers table.

  ## Changes
  
  1. New Columns Added to `offers` table:
    - `commission_type` (text) - Specifies if commission is "one-time" or "recurring"
    - `commission_duration` (text) - Duration of commission: "one-time", "1-year", or "lifetime"
    - `offer_notes` (text) - Additional notes about the offer
  
  2. Purpose:
    - Allows offer creators to specify commission structure details
    - Helps partners understand payment terms before promoting
    - Provides additional context through notes field
    
  3. Notes:
    - All fields are nullable to maintain compatibility with existing offers
    - No default values set to allow users to explicitly choose options
*/

-- Add commission type field (one-time or recurring)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'offers' AND column_name = 'commission_type'
  ) THEN
    ALTER TABLE offers ADD COLUMN commission_type text;
  END IF;
END $$;

-- Add commission duration field (one-time, 1-year, or lifetime)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'offers' AND column_name = 'commission_duration'
  ) THEN
    ALTER TABLE offers ADD COLUMN commission_duration text;
  END IF;
END $$;

-- Add offer notes field
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'offers' AND column_name = 'offer_notes'
  ) THEN
    ALTER TABLE offers ADD COLUMN offer_notes text;
  END IF;
END $$;
