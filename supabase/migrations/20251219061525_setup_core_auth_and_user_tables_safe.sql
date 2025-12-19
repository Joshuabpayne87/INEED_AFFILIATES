/*
  # Setup Core Auth and User Tables Migration (Safe Version)

  This migration sets up the foundational authentication and user management system.
  Uses conditional logic to avoid conflicts with existing database objects.

  ## 1. New Tables
  
  ### `users` table
  - `id` (uuid, primary key) - References auth.users
  - `first_name`, `last_name` (text) - User name fields
  - `email` (text) - User email
  - `photo_url` (text) - Profile photo URL
  - `role` (text) - User role (default: 'user')
  - `communication_consent` (boolean) - Marketing consent flag
  - `communication_consent_at` (timestamptz) - When consent was given
  - `communication_consent_source` (text) - Source of consent
  - `email_verified_at` (timestamptz) - Email verification timestamp
  - `referral_code` (text, unique) - User's referral code
  - `referred_by_user_id` (uuid) - Reference to referring user
  - `referred_by_code` (text) - Code used when signing up
  - `sms_country_iso`, `sms_country_code`, `sms_phone_national`, `sms_phone_e164` (text) - Phone number fields
  - `sms_can_send` (boolean) - SMS permission flag
  - `created_at` (timestamptz) - Creation timestamp
  
  ### `businesses` table
  - `id` (uuid, primary key)
  - `owner_user_id` (uuid, unique) - References users table
  - `business_name`, `company_name` (text) - Business identification
  - `industry`, `niche`, `target_audience` (text) - Business categorization
  - `website_url`, `website`, `tagline`, `description` (text) - Business details
  - `offer_summary`, `offer_type`, `main_offer_type` (text) - Offer information
  - `monetization_type`, `price_point` (text) - Business model
  - `email_list_size`, `social_following_size` (integer) - Audience metrics
  - `booking_link`, `affiliate_signup_link`, `purchase_affiliate_link` (text) - Action links
  - `is_profile_published` (boolean) - Publication status
  - `collaboration_types`, `looking_for`, `interested_offer_types` (text[]) - Partnership preferences
  - `partnership_type`, `profile_state` (text) - Profile metadata
  - `created_at`, `updated_at` (timestamptz) - Timestamps

  ### `stripe_customers` table
  - `user_id` (uuid, primary key) - References users table
  - `customer_id` (text) - Stripe customer ID
  - `created_at` (timestamptz) - Creation timestamp
  - `deleted_at` (timestamptz) - Soft delete timestamp

  ### `stripe_subscriptions` table
  - `id` (uuid, primary key)
  - `customer_id` (text) - Stripe customer ID
  - `subscription_id` (text) - Stripe subscription ID
  - `status` (text) - Subscription status
  - `created_at` (timestamptz) - Creation timestamp

  ## 2. Security (RLS Policies)
  
  ### users table policies:
  - Users can read their own data
  - Users can update their own data
  - Users can insert their own data
  
  ### businesses table policies:
  - Users can read published profiles or their own profile
  - Users can manage (all operations on) their own business
  
  ### stripe_customers table policies:
  - Users can read their own Stripe customer data
  
  ### stripe_subscriptions table policies:
  - Users can read their own subscriptions

  ## 3. Triggers and Functions
  
  - `handle_new_user()` function - Automatically creates a user record when auth.users is populated
  - `on_auth_user_created` trigger - Executes handle_new_user() after auth user insertion

  ## 4. Indexes
  
  - Index on businesses.owner_user_id for faster lookups

  ## Important Notes
  
  1. All tables have RLS enabled for security
  2. Users table has a 1:1 relationship with auth.users
  3. Each user can have only one business (UNIQUE constraint on owner_user_id)
  4. Trigger automatically creates user records on signup
  5. Stripe integration tables prepared for subscription management
  6. Migration safely handles existing objects without errors
*/

-- 1. Create users table
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name text NOT NULL DEFAULT '',
  last_name text NOT NULL DEFAULT '',
  email text NOT NULL,
  photo_url text,
  role text NOT NULL DEFAULT 'user',
  created_at timestamptz DEFAULT now(),
  communication_consent boolean DEFAULT false,
  communication_consent_at timestamptz,
  communication_consent_source text,
  email_verified_at timestamptz,
  referral_code text UNIQUE,
  referred_by_user_id uuid REFERENCES public.users(id),
  referred_by_code text,
  sms_country_iso text,
  sms_country_code text,
  sms_phone_national text,
  sms_phone_e164 text,
  sms_can_send boolean
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop and recreate users policies to ensure they're correct
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Users can read own data" ON public.users;
  DROP POLICY IF EXISTS "Users can update own data" ON public.users;
  DROP POLICY IF EXISTS "Users can insert own data" ON public.users;
END $$;

CREATE POLICY "Users can read own data" ON public.users FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can update own data" ON public.users FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can insert own data" ON public.users FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- 2. Create businesses table
CREATE TABLE IF NOT EXISTS public.businesses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  business_name text NOT NULL DEFAULT '',
  company_name text,
  industry text NOT NULL DEFAULT '',
  niche text NOT NULL DEFAULT '',
  target_audience text NOT NULL DEFAULT '',
  website_url text,
  website text,
  tagline text,
  description text,
  offer_summary text,
  offer_type text,
  main_offer_type text,
  monetization_type text,
  price_point text,
  email_list_size integer,
  social_following_size integer,
  booking_link text,
  affiliate_signup_link text,
  purchase_affiliate_link text,
  is_profile_published boolean DEFAULT false,
  collaboration_types text[],
  looking_for text[],
  interested_offer_types text[],
  partnership_type text,
  profile_state text DEFAULT 'draft',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(owner_user_id)
);

ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;

-- Drop and recreate businesses policies
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Users can read published profiles" ON public.businesses;
  DROP POLICY IF EXISTS "Users can manage own business" ON public.businesses;
END $$;

CREATE POLICY "Users can read published profiles" ON public.businesses FOR SELECT TO authenticated USING (is_profile_published = true OR owner_user_id = auth.uid());
CREATE POLICY "Users can manage own business" ON public.businesses FOR ALL TO authenticated USING (owner_user_id = auth.uid()) WITH CHECK (owner_user_id = auth.uid());

-- 3. Create stripe tables
CREATE TABLE IF NOT EXISTS public.stripe_customers (
  user_id uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  customer_id text NOT NULL,
  created_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

ALTER TABLE public.stripe_customers ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Users can read own stripe customer" ON public.stripe_customers;
END $$;

CREATE POLICY "Users can read own stripe customer" ON public.stripe_customers FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.stripe_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id text NOT NULL,
  subscription_id text,
  status text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.stripe_subscriptions ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Users can read own subscriptions" ON public.stripe_subscriptions;
END $$;

CREATE POLICY "Users can read own subscriptions" ON public.stripe_subscriptions FOR SELECT TO authenticated
  USING (customer_id IN (SELECT customer_id FROM public.stripe_customers WHERE user_id = auth.uid()));

-- 4. Create trigger to auto-create user on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, first_name, last_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    'user'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. Create indexes
CREATE INDEX IF NOT EXISTS idx_businesses_owner ON public.businesses(owner_user_id);