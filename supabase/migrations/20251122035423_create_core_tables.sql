/*
  # Create Core Tables for ineedaffiliates.com Platform

  ## Overview
  This migration creates the complete database schema for a high-ticket partnership SaaS platform
  that combines partnership directory, offer marketplace, partner CRM, and personal offer vault.

  ## New Tables

  ### 1. users (extends auth.users)
  - `id` (uuid, primary key, references auth.users)
  - `first_name` (text)
  - `last_name` (text)
  - `email` (text)
  - `photo_url` (text, nullable)
  - `role` (text, default 'user')
  - `created_at` (timestamptz)

  ### 2. businesses
  - `id` (uuid, primary key)
  - `owner_user_id` (uuid, references users.id)
  - `business_name` (text)
  - `industry` (text)
  - `niche` (text)
  - `target_audience` (text)
  - `website_url` (text, nullable)
  - `offer_summary` (text, nullable)
  - `offer_type` (text, nullable)
  - `price_point` (text, nullable)
  - `email_list_size` (integer, nullable)
  - `social_following_size` (integer, nullable)
  - `booking_link` (text, nullable)
  - `affiliate_signup_link` (text, nullable)
  - `tier2_affiliate_link` (text, nullable)
  - `purchase_affiliate_link` (text, nullable)
  - `is_profile_published` (boolean, default false)
  - `collaboration_types` (text[], nullable)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 3. connections
  - `id` (uuid, primary key)
  - `requester_user_id` (uuid, references users.id)
  - `recipient_user_id` (uuid, references users.id)
  - `status` (text, 'pending' | 'accepted' | 'declined')
  - `is_favorite` (boolean, default false)
  - `last_interaction_at` (timestamptz, nullable)
  - `created_at` (timestamptz)
  - `accepted_at` (timestamptz, nullable)

  ### 4. connection_notes
  - `id` (uuid, primary key)
  - `connection_id` (uuid, references connections.id)
  - `user_id` (uuid, references users.id)
  - `note_text` (text)
  - `created_at` (timestamptz)

  ### 5. offers
  - `id` (uuid, primary key)
  - `business_id` (uuid, references businesses.id)
  - `offer_name` (text)
  - `description` (text)
  - `price_point` (text)
  - `commission_percent` (numeric)
  - `offer_type` (text)
  - `promo_methods` (text[])
  - `resources_link` (text, nullable)
  - `affiliate_signup_link` (text, nullable)
  - `purchase_affiliate_link` (text, nullable)
  - `is_active` (boolean, default true)
  - `created_at` (timestamptz)

  ### 6. user_offers (My Offer Vault)
  - `id` (uuid, primary key)
  - `user_id` (uuid, references users.id)
  - `offer_id` (uuid, references offers.id)
  - `personal_affiliate_link` (text)
  - `affiliate_portal_login_url` (text, nullable)
  - `affiliate_username` (text, nullable)
  - `notes` (text, nullable)
  - `last_promo_date` (date, nullable)
  - `last_promo_type` (text, nullable)
  - `created_at` (timestamptz)

  ### 7. partner_tasks (Follow-Up System)
  - `id` (uuid, primary key)
  - `user_id` (uuid, references users.id)
  - `connection_id` (uuid, references connections.id)
  - `title` (text)
  - `due_at` (timestamptz)
  - `status` (text, 'open' | 'done')
  - `created_at` (timestamptz)
  - `completed_at` (timestamptz, nullable)

  ### 8. call_click_logs (Booking Intent Tracking)
  - `id` (uuid, primary key)
  - `clicked_by_user_id` (uuid, references users.id)
  - `connection_id` (uuid, references connections.id)
  - `source` (text, 'partner_crm' | 'offer_marketplace' | 'profile')
  - `created_at` (timestamptz)

  ### 9. calls (Manual Call Logs)
  - `id` (uuid, primary key)
  - `connection_id` (uuid, references connections.id)
  - `user_id` (uuid, references users.id)
  - `scheduled_at` (timestamptz)
  - `status` (text, 'planned' | 'completed')
  - `notes` (text, nullable)
  - `created_at` (timestamptz)

  ## Security
  - Enable RLS on all tables
  - Add policies for authenticated users to manage their own data
  - Add policies for reading published business profiles
  - Add policies for connection management
*/

-- Create users table (extends auth.users)
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name text NOT NULL DEFAULT '',
  last_name text NOT NULL DEFAULT '',
  email text NOT NULL,
  photo_url text,
  role text NOT NULL DEFAULT 'user',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own data"
  ON users FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own data"
  ON users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own data"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Create businesses table
CREATE TABLE IF NOT EXISTS businesses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  business_name text NOT NULL DEFAULT '',
  industry text NOT NULL DEFAULT '',
  niche text NOT NULL DEFAULT '',
  target_audience text NOT NULL DEFAULT '',
  website_url text,
  offer_summary text,
  offer_type text,
  price_point text,
  email_list_size integer,
  social_following_size integer,
  booking_link text,
  affiliate_signup_link text,
  tier2_affiliate_link text,
  purchase_affiliate_link text,
  is_profile_published boolean DEFAULT false,
  collaboration_types text[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read published business profiles"
  ON businesses FOR SELECT
  TO authenticated
  USING (is_profile_published = true OR owner_user_id = auth.uid());

CREATE POLICY "Users can manage own business"
  ON businesses FOR ALL
  TO authenticated
  USING (owner_user_id = auth.uid())
  WITH CHECK (owner_user_id = auth.uid());

-- Create connections table
CREATE TABLE IF NOT EXISTS connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  is_favorite boolean DEFAULT false,
  last_interaction_at timestamptz,
  created_at timestamptz DEFAULT now(),
  accepted_at timestamptz,
  CONSTRAINT valid_status CHECK (status IN ('pending', 'accepted', 'declined')),
  CONSTRAINT different_users CHECK (requester_user_id != recipient_user_id)
);

ALTER TABLE connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their connections"
  ON connections FOR SELECT
  TO authenticated
  USING (requester_user_id = auth.uid() OR recipient_user_id = auth.uid());

CREATE POLICY "Users can create connections"
  ON connections FOR INSERT
  TO authenticated
  WITH CHECK (requester_user_id = auth.uid());

CREATE POLICY "Users can update their connections"
  ON connections FOR UPDATE
  TO authenticated
  USING (requester_user_id = auth.uid() OR recipient_user_id = auth.uid())
  WITH CHECK (requester_user_id = auth.uid() OR recipient_user_id = auth.uid());

-- Create connection_notes table
CREATE TABLE IF NOT EXISTS connection_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id uuid NOT NULL REFERENCES connections(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  note_text text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE connection_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read notes for their connections"
  ON connection_notes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM connections
      WHERE connections.id = connection_notes.connection_id
      AND (connections.requester_user_id = auth.uid() OR connections.recipient_user_id = auth.uid())
    )
  );

CREATE POLICY "Users can create notes for their connections"
  ON connection_notes FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM connections
      WHERE connections.id = connection_notes.connection_id
      AND (connections.requester_user_id = auth.uid() OR connections.recipient_user_id = auth.uid())
    )
  );

-- Create offers table
CREATE TABLE IF NOT EXISTS offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  offer_name text NOT NULL,
  description text NOT NULL DEFAULT '',
  price_point text NOT NULL DEFAULT '',
  commission_percent numeric NOT NULL DEFAULT 0,
  offer_type text NOT NULL DEFAULT '',
  promo_methods text[] DEFAULT '{}',
  resources_link text,
  affiliate_signup_link text,
  purchase_affiliate_link text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read active offers from published businesses"
  ON offers FOR SELECT
  TO authenticated
  USING (
    is_active = true AND
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = offers.business_id
      AND (businesses.is_profile_published = true OR businesses.owner_user_id = auth.uid())
    )
  );

CREATE POLICY "Business owners can manage their offers"
  ON offers FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = offers.business_id
      AND businesses.owner_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = offers.business_id
      AND businesses.owner_user_id = auth.uid()
    )
  );

-- Create user_offers table (My Offer Vault)
CREATE TABLE IF NOT EXISTS user_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  offer_id uuid NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
  personal_affiliate_link text NOT NULL,
  affiliate_portal_login_url text,
  affiliate_username text,
  notes text,
  last_promo_date date,
  last_promo_type text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, offer_id)
);

ALTER TABLE user_offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own offer vault"
  ON user_offers FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage own offer vault"
  ON user_offers FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Create partner_tasks table
CREATE TABLE IF NOT EXISTS partner_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  connection_id uuid NOT NULL REFERENCES connections(id) ON DELETE CASCADE,
  title text NOT NULL,
  due_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  CONSTRAINT valid_task_status CHECK (status IN ('open', 'done'))
);

ALTER TABLE partner_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own tasks"
  ON partner_tasks FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage own tasks"
  ON partner_tasks FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Create call_click_logs table
CREATE TABLE IF NOT EXISTS call_click_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clicked_by_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  connection_id uuid NOT NULL REFERENCES connections(id) ON DELETE CASCADE,
  source text NOT NULL,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_source CHECK (source IN ('partner_crm', 'offer_marketplace', 'profile'))
);

ALTER TABLE call_click_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own call clicks"
  ON call_click_logs FOR SELECT
  TO authenticated
  USING (clicked_by_user_id = auth.uid());

CREATE POLICY "Users can log own call clicks"
  ON call_click_logs FOR INSERT
  TO authenticated
  WITH CHECK (clicked_by_user_id = auth.uid());

-- Create calls table
CREATE TABLE IF NOT EXISTS calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id uuid NOT NULL REFERENCES connections(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  scheduled_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'planned',
  notes text,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_call_status CHECK (status IN ('planned', 'completed'))
);

ALTER TABLE calls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read calls for their connections"
  ON calls FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM connections
      WHERE connections.id = calls.connection_id
      AND (connections.requester_user_id = auth.uid() OR connections.recipient_user_id = auth.uid())
    )
  );

CREATE POLICY "Users can manage calls for their connections"
  ON calls FOR ALL
  TO authenticated
  USING (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM connections
      WHERE connections.id = calls.connection_id
      AND (connections.requester_user_id = auth.uid() OR connections.recipient_user_id = auth.uid())
    )
  )
  WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM connections
      WHERE connections.id = calls.connection_id
      AND (connections.requester_user_id = auth.uid() OR connections.recipient_user_id = auth.uid())
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_businesses_owner ON businesses(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_businesses_published ON businesses(is_profile_published);
CREATE INDEX IF NOT EXISTS idx_connections_requester ON connections(requester_user_id);
CREATE INDEX IF NOT EXISTS idx_connections_recipient ON connections(recipient_user_id);
CREATE INDEX IF NOT EXISTS idx_connections_status ON connections(status);
CREATE INDEX IF NOT EXISTS idx_offers_business ON offers(business_id);
CREATE INDEX IF NOT EXISTS idx_offers_active ON offers(is_active);
CREATE INDEX IF NOT EXISTS idx_user_offers_user ON user_offers(user_id);
CREATE INDEX IF NOT EXISTS idx_partner_tasks_user ON partner_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_partner_tasks_due ON partner_tasks(due_at);
CREATE INDEX IF NOT EXISTS idx_partner_tasks_status ON partner_tasks(status);