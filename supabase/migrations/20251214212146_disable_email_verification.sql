/*
  # Disable Email Verification Requirement

  ## Overview
  This migration disables the email verification requirement by automatically
  setting email_verified_at for all new users.

  ## Changes
  1. Update existing users to set email_verified_at if not already set
  2. Modify the user creation trigger to automatically set email_verified_at

  ## Important Notes
  - Existing users without email_verified_at will be marked as verified
  - New users will be automatically verified upon account creation
  - This effectively disables email verification for the application
*/

-- Set email_verified_at for all existing users who don't have it
UPDATE public.users
SET email_verified_at = COALESCE(created_at, now())
WHERE email_verified_at IS NULL;

-- Update the trigger function to auto-verify emails on user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (
    id,
    email,
    first_name,
    last_name,
    created_at,
    updated_at,
    email_verified_at
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    NEW.created_at,
    NEW.updated_at,
    now()
  );
  RETURN NEW;
END;
$$;
