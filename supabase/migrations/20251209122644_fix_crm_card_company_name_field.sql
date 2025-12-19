/*
  # Fix CRM Card Company Name Field

  ## Summary
  Updates the CRM trigger function to use the correct company_name field from
  the businesses table instead of business_name.

  ## Changes
  1. Bug Fixes
    - Update trigger function to pull from businesses.company_name (not business_name)
    - Update existing CRM cards with correct company names from businesses table
*/

-- Drop and recreate the trigger function with correct field
DROP FUNCTION IF EXISTS create_crm_card_on_connection() CASCADE;

CREATE OR REPLACE FUNCTION create_crm_card_on_connection()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  requester_business_id uuid;
  recipient_business_id uuid;
BEGIN
  -- Get business IDs for both users
  SELECT b.id INTO requester_business_id
  FROM businesses b
  WHERE b.owner_user_id = NEW.requester_user_id;

  SELECT b.id INTO recipient_business_id
  FROM businesses b
  WHERE b.owner_user_id = NEW.recipient_user_id;

  -- Create CRM card for requester (they sent the request)
  IF requester_business_id IS NOT NULL AND recipient_business_id IS NOT NULL THEN
    INSERT INTO crm_cards (
      user_id,
      partner_user_id,
      partner_business_id,
      connection_id,
      stage,
      company_name,
      partner_name
    )
    SELECT
      NEW.requester_user_id,
      NEW.recipient_user_id,
      recipient_business_id,
      NEW.id,
      'Connection Pending',
      COALESCE(b.company_name, b.business_name, ''),
      u.first_name || ' ' || u.last_name
    FROM users u
    JOIN businesses b ON b.owner_user_id = u.id
    WHERE u.id = NEW.recipient_user_id;

    -- Create CRM card for recipient (they received the request)
    INSERT INTO crm_cards (
      user_id,
      partner_user_id,
      partner_business_id,
      connection_id,
      stage,
      company_name,
      partner_name
    )
    SELECT
      NEW.recipient_user_id,
      NEW.requester_user_id,
      requester_business_id,
      NEW.id,
      'Connection Pending',
      COALESCE(b.company_name, b.business_name, ''),
      u.first_name || ' ' || u.last_name
    FROM users u
    JOIN businesses b ON b.owner_user_id = u.id
    WHERE u.id = NEW.requester_user_id;
  END IF;

  RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER create_crm_card_on_connection_trigger
  AFTER INSERT ON connections
  FOR EACH ROW
  EXECUTE FUNCTION create_crm_card_on_connection();

-- Update existing CRM cards with correct company names
UPDATE crm_cards cc
SET company_name = COALESCE(b.company_name, b.business_name, '')
FROM businesses b
WHERE b.owner_user_id = cc.partner_user_id
  AND (cc.company_name = '' OR cc.company_name IS NULL);
