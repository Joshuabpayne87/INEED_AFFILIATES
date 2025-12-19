/*
  # Add Complete Business Profile Fields
  
  ## Overview
  This migration adds all the fields required by the OnboardingWizard and BusinessProfile type
  to support the complete business profile functionality.
  
  ## Changes
  1. Add all missing profile fields to businesses table:
     - Core info: company_name, email, website, description, tagline, video_url
     - Founder info: founder_name, founder_bio, founder_background, founder_why_started, founder_headshot_url
     - Partnership info: partnership_type, commission_rate, requirements, monetization_type, cross_promotion_preference
     - Business details: main_offer_type, problem_solved, unique_value
     - Metrics: social_audience_size, email_open_rate, number_of_offers
     - Arrays: partnership_opportunities, looking_for, primary_offers
     - Display: logo_url, featured
  
  ## Notes
  - All new fields are nullable to allow gradual profile completion
  - Existing data is preserved
  - RLS policies remain unchanged
*/

-- Add core business info fields
DO $$
BEGIN
  -- Company name (replacing business_name)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'company_name'
  ) THEN
    ALTER TABLE businesses ADD COLUMN company_name text;
  END IF;

  -- Email
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'email'
  ) THEN
    ALTER TABLE businesses ADD COLUMN email text;
  END IF;

  -- Website (different from website_url)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'website'
  ) THEN
    ALTER TABLE businesses ADD COLUMN website text;
  END IF;

  -- Description
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'description'
  ) THEN
    ALTER TABLE businesses ADD COLUMN description text;
  END IF;

  -- Tagline
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'tagline'
  ) THEN
    ALTER TABLE businesses ADD COLUMN tagline text;
  END IF;

  -- Video URL
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'video_url'
  ) THEN
    ALTER TABLE businesses ADD COLUMN video_url text;
  END IF;

  -- Problem solved
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'problem_solved'
  ) THEN
    ALTER TABLE businesses ADD COLUMN problem_solved text;
  END IF;

  -- Main offer type
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'main_offer_type'
  ) THEN
    ALTER TABLE businesses ADD COLUMN main_offer_type text;
  END IF;

  -- Unique value
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'unique_value'
  ) THEN
    ALTER TABLE businesses ADD COLUMN unique_value text;
  END IF;

  -- Partnership type
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'partnership_type'
  ) THEN
    ALTER TABLE businesses ADD COLUMN partnership_type text;
  END IF;

  -- Commission rate
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'commission_rate'
  ) THEN
    ALTER TABLE businesses ADD COLUMN commission_rate text;
  END IF;

  -- Requirements
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'requirements'
  ) THEN
    ALTER TABLE businesses ADD COLUMN requirements text;
  END IF;

  -- Monetization type
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'monetization_type'
  ) THEN
    ALTER TABLE businesses ADD COLUMN monetization_type text;
  END IF;

  -- Cross promotion preference
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'cross_promotion_preference'
  ) THEN
    ALTER TABLE businesses ADD COLUMN cross_promotion_preference text;
  END IF;

  -- Founder name
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'founder_name'
  ) THEN
    ALTER TABLE businesses ADD COLUMN founder_name text;
  END IF;

  -- Founder bio
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'founder_bio'
  ) THEN
    ALTER TABLE businesses ADD COLUMN founder_bio text;
  END IF;

  -- Founder background
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'founder_background'
  ) THEN
    ALTER TABLE businesses ADD COLUMN founder_background text;
  END IF;

  -- Founder why started
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'founder_why_started'
  ) THEN
    ALTER TABLE businesses ADD COLUMN founder_why_started text;
  END IF;

  -- Founder headshot URL
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'founder_headshot_url'
  ) THEN
    ALTER TABLE businesses ADD COLUMN founder_headshot_url text;
  END IF;

  -- Social audience size
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'social_audience_size'
  ) THEN
    ALTER TABLE businesses ADD COLUMN social_audience_size text;
  END IF;

  -- Email open rate
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'email_open_rate'
  ) THEN
    ALTER TABLE businesses ADD COLUMN email_open_rate text;
  END IF;

  -- Number of offers
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'number_of_offers'
  ) THEN
    ALTER TABLE businesses ADD COLUMN number_of_offers text;
  END IF;

  -- Logo URL
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'logo_url'
  ) THEN
    ALTER TABLE businesses ADD COLUMN logo_url text;
  END IF;

  -- Featured flag
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'featured'
  ) THEN
    ALTER TABLE businesses ADD COLUMN featured boolean DEFAULT false;
  END IF;

  -- Partnership opportunities (array)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'partnership_opportunities'
  ) THEN
    ALTER TABLE businesses ADD COLUMN partnership_opportunities text[];
  END IF;

  -- Looking for (array)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'looking_for'
  ) THEN
    ALTER TABLE businesses ADD COLUMN looking_for text[];
  END IF;

  -- Primary offers (JSONB for structured data)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'primary_offers'
  ) THEN
    ALTER TABLE businesses ADD COLUMN primary_offers jsonb;
  END IF;
END $$;
