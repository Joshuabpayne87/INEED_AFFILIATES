/*
  # Fix Security Issues
  
  1. Performance & Security Improvements
    - Remove unused indexes that slow down write operations without providing read benefits
    - Secure function search path to prevent SQL injection vulnerabilities
  
  2. Indexes Removed
    - `idx_call_click_logs_clicked_by_user_id` - unused
    - `idx_call_click_logs_connection_id` - unused
    - `idx_calls_connection_id` - unused
    - `idx_calls_user_id` - unused
    - `idx_connection_notes_connection_id` - unused
    - `idx_connection_notes_user_id` - unused
    - `idx_crm_cards_partner_business_id_fk` - unused
    - `idx_messages_connection_id` - unused
    - `idx_messages_recipient_id` - unused
    - `idx_messages_sender_id` - unused
    - `idx_notifications_user_id` - unused
    - `idx_offers_business_id` - unused
    - `idx_partner_tasks_connection_id` - unused
    - `idx_user_offers_offer_id` - unused
  
  3. Function Security
    - Set immutable search_path on handle_new_user function to prevent search path manipulation attacks
  
  4. Password Protection
    - Note: Leaked password protection must be enabled in Supabase Dashboard
    - Navigate to: Authentication → Policies → Enable "Check for compromised passwords"
*/

-- Drop unused indexes to improve write performance
DROP INDEX IF EXISTS idx_call_click_logs_clicked_by_user_id;
DROP INDEX IF EXISTS idx_call_click_logs_connection_id;
DROP INDEX IF EXISTS idx_calls_connection_id;
DROP INDEX IF EXISTS idx_calls_user_id;
DROP INDEX IF EXISTS idx_connection_notes_connection_id;
DROP INDEX IF EXISTS idx_connection_notes_user_id;
DROP INDEX IF EXISTS idx_crm_cards_partner_business_id_fk;
DROP INDEX IF EXISTS idx_messages_connection_id;
DROP INDEX IF EXISTS idx_messages_recipient_id;
DROP INDEX IF EXISTS idx_messages_sender_id;
DROP INDEX IF EXISTS idx_notifications_user_id;
DROP INDEX IF EXISTS idx_offers_business_id;
DROP INDEX IF EXISTS idx_partner_tasks_connection_id;
DROP INDEX IF EXISTS idx_user_offers_offer_id;

-- Recreate handle_new_user function with secure search_path
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert new user record
  INSERT INTO public.users (id, email, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', '')
  );
  
  RETURN NEW;
END;
$$;