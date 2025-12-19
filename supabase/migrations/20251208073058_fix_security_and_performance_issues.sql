/*
  # Fix Security and Performance Issues

  ## Changes Made

  ### 1. Add Missing Foreign Key Indexes
  Foreign keys without indexes can cause significant performance issues during JOINs and cascading operations.
  
  New indexes added for:
  - `call_click_logs`: clicked_by_user_id, connection_id
  - `calls`: connection_id, user_id
  - `connection_notes`: connection_id, user_id
  - `crm_cards`: partner_business_id
  - `messages`: connection_id, recipient_id, sender_id
  - `notifications`: user_id
  - `offers`: business_id
  - `partner_tasks`: connection_id
  - `user_offers`: offer_id

  ### 2. Optimize RLS Policies
  Updated RLS policies to use subqueries instead of direct auth function calls.
  This prevents re-evaluation of auth.uid() for each row, significantly improving query performance.
  
  Tables updated:
  - `crm_cards`: 4 policies updated
  - `stripe_customers`: 1 policy updated
  - `stripe_subscriptions`: 1 policy updated
  - `stripe_orders`: 1 policy updated

  ### 3. Remove Unused Indexes
  Removed indexes that are not being used to reduce storage overhead and improve write performance.
  
  Indexes removed:
  - idx_businesses_published
  - idx_connections_requester
  - idx_connections_recipient
  - idx_crm_cards_partner_user_id
  - idx_crm_cards_stage
  - idx_crm_cards_connection_id

  ### 4. Fix Function Search Paths
  Added explicit search_path to functions to prevent potential security issues.
  
  Functions updated:
  - update_crm_cards_updated_at
  - create_crm_card_on_connection
  - update_crm_card_on_connection_accept

  ## Important Notes
  - Leaked Password Protection must be enabled through Supabase Dashboard → Authentication → Settings
  - All changes are idempotent and safe to run multiple times
*/

-- =====================================================
-- 1. ADD MISSING FOREIGN KEY INDEXES
-- =====================================================

-- call_click_logs indexes
CREATE INDEX IF NOT EXISTS idx_call_click_logs_clicked_by_user_id 
  ON call_click_logs(clicked_by_user_id);

CREATE INDEX IF NOT EXISTS idx_call_click_logs_connection_id 
  ON call_click_logs(connection_id);

-- calls indexes
CREATE INDEX IF NOT EXISTS idx_calls_connection_id 
  ON calls(connection_id);

CREATE INDEX IF NOT EXISTS idx_calls_user_id 
  ON calls(user_id);

-- connection_notes indexes
CREATE INDEX IF NOT EXISTS idx_connection_notes_connection_id 
  ON connection_notes(connection_id);

CREATE INDEX IF NOT EXISTS idx_connection_notes_user_id 
  ON connection_notes(user_id);

-- crm_cards indexes
CREATE INDEX IF NOT EXISTS idx_crm_cards_partner_business_id_fk 
  ON crm_cards(partner_business_id);

-- messages indexes
CREATE INDEX IF NOT EXISTS idx_messages_connection_id 
  ON messages(connection_id);

CREATE INDEX IF NOT EXISTS idx_messages_recipient_id 
  ON messages(recipient_id);

CREATE INDEX IF NOT EXISTS idx_messages_sender_id 
  ON messages(sender_id);

-- notifications indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id 
  ON notifications(user_id);

-- offers indexes
CREATE INDEX IF NOT EXISTS idx_offers_business_id 
  ON offers(business_id);

-- partner_tasks indexes
CREATE INDEX IF NOT EXISTS idx_partner_tasks_connection_id 
  ON partner_tasks(connection_id);

-- user_offers indexes
CREATE INDEX IF NOT EXISTS idx_user_offers_offer_id 
  ON user_offers(offer_id);

-- =====================================================
-- 2. OPTIMIZE RLS POLICIES (Use Subqueries)
-- =====================================================

-- Drop and recreate crm_cards policies with optimized auth checks
DROP POLICY IF EXISTS "Users can view own CRM cards" ON crm_cards;
CREATE POLICY "Users can view own CRM cards"
  ON crm_cards FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can create own CRM cards" ON crm_cards;
CREATE POLICY "Users can create own CRM cards"
  ON crm_cards FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own CRM cards" ON crm_cards;
CREATE POLICY "Users can update own CRM cards"
  ON crm_cards FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own CRM cards" ON crm_cards;
CREATE POLICY "Users can delete own CRM cards"
  ON crm_cards FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- Optimize stripe_customers policy
DROP POLICY IF EXISTS "Users can view their own customer data" ON stripe_customers;
CREATE POLICY "Users can view their own customer data"
  ON stripe_customers FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()) AND deleted_at IS NULL);

-- Optimize stripe_subscriptions policy
DROP POLICY IF EXISTS "Users can view their own subscription data" ON stripe_subscriptions;
CREATE POLICY "Users can view their own subscription data"
  ON stripe_subscriptions FOR SELECT
  TO authenticated
  USING (
    customer_id IN (
      SELECT customer_id
      FROM stripe_customers
      WHERE user_id = (SELECT auth.uid()) AND deleted_at IS NULL
    )
    AND deleted_at IS NULL
  );

-- Optimize stripe_orders policy
DROP POLICY IF EXISTS "Users can view their own order data" ON stripe_orders;
CREATE POLICY "Users can view their own order data"
  ON stripe_orders FOR SELECT
  TO authenticated
  USING (
    customer_id IN (
      SELECT customer_id
      FROM stripe_customers
      WHERE user_id = (SELECT auth.uid()) AND deleted_at IS NULL
    )
    AND deleted_at IS NULL
  );

-- =====================================================
-- 3. REMOVE UNUSED INDEXES
-- =====================================================

DROP INDEX IF EXISTS idx_businesses_published;
DROP INDEX IF EXISTS idx_connections_requester;
DROP INDEX IF EXISTS idx_connections_recipient;
DROP INDEX IF EXISTS idx_crm_cards_partner_user_id;
DROP INDEX IF EXISTS idx_crm_cards_stage;
DROP INDEX IF EXISTS idx_crm_cards_connection_id;

-- =====================================================
-- 4. FIX FUNCTION SEARCH PATHS
-- =====================================================

-- Recreate update_crm_cards_updated_at with explicit search_path
CREATE OR REPLACE FUNCTION update_crm_cards_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Recreate create_crm_card_on_connection with explicit search_path
CREATE OR REPLACE FUNCTION create_crm_card_on_connection()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  requester_business_id uuid;
  recipient_business_id uuid;
BEGIN
  -- Get business IDs for both users
  SELECT b.id INTO requester_business_id
  FROM businesses b
  WHERE b.user_id = NEW.requester_id;
  
  SELECT b.id INTO recipient_business_id
  FROM businesses b
  WHERE b.user_id = NEW.recipient_id;
  
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
      NEW.requester_id,
      NEW.recipient_id,
      recipient_business_id,
      NEW.id,
      'contacted',
      b.business_name,
      u.first_name || ' ' || u.last_name
    FROM users u
    JOIN businesses b ON b.user_id = u.id
    WHERE u.id = NEW.recipient_id;
    
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
      NEW.recipient_id,
      NEW.requester_id,
      requester_business_id,
      NEW.id,
      'new',
      b.business_name,
      u.first_name || ' ' || u.last_name
    FROM users u
    JOIN businesses b ON b.user_id = u.id
    WHERE u.id = NEW.requester_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Recreate update_crm_card_on_connection_accept with explicit search_path
CREATE OR REPLACE FUNCTION update_crm_card_on_connection_accept()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only update when status changes to 'accepted'
  IF NEW.status = 'accepted' AND (OLD.status IS NULL OR OLD.status != 'accepted') THEN
    -- Update CRM card for requester (move to qualified)
    UPDATE crm_cards
    SET stage = 'qualified'
    WHERE connection_id = NEW.id
      AND user_id = NEW.requester_id;
    
    -- Update CRM card for recipient (move to qualified)
    UPDATE crm_cards
    SET stage = 'qualified'
    WHERE connection_id = NEW.id
      AND user_id = NEW.recipient_id;
  END IF;
  
  RETURN NEW;
END;
$$;
