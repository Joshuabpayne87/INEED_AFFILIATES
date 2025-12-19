/*
  # Create INA Referral Tracking System

  This migration creates the complete referral tracking system for ineedaffiliates.com,
  allowing users to earn 20% lifetime commissions by inviting other businesses to the platform.

  ## Changes

  ### 1. Add Referral Fields to Users Table
  - `referral_code` - Unique 8-character code for each user to share
  - `referred_by_user_id` - Links to the user who referred them (if any)
  - `referred_by_code` - The referral code used during signup

  ### 2. Create ina_referral_clicks Table
  Tracks every click on a referral link:
  - Links click to referrer user
  - Captures IP, user agent, referrer URL
  - Used for analytics and fraud detection

  ### 3. Create ina_referral_conversions Table
  Records when a referred user signs up:
  - Links new user to their referrer
  - Tracks conversion timestamp
  - One record per successful referral

  ### 4. Create ina_referral_commissions Table
  Master ledger of all referral commissions:
  - Tracks 20% of each payment made by referred users
  - Supports payable, paid, and void statuses
  - Links to the referred user and their payment

  ### 5. Database Functions
  - Generate unique referral codes on user creation
  - Record conversions when users sign up with referral codes
  - Calculate commission amounts

  ## Security
  - All tables have RLS enabled
  - Users can only view their own referral data
  - Commission records are read-only for users
  - Admin has full access for payout management
*/

-- ============================================================================
-- 1. ADD REFERRAL FIELDS TO USERS TABLE
-- ============================================================================

DO $$
BEGIN
  -- Add referral_code column (unique code for sharing)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'referral_code'
  ) THEN
    ALTER TABLE users ADD COLUMN referral_code text UNIQUE;
  END IF;

  -- Add referred_by_user_id column (who referred this user)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'referred_by_user_id'
  ) THEN
    ALTER TABLE users ADD COLUMN referred_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL;
  END IF;

  -- Add referred_by_code column (the code they used)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'referred_by_code'
  ) THEN
    ALTER TABLE users ADD COLUMN referred_by_code text;
  END IF;
END $$;

-- Create index for referral lookups
CREATE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code);
CREATE INDEX IF NOT EXISTS idx_users_referred_by_user_id ON users(referred_by_user_id);

-- ============================================================================
-- 2. CREATE INA_REFERRAL_CLICKS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS ina_referral_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referral_code text NOT NULL,
  ip_address text,
  user_agent text,
  referrer_url text,
  created_at timestamptz DEFAULT now()
);

-- RLS for ina_referral_clicks
ALTER TABLE ina_referral_clicks ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'ina_referral_clicks' AND policyname = 'Users can view own referral clicks'
  ) THEN
    CREATE POLICY "Users can view own referral clicks"
      ON ina_referral_clicks FOR SELECT
      TO authenticated
      USING (referrer_user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'ina_referral_clicks' AND policyname = 'Users can insert referral clicks'
  ) THEN
    CREATE POLICY "Users can insert referral clicks"
      ON ina_referral_clicks FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'ina_referral_clicks' AND policyname = 'Admin has full access to referral clicks'
  ) THEN
    CREATE POLICY "Admin has full access to referral clicks"
      ON ina_referral_clicks FOR ALL
      TO authenticated
      USING ((SELECT role FROM users WHERE id = auth.uid()) = 'admin');
  END IF;
END $$;

-- Indexes for ina_referral_clicks
CREATE INDEX IF NOT EXISTS idx_ina_referral_clicks_referrer_user_id ON ina_referral_clicks(referrer_user_id);
CREATE INDEX IF NOT EXISTS idx_ina_referral_clicks_referral_code ON ina_referral_clicks(referral_code);
CREATE INDEX IF NOT EXISTS idx_ina_referral_clicks_created_at ON ina_referral_clicks(created_at);

-- ============================================================================
-- 3. CREATE INA_REFERRAL_CONVERSIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS ina_referral_conversions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referred_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referral_code text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(referred_user_id)
);

-- RLS for ina_referral_conversions
ALTER TABLE ina_referral_conversions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'ina_referral_conversions' AND policyname = 'Users can view own referral conversions'
  ) THEN
    CREATE POLICY "Users can view own referral conversions"
      ON ina_referral_conversions FOR SELECT
      TO authenticated
      USING (referrer_user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'ina_referral_conversions' AND policyname = 'Admin has full access to referral conversions'
  ) THEN
    CREATE POLICY "Admin has full access to referral conversions"
      ON ina_referral_conversions FOR ALL
      TO authenticated
      USING ((SELECT role FROM users WHERE id = auth.uid()) = 'admin');
  END IF;
END $$;

-- Indexes for ina_referral_conversions
CREATE INDEX IF NOT EXISTS idx_ina_referral_conversions_referrer_user_id ON ina_referral_conversions(referrer_user_id);
CREATE INDEX IF NOT EXISTS idx_ina_referral_conversions_referred_user_id ON ina_referral_conversions(referred_user_id);
CREATE INDEX IF NOT EXISTS idx_ina_referral_conversions_created_at ON ina_referral_conversions(created_at);

-- ============================================================================
-- 4. CREATE INA_REFERRAL_COMMISSIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS ina_referral_commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referred_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stripe_payment_id text,
  payment_amount numeric(10,2) NOT NULL DEFAULT 0,
  commission_rate numeric(5,4) NOT NULL DEFAULT 0.20,
  commission_amount numeric(10,2) NOT NULL DEFAULT 0,
  currency text DEFAULT 'USD',
  status text DEFAULT 'payable' CHECK (status IN ('payable', 'paid', 'void')),
  payable_at timestamptz DEFAULT now(),
  paid_at timestamptz,
  paid_method text,
  paid_notes text,
  created_at timestamptz DEFAULT now()
);

-- RLS for ina_referral_commissions
ALTER TABLE ina_referral_commissions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'ina_referral_commissions' AND policyname = 'Users can view own referral commissions'
  ) THEN
    CREATE POLICY "Users can view own referral commissions"
      ON ina_referral_commissions FOR SELECT
      TO authenticated
      USING (referrer_user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'ina_referral_commissions' AND policyname = 'Admin has full access to referral commissions'
  ) THEN
    CREATE POLICY "Admin has full access to referral commissions"
      ON ina_referral_commissions FOR ALL
      TO authenticated
      USING ((SELECT role FROM users WHERE id = auth.uid()) = 'admin');
  END IF;
END $$;

-- Indexes for ina_referral_commissions
CREATE INDEX IF NOT EXISTS idx_ina_referral_commissions_referrer_user_id ON ina_referral_commissions(referrer_user_id);
CREATE INDEX IF NOT EXISTS idx_ina_referral_commissions_referred_user_id ON ina_referral_commissions(referred_user_id);
CREATE INDEX IF NOT EXISTS idx_ina_referral_commissions_status ON ina_referral_commissions(status);
CREATE INDEX IF NOT EXISTS idx_ina_referral_commissions_created_at ON ina_referral_commissions(created_at);

-- ============================================================================
-- 5. GENERATE REFERRAL CODE FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS text AS $$
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

-- ============================================================================
-- 6. UPDATE USER CREATION TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 7. BACKFILL REFERRAL CODES FOR EXISTING USERS
-- ============================================================================

DO $$
DECLARE
  user_record RECORD;
  new_code text;
BEGIN
  FOR user_record IN SELECT id FROM users WHERE referral_code IS NULL LOOP
    LOOP
      new_code := generate_referral_code();
      EXIT WHEN NOT EXISTS (SELECT 1 FROM users WHERE referral_code = new_code);
    END LOOP;
    UPDATE users SET referral_code = new_code WHERE id = user_record.id;
  END LOOP;
END $$;

-- ============================================================================
-- 8. CREATE FUNCTION TO RECORD REFERRAL COMMISSION
-- ============================================================================

CREATE OR REPLACE FUNCTION record_referral_commission(
  p_referred_user_id uuid,
  p_stripe_payment_id text,
  p_payment_amount numeric,
  p_currency text DEFAULT 'USD'
)
RETURNS uuid AS $$
DECLARE
  v_referrer_id uuid;
  v_commission_amount numeric;
  v_commission_id uuid;
BEGIN
  -- Find the referrer
  SELECT referred_by_user_id INTO v_referrer_id
  FROM users
  WHERE id = p_referred_user_id;

  -- If no referrer, return null
  IF v_referrer_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Calculate 20% commission
  v_commission_amount := p_payment_amount * 0.20;

  -- Insert commission record
  INSERT INTO ina_referral_commissions (
    referrer_user_id,
    referred_user_id,
    stripe_payment_id,
    payment_amount,
    commission_amount,
    currency
  )
  VALUES (
    v_referrer_id,
    p_referred_user_id,
    p_stripe_payment_id,
    p_payment_amount,
    v_commission_amount,
    p_currency
  )
  RETURNING id INTO v_commission_id;

  RETURN v_commission_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;