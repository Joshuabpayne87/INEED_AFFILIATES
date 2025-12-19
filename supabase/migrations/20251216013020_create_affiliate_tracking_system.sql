/*
  # Create Complete Affiliate Tracking System

  ## Overview
  This migration creates the complete affiliate tracking and commission system for INeedAffiliates.com,
  including link tracking, click logging, lead conversion, commission ledger, and enforcement.

  ## Changes

  ### 1. Business Profile Commission Fields
  Adds commission terms to business profiles:
  - `affiliate_commission_type` - How affiliates are paid (percent or flat)
  - `affiliate_commission_value` - The commission amount
  - `ina_commission_type` - How INA (master affiliate) is paid
  - `ina_commission_value` - INA's commission amount
  - `commission_currency` - Currency for payments (default USD)
  - `commission_terms_locked` - Prevents business from changing terms
  - `commission_terms_locked_at` - Timestamp when terms were locked
  - `is_live` - Business is active in directory
  - `is_suspended` - Business is suspended for late payments
  - `late_payout_flag` - Business has overdue payments
  - `suspended_at` - When business was suspended
  - `max_days_late` - Cached: Maximum days late across all payments
  - `unpaid_affiliate_total` - Cached: Total unpaid to affiliates
  - `unpaid_ina_total` - Cached: Total unpaid to INA

  ### 2. Affiliate Links Table
  Tracks auto-generated affiliate tracking links:
  - Links are generated when affiliate adds offer to vault
  - Each affiliate gets unique tracking code per offer
  - All links use prtnr.live domain

  ### 3. Clicks Table
  Logs every click on tracking links:
  - Captures IP, user agent, UTM parameters
  - Links click to affiliate for attribution
  - Generates unique click ID for conversion tracking

  ### 4. Leads Table
  Records all conversions (leads, calls, purchases):
  - Links back to click and affiliate
  - Captures customer data and event details
  - Stores sale amounts for commission calculation

  ### 5. Commission Events Table
  Master ledger of all commissions:
  - **Splits commission into affiliate + INA amounts**
  - Tracks payment status and dates
  - Links to lead for full audit trail
  - Supports payable, paid, and void statuses

  ### 6. Affiliate Tax Documents Table
  Stores W-9 forms for affiliates:
  - Required before payouts
  - Files stored in private Supabase storage
  - Admin approval workflow

  ### 7. INA Invoices Table
  Tracks invoices sent to businesses for INA commissions:
  - Aggregates INA commissions by period
  - Tracks payment status
  - Used for enforcement and accounting

  ## Security
  - All tables have RLS enabled
  - Affiliates see only their data
  - Businesses see only their offers/affiliates
  - Admin has full visibility
  - W-9 files are private

  ## Performance
  - Indexes on all foreign keys
  - Indexes on lookup fields (public_code, status, etc.)
  - Cached totals on business profile reduce query load
*/

-- =====================================================================
-- 1. ADD COMMISSION FIELDS TO BUSINESS PROFILES
-- =====================================================================

-- Add commission and enforcement fields to businesses table
DO $$
BEGIN
  -- Affiliate commission type (percent or flat)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'affiliate_commission_type'
  ) THEN
    ALTER TABLE businesses ADD COLUMN affiliate_commission_type text DEFAULT 'percent' CHECK (affiliate_commission_type IN ('percent', 'flat'));
  END IF;

  -- Affiliate commission value
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'affiliate_commission_value'
  ) THEN
    ALTER TABLE businesses ADD COLUMN affiliate_commission_value numeric DEFAULT 0 CHECK (affiliate_commission_value >= 0);
  END IF;

  -- INA (master affiliate) commission type
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'ina_commission_type'
  ) THEN
    ALTER TABLE businesses ADD COLUMN ina_commission_type text DEFAULT 'percent' CHECK (ina_commission_type IN ('percent', 'flat'));
  END IF;

  -- INA commission value
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'ina_commission_value'
  ) THEN
    ALTER TABLE businesses ADD COLUMN ina_commission_value numeric DEFAULT 0 CHECK (ina_commission_value >= 0);
  END IF;

  -- Currency
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'commission_currency'
  ) THEN
    ALTER TABLE businesses ADD COLUMN commission_currency text DEFAULT 'USD';
  END IF;

  -- Commission terms locked flag
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'commission_terms_locked'
  ) THEN
    ALTER TABLE businesses ADD COLUMN commission_terms_locked boolean DEFAULT false;
  END IF;

  -- When terms were locked
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'commission_terms_locked_at'
  ) THEN
    ALTER TABLE businesses ADD COLUMN commission_terms_locked_at timestamptz;
  END IF;

  -- Is business live in directory
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'is_live'
  ) THEN
    ALTER TABLE businesses ADD COLUMN is_live boolean DEFAULT true;
  END IF;

  -- Is business suspended
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'is_suspended'
  ) THEN
    ALTER TABLE businesses ADD COLUMN is_suspended boolean DEFAULT false;
  END IF;

  -- Late payment flag (>45 days)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'late_payout_flag'
  ) THEN
    ALTER TABLE businesses ADD COLUMN late_payout_flag boolean DEFAULT false;
  END IF;

  -- When suspended
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'suspended_at'
  ) THEN
    ALTER TABLE businesses ADD COLUMN suspended_at timestamptz;
  END IF;

  -- Cached: max days late
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'max_days_late'
  ) THEN
    ALTER TABLE businesses ADD COLUMN max_days_late integer DEFAULT 0;
  END IF;

  -- Cached: total unpaid to affiliates
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'unpaid_affiliate_total'
  ) THEN
    ALTER TABLE businesses ADD COLUMN unpaid_affiliate_total numeric DEFAULT 0;
  END IF;

  -- Cached: total unpaid to INA
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'unpaid_ina_total'
  ) THEN
    ALTER TABLE businesses ADD COLUMN unpaid_ina_total numeric DEFAULT 0;
  END IF;
END $$;

-- =====================================================================
-- 2. CREATE AFFILIATE LINKS TABLE
-- =====================================================================

CREATE TABLE IF NOT EXISTS affiliate_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id uuid NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  affiliate_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  public_code text NOT NULL UNIQUE,
  tracking_domain text DEFAULT 'prtnr.live',
  tracking_url text NOT NULL,
  destination_url text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(offer_id, affiliate_user_id)
);

-- RLS for affiliate_links
ALTER TABLE affiliate_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Affiliates can view own links"
  ON affiliate_links FOR SELECT
  TO authenticated
  USING (affiliate_user_id = auth.uid());

CREATE POLICY "Businesses can view links for their offers"
  ON affiliate_links FOR SELECT
  TO authenticated
  USING (business_id IN (SELECT id FROM businesses WHERE owner_user_id = auth.uid()));

CREATE POLICY "System can insert links"
  ON affiliate_links FOR INSERT
  TO authenticated
  WITH CHECK (affiliate_user_id = auth.uid());

CREATE POLICY "Admin has full access to affiliate links"
  ON affiliate_links FOR ALL
  TO authenticated
  USING ((SELECT role FROM users WHERE id = auth.uid()) = 'admin');

-- Indexes
CREATE INDEX IF NOT EXISTS idx_affiliate_links_public_code ON affiliate_links(public_code);
CREATE INDEX IF NOT EXISTS idx_affiliate_links_offer_id ON affiliate_links(offer_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_links_affiliate_user_id ON affiliate_links(affiliate_user_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_links_business_id ON affiliate_links(business_id);

-- =====================================================================
-- 3. CREATE CLICKS TABLE
-- =====================================================================

CREATE TABLE IF NOT EXISTS clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  click_id text NOT NULL UNIQUE,
  public_code text NOT NULL,
  offer_id uuid NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  affiliate_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ip_address text,
  user_agent text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_term text,
  utm_content text,
  referrer text,
  created_at timestamptz DEFAULT now()
);

-- RLS for clicks
ALTER TABLE clicks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Affiliates can view own clicks"
  ON clicks FOR SELECT
  TO authenticated
  USING (affiliate_user_id = auth.uid());

CREATE POLICY "Businesses can view clicks for their offers"
  ON clicks FOR SELECT
  TO authenticated
  USING (business_id IN (SELECT id FROM businesses WHERE owner_user_id = auth.uid()));

CREATE POLICY "Admin has full access to clicks"
  ON clicks FOR ALL
  TO authenticated
  USING ((SELECT role FROM users WHERE id = auth.uid()) = 'admin');

-- Indexes
CREATE INDEX IF NOT EXISTS idx_clicks_click_id ON clicks(click_id);
CREATE INDEX IF NOT EXISTS idx_clicks_public_code ON clicks(public_code);
CREATE INDEX IF NOT EXISTS idx_clicks_offer_id ON clicks(offer_id);
CREATE INDEX IF NOT EXISTS idx_clicks_affiliate_user_id ON clicks(affiliate_user_id);
CREATE INDEX IF NOT EXISTS idx_clicks_business_id ON clicks(business_id);
CREATE INDEX IF NOT EXISTS idx_clicks_created_at ON clicks(created_at);

-- =====================================================================
-- 4. CREATE LEADS TABLE
-- =====================================================================

CREATE TABLE IF NOT EXISTS leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id uuid NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  affiliate_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  click_id text,
  event_type text NOT NULL CHECK (event_type IN ('lead', 'booked_call', 'purchase')),
  email text,
  first_name text,
  last_name text,
  phone text,
  amount numeric DEFAULT 0,
  currency text DEFAULT 'USD',
  order_id text,
  booking_datetime timestamptz,
  raw_payload jsonb,
  created_at timestamptz DEFAULT now()
);

-- RLS for leads
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Affiliates can view own leads"
  ON leads FOR SELECT
  TO authenticated
  USING (affiliate_user_id = auth.uid());

CREATE POLICY "Businesses can view leads for their offers"
  ON leads FOR SELECT
  TO authenticated
  USING (business_id IN (SELECT id FROM businesses WHERE owner_user_id = auth.uid()));

CREATE POLICY "Admin has full access to leads"
  ON leads FOR ALL
  TO authenticated
  USING ((SELECT role FROM users WHERE id = auth.uid()) = 'admin');

-- Indexes
CREATE INDEX IF NOT EXISTS idx_leads_offer_id ON leads(offer_id);
CREATE INDEX IF NOT EXISTS idx_leads_business_id ON leads(business_id);
CREATE INDEX IF NOT EXISTS idx_leads_affiliate_user_id ON leads(affiliate_user_id);
CREATE INDEX IF NOT EXISTS idx_leads_click_id ON leads(click_id);
CREATE INDEX IF NOT EXISTS idx_leads_event_type ON leads(event_type);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at);

-- =====================================================================
-- 5. CREATE COMMISSION EVENTS TABLE
-- =====================================================================

CREATE TABLE IF NOT EXISTS commission_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  offer_id uuid NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
  affiliate_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  click_id text,
  affiliate_commission_amount numeric NOT NULL DEFAULT 0,
  ina_commission_amount numeric NOT NULL DEFAULT 0,
  currency text DEFAULT 'USD',
  status text DEFAULT 'payable' CHECK (status IN ('payable', 'paid', 'void')),
  payable_at timestamptz DEFAULT now(),
  paid_at timestamptz,
  paid_method text,
  paid_notes text,
  created_at timestamptz DEFAULT now()
);

-- RLS for commission_events
ALTER TABLE commission_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Affiliates can view own commissions"
  ON commission_events FOR SELECT
  TO authenticated
  USING (affiliate_user_id = auth.uid());

CREATE POLICY "Businesses can view commissions for their offers"
  ON commission_events FOR SELECT
  TO authenticated
  USING (business_id IN (SELECT id FROM businesses WHERE owner_user_id = auth.uid()));

CREATE POLICY "Businesses can update payment status"
  ON commission_events FOR UPDATE
  TO authenticated
  USING (business_id IN (SELECT id FROM businesses WHERE owner_user_id = auth.uid()))
  WITH CHECK (business_id IN (SELECT id FROM businesses WHERE owner_user_id = auth.uid()));

CREATE POLICY "Admin has full access to commissions"
  ON commission_events FOR ALL
  TO authenticated
  USING ((SELECT role FROM users WHERE id = auth.uid()) = 'admin');

-- Indexes
CREATE INDEX IF NOT EXISTS idx_commission_events_business_id ON commission_events(business_id);
CREATE INDEX IF NOT EXISTS idx_commission_events_offer_id ON commission_events(offer_id);
CREATE INDEX IF NOT EXISTS idx_commission_events_affiliate_user_id ON commission_events(affiliate_user_id);
CREATE INDEX IF NOT EXISTS idx_commission_events_lead_id ON commission_events(lead_id);
CREATE INDEX IF NOT EXISTS idx_commission_events_status ON commission_events(status);
CREATE INDEX IF NOT EXISTS idx_commission_events_payable_at ON commission_events(payable_at);
CREATE INDEX IF NOT EXISTS idx_commission_events_paid_at ON commission_events(paid_at);

-- =====================================================================
-- 6. CREATE AFFILIATE TAX DOCUMENTS TABLE
-- =====================================================================

CREATE TABLE IF NOT EXISTS affiliate_tax_docs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  doc_type text DEFAULT 'w9' CHECK (doc_type IN ('w9', 'w8ben')),
  file_path text NOT NULL,
  status text DEFAULT 'submitted' CHECK (status IN ('submitted', 'approved', 'rejected')),
  submitted_at timestamptz DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES users(id),
  rejection_reason text,
  UNIQUE(affiliate_user_id, doc_type)
);

-- RLS for affiliate_tax_docs
ALTER TABLE affiliate_tax_docs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Affiliates can view own tax docs"
  ON affiliate_tax_docs FOR SELECT
  TO authenticated
  USING (affiliate_user_id = auth.uid());

CREATE POLICY "Affiliates can insert own tax docs"
  ON affiliate_tax_docs FOR INSERT
  TO authenticated
  WITH CHECK (affiliate_user_id = auth.uid());

CREATE POLICY "Affiliates can update own tax docs"
  ON affiliate_tax_docs FOR UPDATE
  TO authenticated
  USING (affiliate_user_id = auth.uid())
  WITH CHECK (affiliate_user_id = auth.uid());

CREATE POLICY "Admin has full access to tax docs"
  ON affiliate_tax_docs FOR ALL
  TO authenticated
  USING ((SELECT role FROM users WHERE id = auth.uid()) = 'admin');

-- Indexes
CREATE INDEX IF NOT EXISTS idx_affiliate_tax_docs_affiliate_user_id ON affiliate_tax_docs(affiliate_user_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_tax_docs_status ON affiliate_tax_docs(status);

-- =====================================================================
-- 7. CREATE INA INVOICES TABLE
-- =====================================================================

CREATE TABLE IF NOT EXISTS ina_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  amount_due numeric NOT NULL DEFAULT 0,
  period_start date NOT NULL,
  period_end date NOT NULL,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'void')),
  invoice_number text UNIQUE,
  sent_at timestamptz,
  paid_at timestamptz,
  payment_method text,
  payment_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS for ina_invoices
ALTER TABLE ina_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Businesses can view own invoices"
  ON ina_invoices FOR SELECT
  TO authenticated
  USING (business_id IN (SELECT id FROM businesses WHERE owner_user_id = auth.uid()));

CREATE POLICY "Admin has full access to invoices"
  ON ina_invoices FOR ALL
  TO authenticated
  USING ((SELECT role FROM users WHERE id = auth.uid()) = 'admin');

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ina_invoices_business_id ON ina_invoices(business_id);
CREATE INDEX IF NOT EXISTS idx_ina_invoices_status ON ina_invoices(status);
CREATE INDEX IF NOT EXISTS idx_ina_invoices_period_start ON ina_invoices(period_start);
CREATE INDEX IF NOT EXISTS idx_ina_invoices_period_end ON ina_invoices(period_end);
