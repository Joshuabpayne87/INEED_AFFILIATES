/*
  # Add Extended Business Profile Fields
  
  ## Overview
  This migration adds all the remaining fields required for a complete business profile,
  including business address, contact information, financial metrics, and user details.
  
  ## Changes
  
  ### 1. New Columns in businesses table
  **Business Address (Not visible to public)**
  - `business_street_address` - Street address of the business
  - `business_city` - City
  - `business_state` - State/Province
  - `business_zipcode` - Postal/Zip code
  
  **Contact Information (Not visible to public initially)**
  - `business_phone` - Main business phone number
  - `linkedin_url` - LinkedIn profile/page URL
  - `twitter_url` - Twitter/X profile URL
  - `facebook_url` - Facebook page URL
  - `instagram_url` - Instagram profile URL
  
  **Business Metrics**
  - `years_in_business` - How many years the business has been operating
  - `payment_methods` - Array of accepted payment methods
  - `detailed_services` - Detailed description of services/products offered
  - `average_sale_size` - Typical transaction/sale amount
  - `approximate_annual_revenue` - Private field for understanding userbase
  
  ### 2. New Columns in users table
  - `title` - User's job title/position at the company
  - `residential_zipcode` - Private field for location-based partner matching
  - `headshot_url` - Professional headshot photo URL
  
  ## Privacy Notes
  - `approximate_annual_revenue` is PRIVATE (not visible to other users)
  - `residential_zipcode` is PRIVATE (used only for radius-based networking)
  - Business address fields are NOT publicly visible
  - Social media URLs are NOT publicly visible initially
  
  ## Security
  - All fields are nullable to allow gradual completion
  - Existing RLS policies apply to new fields
  - No new policies needed as access control remains the same
*/

-- Add fields to businesses table
DO $$
BEGIN
  -- Business address fields
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'business_street_address'
  ) THEN
    ALTER TABLE businesses ADD COLUMN business_street_address text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'business_city'
  ) THEN
    ALTER TABLE businesses ADD COLUMN business_city text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'business_state'
  ) THEN
    ALTER TABLE businesses ADD COLUMN business_state text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'business_zipcode'
  ) THEN
    ALTER TABLE businesses ADD COLUMN business_zipcode text;
  END IF;

  -- Contact information
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'business_phone'
  ) THEN
    ALTER TABLE businesses ADD COLUMN business_phone text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'linkedin_url'
  ) THEN
    ALTER TABLE businesses ADD COLUMN linkedin_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'twitter_url'
  ) THEN
    ALTER TABLE businesses ADD COLUMN twitter_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'facebook_url'
  ) THEN
    ALTER TABLE businesses ADD COLUMN facebook_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'instagram_url'
  ) THEN
    ALTER TABLE businesses ADD COLUMN instagram_url text;
  END IF;

  -- Business metrics
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'years_in_business'
  ) THEN
    ALTER TABLE businesses ADD COLUMN years_in_business integer;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'payment_methods'
  ) THEN
    ALTER TABLE businesses ADD COLUMN payment_methods text[];
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'detailed_services'
  ) THEN
    ALTER TABLE businesses ADD COLUMN detailed_services text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'average_sale_size'
  ) THEN
    ALTER TABLE businesses ADD COLUMN average_sale_size text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'approximate_annual_revenue'
  ) THEN
    ALTER TABLE businesses ADD COLUMN approximate_annual_revenue text;
  END IF;
END $$;

-- Add fields to users table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'title'
  ) THEN
    ALTER TABLE users ADD COLUMN title text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'residential_zipcode'
  ) THEN
    ALTER TABLE users ADD COLUMN residential_zipcode text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'headshot_url'
  ) THEN
    ALTER TABLE users ADD COLUMN headshot_url text;
  END IF;
END $$;