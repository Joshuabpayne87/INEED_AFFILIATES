/*
  # Fix Profile Field Data Types

  ## Overview
  This migration fixes data type mismatches between the application and database schema
  that were causing profile save failures.

  ## Changes Made

  1. **Convert integer columns to text**
     - Changes `email_list_size` from integer to text
     - Changes `social_following_size` from integer to text
     - These fields are displayed as free-form text in the UI (e.g., "10,000+ subscribers")
     - Converting to text allows more flexible input like ranges and approximations

  ## Data Preservation
  - All existing integer values are automatically converted to text
  - No data loss occurs during conversion
  - Empty/null values remain unchanged

  ## Affected Tables
  - businesses table

  ## Security
  - RLS policies remain unchanged
  - No new security considerations
*/

-- Convert email_list_size from integer to text
ALTER TABLE businesses 
  ALTER COLUMN email_list_size TYPE text 
  USING CASE 
    WHEN email_list_size IS NULL THEN NULL 
    ELSE email_list_size::text 
  END;

-- Convert social_following_size from integer to text
ALTER TABLE businesses 
  ALTER COLUMN social_following_size TYPE text 
  USING CASE 
    WHEN social_following_size IS NULL THEN NULL 
    ELSE social_following_size::text 
  END;

-- Add comments to document the field types
COMMENT ON COLUMN businesses.email_list_size IS 'Text field for email list size. Allows flexible input like "10,000+ subscribers" or ranges.';
COMMENT ON COLUMN businesses.social_following_size IS 'Text field for social following size. Allows flexible input like "50K across platforms" or ranges.';