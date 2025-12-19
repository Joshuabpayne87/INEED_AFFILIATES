/*
  # Fix CRM trigger function column references

  ## Summary
  This migration fixes the trigger functions that create and update CRM cards when connections
  are made. The functions were referencing incorrect column names causing the connection
  requests to fail.

  ## Changes
  1. Bug Fixes
    - Fix `create_crm_card_on_connection` to use correct column names:
      - `owner_user_id` instead of `user_id` (businesses table)
      - `requester_user_id` instead of `requester_id` (connections table)
      - `recipient_user_id` instead of `recipient_id` (connections table)
    - Fix `update_crm_card_on_connection_accept` to use correct column names:
      - `requester_user_id` instead of `requester_id`
      - `recipient_user_id` instead of `recipient_id`
*/

-- Drop and recreate the trigger function with correct column names
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
  -- Get business IDs for both users (using owner_user_id, not user_id)
  SELECT b.id INTO requester_business_id
  FROM businesses b
  WHERE b.owner_user_id = NEW.requester_user_id;

  SELECT b.id INTO recipient_business_id
  FROM businesses b
  WHERE b.owner_user_id = NEW.recipient_user_id;

  -- Create CRM card for requester
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
      'contacted',
      b.business_name,
      u.first_name || ' ' || u.last_name
    FROM users u
    JOIN businesses b ON b.owner_user_id = u.id
    WHERE u.id = NEW.recipient_user_id;

    -- Create CRM card for recipient
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
      'new',
      b.business_name,
      u.first_name || ' ' || u.last_name
    FROM users u
    JOIN businesses b ON b.owner_user_id = u.id
    WHERE u.id = NEW.requester_user_id;
  END IF;

  RETURN NEW;
END;
$$;

-- Drop and recreate the update trigger function with correct column names
DROP FUNCTION IF EXISTS update_crm_card_on_connection_accept() CASCADE;

CREATE OR REPLACE FUNCTION update_crm_card_on_connection_accept()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only update when status changes to 'accepted'
  IF NEW.status = 'accepted' AND (OLD.status IS NULL OR OLD.status != 'accepted') THEN
    -- Update CRM card for requester (move to qualified)
    UPDATE crm_cards
    SET stage = 'qualified'
    WHERE connection_id = NEW.id
      AND user_id = NEW.requester_user_id;

    -- Update CRM card for recipient (move to qualified)
    UPDATE crm_cards
    SET stage = 'qualified'
    WHERE connection_id = NEW.id
      AND user_id = NEW.recipient_user_id;
  END IF;

  RETURN NEW;
END;
$$;

-- Recreate the triggers
CREATE TRIGGER create_crm_card_on_connection_trigger
  AFTER INSERT ON connections
  FOR EACH ROW
  EXECUTE FUNCTION create_crm_card_on_connection();

CREATE TRIGGER update_crm_card_on_connection_accept_trigger
  AFTER UPDATE ON connections
  FOR EACH ROW
  EXECUTE FUNCTION update_crm_card_on_connection_accept();
