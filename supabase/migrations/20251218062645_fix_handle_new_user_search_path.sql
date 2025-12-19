/*
  # Fix handle_new_user Function Search Path

  ## Changes
  - Update `handle_new_user()` trigger function to set proper search_path
  - Ensures the function can locate `generate_referral_code()` and other dependencies
  - Maintains SECURITY DEFINER for proper permission handling

  ## Security
  - Sets immutable search_path to prevent search path manipulation attacks
  - Function executes with definer privileges in restricted schema context
*/

-- Recreate handle_new_user with proper search_path
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_referral_code text;
  referrer_code text;
  referrer_id uuid;
BEGIN
  -- Generate unique referral code
  LOOP
    new_referral_code := generate_referral_code();
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.users WHERE referral_code = new_referral_code);
  END LOOP;

  -- Get referral code from signup metadata
  referrer_code := new.raw_user_meta_data->>'referral_code';

  -- Find referrer if code provided
  IF referrer_code IS NOT NULL AND referrer_code != '' THEN
    SELECT id INTO referrer_id FROM public.users WHERE referral_code = referrer_code;
  END IF;

  -- Insert user with referral data
  INSERT INTO public.users (
    id,
    email,
    first_name,
    last_name,
    role,
    referral_code,
    referred_by_user_id,
    referred_by_code
  )
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'first_name', 'User'),
    COALESCE(new.raw_user_meta_data->>'last_name', 'Account'),
    'user',
    new_referral_code,
    referrer_id,
    referrer_code
  )
  ON CONFLICT (id) DO UPDATE SET
    referral_code = COALESCE(public.users.referral_code, EXCLUDED.referral_code),
    referred_by_user_id = COALESCE(public.users.referred_by_user_id, EXCLUDED.referred_by_user_id),
    referred_by_code = COALESCE(public.users.referred_by_code, EXCLUDED.referred_by_code);

  -- Record conversion if referred
  IF referrer_id IS NOT NULL THEN
    INSERT INTO public.ina_referral_conversions (
      referrer_user_id,
      referred_user_id,
      referral_code
    )
    VALUES (
      referrer_id,
      new.id,
      referrer_code
    )
    ON CONFLICT (referred_user_id) DO NOTHING;
  END IF;
  
  RETURN new;
END;
$$ LANGUAGE plpgsql;
