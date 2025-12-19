/*
  # Fix Referral Code Generation Function Security

  ## Changes
  - Update `generate_referral_code()` function with proper security settings
  - Add SECURITY DEFINER to allow execution from trigger context
  - Set immutable search_path to prevent security issues

  ## Security
  - Function marked as SECURITY DEFINER with restricted search_path
  - Ensures function can be called from handle_new_user trigger
*/

-- Drop and recreate the generate_referral_code function with proper security
DROP FUNCTION IF EXISTS public.generate_referral_code();

CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS text 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := '';
  i integer;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;
