/*
  # Add Phone Fields to Users Table
  
  ## Overview
  Add phone number fields to support international phone numbers with SMS capabilities.
  
  ## Changes
  
  1. **New Columns in users table**
     - `sms_country_iso` - Two-letter ISO country code (e.g., US, GB, CA)
     - `sms_country_code` - International dialing code (e.g., +1, +44)
     - `sms_phone_national` - National phone number format
     - `sms_phone_e164` - E.164 international format (full number with country code)
     - `sms_can_send` - Boolean flag indicating if SMS can be sent (true only for US)
  
  ## Security
  - No RLS changes needed as users table already has proper RLS policies
*/

-- Add phone fields to users table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'sms_country_iso'
  ) THEN
    ALTER TABLE users ADD COLUMN sms_country_iso text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'sms_country_code'
  ) THEN
    ALTER TABLE users ADD COLUMN sms_country_code text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'sms_phone_national'
  ) THEN
    ALTER TABLE users ADD COLUMN sms_phone_national text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'sms_phone_e164'
  ) THEN
    ALTER TABLE users ADD COLUMN sms_phone_e164 text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'sms_can_send'
  ) THEN
    ALTER TABLE users ADD COLUMN sms_can_send boolean DEFAULT false;
  END IF;
END $$;
