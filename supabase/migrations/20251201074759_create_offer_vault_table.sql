/*
  # Create Offer Vault Table

  ## Overview
  This migration creates the offer_vault table for users to save and track offers they want to promote.
  Users can bookmark offers from the marketplace and manage their affiliate partnerships.

  ## New Tables

  ### `offer_vault`
  Stores saved offers with affiliate tracking information
  - `id` (uuid, primary key) - Unique identifier for each vault entry
  - `user_id` (uuid, foreign key) - References auth.users, the user who saved the offer
  - `offer_id` (text) - Identifier for the specific offer
  - `business_id` (text) - ID of the business/partner
  - `offer_name` (text) - Name of the offer
  - `company_name` (text) - Name of the company
  - `partner_name` (text) - Contact person name from business profile
  - `price` (text) - Price of the offer (e.g., "$297/mo")
  - `commission` (text) - Commission structure
  - `target_client` (text) - Target audience for the offer
  - `commission_type` (text) - Type of commission (Recurring, One-time, Rev-share, Hybrid)
  - `affiliate_signup_link` (text) - URL to affiliate signup page
  - `portal_login_link` (text) - URL to partner portal (user-editable)
  - `affiliate_link` (text) - User's unique affiliate tracking link (user-editable)
  - `status` (text) - Connection status: 'pending_connection' or 'approved'
  - `created_at` (timestamptz) - When the offer was saved

  ## Security
  - Enable RLS on offer_vault table
  - Users can only view their own saved offers
  - Users can only insert/update/delete their own vault entries
  - Enforce user_id matches auth.uid() in all policies

  ## Indexes
  - Index on user_id for fast lookups
  - Composite index on (user_id, business_id) for connection status updates
  - Unique constraint on (user_id, offer_id) to prevent duplicates
*/

-- Create offer_vault table
CREATE TABLE IF NOT EXISTS offer_vault (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  offer_id text NOT NULL,
  business_id text NOT NULL,
  offer_name text NOT NULL,
  company_name text NOT NULL,
  partner_name text NOT NULL,
  price text DEFAULT '',
  commission text NOT NULL,
  target_client text NOT NULL,
  commission_type text NOT NULL,
  affiliate_signup_link text DEFAULT '',
  portal_login_link text DEFAULT '',
  affiliate_link text DEFAULT '',
  status text NOT NULL CHECK (status IN ('pending_connection', 'approved')),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE offer_vault ENABLE ROW LEVEL SECURITY;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_offer_vault_user_id ON offer_vault(user_id);
CREATE INDEX IF NOT EXISTS idx_offer_vault_user_business ON offer_vault(user_id, business_id);

-- Create unique constraint to prevent duplicate saves
CREATE UNIQUE INDEX IF NOT EXISTS idx_offer_vault_user_offer_unique 
  ON offer_vault(user_id, offer_id);

-- RLS Policies

-- Users can view their own saved offers
CREATE POLICY "Users can view own vault entries"
  ON offer_vault
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can insert their own vault entries
CREATE POLICY "Users can insert own vault entries"
  ON offer_vault
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own vault entries
CREATE POLICY "Users can update own vault entries"
  ON offer_vault
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own vault entries
CREATE POLICY "Users can delete own vault entries"
  ON offer_vault
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
