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
CREATE INDEX IF NOT EXISTS idx_partner_tasks_status ON partner_tasks(status);/*
  # Add Favorites Table for Partnership Bookmarks

  ## Overview
  This migration creates a favorites table to allow users to bookmark partnership opportunities.

  ## New Table
  
  ### favorites
  - `id` (uuid, primary key)
  - `user_id` (uuid, references users.id) - The user who favorited
  - `partnership_id` (uuid) - The partnership being favorited (references business id)
  - `created_at` (timestamptz) - When the favorite was created
  - Unique constraint on (user_id, partnership_id) to prevent duplicates

  ## Security
  - Enable RLS on favorites table
  - Users can only read their own favorites
  - Users can only create/delete their own favorites
*/

-- Create favorites table
CREATE TABLE IF NOT EXISTS favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  partnership_id uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, partnership_id)
);

ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own favorites"
  ON favorites FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own favorites"
  ON favorites FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own favorites"
  ON favorites FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_partnership ON favorites(partnership_id);
/*
  # Add profile state and calendar link to businesses

  1. Changes
    - Add `profile_state` column (draft/live) to businesses table
    - Add `calendar_link` column for private scheduling links
    - Add `contact_name` column for private contact details
    - Update existing businesses to have 'draft' state by default
  
  2. Security
    - Maintain existing RLS policies
    - Calendar link and contact_name are stored but not exposed publicly
*/

-- Add new columns to businesses table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'profile_state'
  ) THEN
    ALTER TABLE businesses ADD COLUMN profile_state text DEFAULT 'draft' CHECK (profile_state IN ('draft', 'live'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'calendar_link'
  ) THEN
    ALTER TABLE businesses ADD COLUMN calendar_link text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'contact_name'
  ) THEN
    ALTER TABLE businesses ADD COLUMN contact_name text;
  END IF;
END $$;
/*
  # Add Price and Interested Offer Types Fields

  ## Overview
  This migration adds support for offer pricing and user offer type preferences to improve
  the offer marketplace experience and enable AI-powered offer matching.

  ## Changes Made

  1. **New Column: interested_offer_types**
     - Added to `businesses` table
     - Type: text[] (array of strings)
     - Purpose: Stores the types of offers a business owner is interested in promoting
     - Example values: ['SaaS tools', 'Coaching programs', 'High-ticket offers']
     - Optional field (nullable)

  2. **Updated JSONB Structure: primary_offers**
     - Added `price` field to the primary_offers JSONB array structure
     - Type: text (stored as part of JSONB)
     - Purpose: Displays offer pricing in marketplace and business profiles
     - Example values: '$297/mo', '$5,000-$15,000', '$3,500'
     - Optional field

  ## Benefits
  - **Better Offer Discovery**: Users can filter and sort offers by price range
  - **AI Matching**: System can suggest relevant offers based on user preferences
  - **Transparency**: Clear pricing information helps partners make informed decisions
  - **User Experience**: Personalized offer recommendations improve marketplace engagement

  ## Notes
  - These fields are optional and do not affect existing profile completion requirements
  - No data migration needed as fields are nullable
  - Existing primary_offers JSONB data remains valid (price field is optional)
  - RLS policies remain unchanged as no new tables were created
*/

-- Add interested_offer_types column to businesses table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'interested_offer_types'
  ) THEN
    ALTER TABLE businesses ADD COLUMN interested_offer_types text[];
  END IF;
END $$;

-- Add comment to document the new column
COMMENT ON COLUMN businesses.interested_offer_types IS 'Array of offer types the business is interested in promoting (e.g., SaaS tools, Coaching programs). Used for AI offer matching in marketplace.';
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
/*
  # Add Subscription Management and Messaging System
  
  ## Overview
  This migration adds subscription/billing functionality and a messaging system for partner communication.
  
  ## Changes to Existing Tables
  
  ### 1. users table - Add subscription fields
  - `subscription_tier` (text) - Plan level: 'free', 'pro', 'enterprise'
  - `subscription_status` (text) - Payment status: 'active', 'inactive', 'cancelled', 'past_due'
  - `stripe_customer_id` (text) - Stripe customer identifier
  - `subscription_ends_at` (timestamptz) - When subscription expires/renews
  - `trial_ends_at` (timestamptz) - When free trial ends
  
  ## New Tables
  
  ### 2. messages
  Direct messaging between connected partners
  - `id` (uuid, primary key)
  - `sender_id` (uuid, references users.id)
  - `recipient_id` (uuid, references users.id)
  - `connection_id` (uuid, references connections.id)
  - `thread_id` (text) - Groups messages into conversations
  - `content` (text) - Message body
  - `is_read` (boolean) - Whether recipient has read the message
  - `created_at` (timestamptz)
  
  ### 3. notifications
  System notifications for user actions
  - `id` (uuid, primary key)
  - `user_id` (uuid, references users.id)
  - `type` (text) - 'connection_request', 'connection_accepted', 'new_message', 'offer_match'
  - `title` (text) - Notification headline
  - `message` (text) - Notification content
  - `link` (text) - Where to navigate when clicked
  - `is_read` (boolean)
  - `created_at` (timestamptz)
  
  ## Security
  - Enable RLS on all new tables
  - Users can only read messages where they are sender or recipient
  - Users can only send messages to accepted connections
  - Users can only view their own notifications
  
  ## Indexes
  - Index on thread_id for fast message lookup
  - Index on recipient_id and is_read for unread counts
  - Index on user_id and is_read for notification counts
*/

-- Add subscription fields to users table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'subscription_tier'
  ) THEN
    ALTER TABLE users ADD COLUMN subscription_tier text DEFAULT 'free';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'subscription_status'
  ) THEN
    ALTER TABLE users ADD COLUMN subscription_status text DEFAULT 'active';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'stripe_customer_id'
  ) THEN
    ALTER TABLE users ADD COLUMN stripe_customer_id text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'subscription_ends_at'
  ) THEN
    ALTER TABLE users ADD COLUMN subscription_ends_at timestamptz;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'trial_ends_at'
  ) THEN
    ALTER TABLE users ADD COLUMN trial_ends_at timestamptz DEFAULT (now() + interval '14 days');
  END IF;
END $$;

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  connection_id uuid NOT NULL REFERENCES connections(id) ON DELETE CASCADE,
  thread_id text NOT NULL,
  content text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT different_sender_recipient CHECK (sender_id != recipient_id)
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for messages
CREATE POLICY "Users can view messages they sent or received"
  ON messages
  FOR SELECT
  TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

CREATE POLICY "Users can send messages to accepted connections"
  ON messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM connections
      WHERE connections.id = messages.connection_id
      AND connections.status = 'accepted'
      AND (connections.requester_user_id = auth.uid() OR connections.recipient_user_id = auth.uid())
    )
  );

CREATE POLICY "Users can mark their received messages as read"
  ON messages
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = recipient_id)
  WITH CHECK (auth.uid() = recipient_id);

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  link text,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_notification_type CHECK (
    type IN ('connection_request', 'connection_accepted', 'new_message', 'offer_match', 'payment_success', 'payment_failed')
  )
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notifications
CREATE POLICY "Users can view own notifications"
  ON notifications
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON notifications
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own notifications"
  ON notifications
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_messages_thread ON messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_recipient ON messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_messages_unread ON messages(recipient_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);

-- Add check constraints for subscription fields
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'valid_subscription_tier'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT valid_subscription_tier 
      CHECK (subscription_tier IN ('free', 'pro', 'enterprise'));
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'valid_subscription_status'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT valid_subscription_status 
      CHECK (subscription_status IN ('active', 'inactive', 'cancelled', 'past_due', 'trialing'));
  END IF;
END $$;
/*
  # Add Complete Business Profile Fields
  
  ## Overview
  This migration adds all the fields required by the OnboardingWizard and BusinessProfile type
  to support the complete business profile functionality.
  
  ## Changes
  1. Add all missing profile fields to businesses table:
     - Core info: company_name, email, website, description, tagline, video_url
     - Founder info: founder_name, founder_bio, founder_background, founder_why_started, founder_headshot_url
     - Partnership info: partnership_type, commission_rate, requirements, monetization_type, cross_promotion_preference
     - Business details: main_offer_type, problem_solved, unique_value
     - Metrics: social_audience_size, email_open_rate, number_of_offers
     - Arrays: partnership_opportunities, looking_for, primary_offers
     - Display: logo_url, featured
  
  ## Notes
  - All new fields are nullable to allow gradual profile completion
  - Existing data is preserved
  - RLS policies remain unchanged
*/

-- Add core business info fields
DO $$
BEGIN
  -- Company name (replacing business_name)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'company_name'
  ) THEN
    ALTER TABLE businesses ADD COLUMN company_name text;
  END IF;

  -- Email
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'email'
  ) THEN
    ALTER TABLE businesses ADD COLUMN email text;
  END IF;

  -- Website (different from website_url)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'website'
  ) THEN
    ALTER TABLE businesses ADD COLUMN website text;
  END IF;

  -- Description
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'description'
  ) THEN
    ALTER TABLE businesses ADD COLUMN description text;
  END IF;

  -- Tagline
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'tagline'
  ) THEN
    ALTER TABLE businesses ADD COLUMN tagline text;
  END IF;

  -- Video URL
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'video_url'
  ) THEN
    ALTER TABLE businesses ADD COLUMN video_url text;
  END IF;

  -- Problem solved
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'problem_solved'
  ) THEN
    ALTER TABLE businesses ADD COLUMN problem_solved text;
  END IF;

  -- Main offer type
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'main_offer_type'
  ) THEN
    ALTER TABLE businesses ADD COLUMN main_offer_type text;
  END IF;

  -- Unique value
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'unique_value'
  ) THEN
    ALTER TABLE businesses ADD COLUMN unique_value text;
  END IF;

  -- Partnership type
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'partnership_type'
  ) THEN
    ALTER TABLE businesses ADD COLUMN partnership_type text;
  END IF;

  -- Commission rate
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'commission_rate'
  ) THEN
    ALTER TABLE businesses ADD COLUMN commission_rate text;
  END IF;

  -- Requirements
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'requirements'
  ) THEN
    ALTER TABLE businesses ADD COLUMN requirements text;
  END IF;

  -- Monetization type
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'monetization_type'
  ) THEN
    ALTER TABLE businesses ADD COLUMN monetization_type text;
  END IF;

  -- Cross promotion preference
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'cross_promotion_preference'
  ) THEN
    ALTER TABLE businesses ADD COLUMN cross_promotion_preference text;
  END IF;

  -- Founder name
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'founder_name'
  ) THEN
    ALTER TABLE businesses ADD COLUMN founder_name text;
  END IF;

  -- Founder bio
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'founder_bio'
  ) THEN
    ALTER TABLE businesses ADD COLUMN founder_bio text;
  END IF;

  -- Founder background
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'founder_background'
  ) THEN
    ALTER TABLE businesses ADD COLUMN founder_background text;
  END IF;

  -- Founder why started
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'founder_why_started'
  ) THEN
    ALTER TABLE businesses ADD COLUMN founder_why_started text;
  END IF;

  -- Founder headshot URL
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'founder_headshot_url'
  ) THEN
    ALTER TABLE businesses ADD COLUMN founder_headshot_url text;
  END IF;

  -- Social audience size
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'social_audience_size'
  ) THEN
    ALTER TABLE businesses ADD COLUMN social_audience_size text;
  END IF;

  -- Email open rate
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'email_open_rate'
  ) THEN
    ALTER TABLE businesses ADD COLUMN email_open_rate text;
  END IF;

  -- Number of offers
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'number_of_offers'
  ) THEN
    ALTER TABLE businesses ADD COLUMN number_of_offers text;
  END IF;

  -- Logo URL
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'logo_url'
  ) THEN
    ALTER TABLE businesses ADD COLUMN logo_url text;
  END IF;

  -- Featured flag
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'featured'
  ) THEN
    ALTER TABLE businesses ADD COLUMN featured boolean DEFAULT false;
  END IF;

  -- Partnership opportunities (array)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'partnership_opportunities'
  ) THEN
    ALTER TABLE businesses ADD COLUMN partnership_opportunities text[];
  END IF;

  -- Looking for (array)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'looking_for'
  ) THEN
    ALTER TABLE businesses ADD COLUMN looking_for text[];
  END IF;

  -- Primary offers (JSONB for structured data)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'primary_offers'
  ) THEN
    ALTER TABLE businesses ADD COLUMN primary_offers jsonb;
  END IF;
END $$;
/*
  # Fix Security and Performance Issues
  
  ## Overview
  This migration addresses security warnings and performance issues identified in the database.
  
  ## Changes
  
  1. **Add Missing Indexes for Foreign Keys**
     - Add indexes for all foreign keys that don't have covering indexes
     - Improves query performance for joins and foreign key lookups
  
  2. **Optimize RLS Policies**
     - Replace `auth.uid()` with `(select auth.uid())` in all RLS policies
     - Prevents re-evaluation of auth function for each row
     - Significantly improves query performance at scale
  
  3. **Consolidate Duplicate Policies**
     - Remove duplicate permissive policies where they overlap
     - Keeps the more comprehensive policy
  
  ## Tables Affected
  - users, businesses, connections, connection_notes
  - offers, user_offers, partner_tasks, call_click_logs
  - calls, favorites, offer_vault, messages, notifications
  
  ## Security
  - All existing RLS protections are maintained
  - Performance improvements do not compromise security
*/

-- ============================================================================
-- PART 1: Add Missing Indexes for Foreign Keys
-- ============================================================================

-- Indexes for call_click_logs
CREATE INDEX IF NOT EXISTS idx_call_click_logs_clicked_by ON call_click_logs(clicked_by_user_id);
CREATE INDEX IF NOT EXISTS idx_call_click_logs_connection ON call_click_logs(connection_id);

-- Indexes for calls
CREATE INDEX IF NOT EXISTS idx_calls_connection ON calls(connection_id);
CREATE INDEX IF NOT EXISTS idx_calls_user ON calls(user_id);

-- Indexes for connection_notes
CREATE INDEX IF NOT EXISTS idx_connection_notes_connection ON connection_notes(connection_id);
CREATE INDEX IF NOT EXISTS idx_connection_notes_user ON connection_notes(user_id);

-- Indexes for partner_tasks (connection_id not indexed yet)
CREATE INDEX IF NOT EXISTS idx_partner_tasks_connection ON partner_tasks(connection_id);

-- Indexes for user_offers (offer_id not indexed yet)
CREATE INDEX IF NOT EXISTS idx_user_offers_offer ON user_offers(offer_id);

-- Indexes for messages (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'messages') THEN
    CREATE INDEX IF NOT EXISTS idx_messages_connection ON messages(connection_id);
  END IF;
END $$;

-- ============================================================================
-- PART 2: Optimize RLS Policies - Drop and Recreate with Optimized auth.uid()
-- ============================================================================

-- Users table policies
DROP POLICY IF EXISTS "Users can read own data" ON users;
CREATE POLICY "Users can read own data"
  ON users FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = id);

DROP POLICY IF EXISTS "Users can update own data" ON users;
CREATE POLICY "Users can update own data"
  ON users FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);

DROP POLICY IF EXISTS "Users can insert own data" ON users;
CREATE POLICY "Users can insert own data"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = id);

-- ============================================================================
-- Businesses table policies
-- ============================================================================

-- Drop old policies
DROP POLICY IF EXISTS "Users can read published business profiles" ON businesses;
DROP POLICY IF EXISTS "Users can manage own business" ON businesses;

-- Create consolidated optimized policies
CREATE POLICY "Users can read published business profiles"
  ON businesses FOR SELECT
  TO authenticated
  USING (is_profile_published = true OR owner_user_id = (select auth.uid()));

CREATE POLICY "Users can insert own business"
  ON businesses FOR INSERT
  TO authenticated
  WITH CHECK (owner_user_id = (select auth.uid()));

CREATE POLICY "Users can update own business"
  ON businesses FOR UPDATE
  TO authenticated
  USING (owner_user_id = (select auth.uid()))
  WITH CHECK (owner_user_id = (select auth.uid()));

CREATE POLICY "Users can delete own business"
  ON businesses FOR DELETE
  TO authenticated
  USING (owner_user_id = (select auth.uid()));

-- ============================================================================
-- Connections table policies
-- ============================================================================

DROP POLICY IF EXISTS "Users can read their connections" ON connections;
CREATE POLICY "Users can read their connections"
  ON connections FOR SELECT
  TO authenticated
  USING (requester_user_id = (select auth.uid()) OR recipient_user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can create connections" ON connections;
CREATE POLICY "Users can create connections"
  ON connections FOR INSERT
  TO authenticated
  WITH CHECK (requester_user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update their connections" ON connections;
CREATE POLICY "Users can update their connections"
  ON connections FOR UPDATE
  TO authenticated
  USING (requester_user_id = (select auth.uid()) OR recipient_user_id = (select auth.uid()))
  WITH CHECK (requester_user_id = (select auth.uid()) OR recipient_user_id = (select auth.uid()));

-- ============================================================================
-- Connection notes table policies
-- ============================================================================

DROP POLICY IF EXISTS "Users can read notes for their connections" ON connection_notes;
CREATE POLICY "Users can read notes for their connections"
  ON connection_notes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM connections
      WHERE connections.id = connection_notes.connection_id
      AND (connections.requester_user_id = (select auth.uid()) OR connections.recipient_user_id = (select auth.uid()))
    )
  );

DROP POLICY IF EXISTS "Users can create notes for their connections" ON connection_notes;
CREATE POLICY "Users can create notes for their connections"
  ON connection_notes FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = (select auth.uid()) AND
    EXISTS (
      SELECT 1 FROM connections
      WHERE connections.id = connection_notes.connection_id
      AND (connections.requester_user_id = (select auth.uid()) OR connections.recipient_user_id = (select auth.uid()))
    )
  );

-- ============================================================================
-- Offers table policies
-- ============================================================================

DROP POLICY IF EXISTS "Users can read active offers from published businesses" ON offers;
DROP POLICY IF EXISTS "Business owners can manage their offers" ON offers;

CREATE POLICY "Users can read active offers from published businesses"
  ON offers FOR SELECT
  TO authenticated
  USING (
    is_active = true AND
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = offers.business_id
      AND (businesses.is_profile_published = true OR businesses.owner_user_id = (select auth.uid()))
    )
  );

CREATE POLICY "Business owners can insert their offers"
  ON offers FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = offers.business_id
      AND businesses.owner_user_id = (select auth.uid())
    )
  );

CREATE POLICY "Business owners can update their offers"
  ON offers FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = offers.business_id
      AND businesses.owner_user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = offers.business_id
      AND businesses.owner_user_id = (select auth.uid())
    )
  );

CREATE POLICY "Business owners can delete their offers"
  ON offers FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = offers.business_id
      AND businesses.owner_user_id = (select auth.uid())
    )
  );

-- ============================================================================
-- User offers table policies
-- ============================================================================

DROP POLICY IF EXISTS "Users can read own offer vault" ON user_offers;
DROP POLICY IF EXISTS "Users can manage own offer vault" ON user_offers;

CREATE POLICY "Users can read own offer vault"
  ON user_offers FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own offer vault"
  ON user_offers FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own offer vault"
  ON user_offers FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own offer vault"
  ON user_offers FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- ============================================================================
-- Partner tasks table policies
-- ============================================================================

DROP POLICY IF EXISTS "Users can read own tasks" ON partner_tasks;
DROP POLICY IF EXISTS "Users can manage own tasks" ON partner_tasks;

CREATE POLICY "Users can read own tasks"
  ON partner_tasks FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own tasks"
  ON partner_tasks FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own tasks"
  ON partner_tasks FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own tasks"
  ON partner_tasks FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- ============================================================================
-- Call click logs table policies
-- ============================================================================

DROP POLICY IF EXISTS "Users can read own call clicks" ON call_click_logs;
CREATE POLICY "Users can read own call clicks"
  ON call_click_logs FOR SELECT
  TO authenticated
  USING (clicked_by_user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can log own call clicks" ON call_click_logs;
CREATE POLICY "Users can log own call clicks"
  ON call_click_logs FOR INSERT
  TO authenticated
  WITH CHECK (clicked_by_user_id = (select auth.uid()));

-- ============================================================================
-- Calls table policies
-- ============================================================================

DROP POLICY IF EXISTS "Users can read calls for their connections" ON calls;
DROP POLICY IF EXISTS "Users can manage calls for their connections" ON calls;

CREATE POLICY "Users can read calls for their connections"
  ON calls FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM connections
      WHERE connections.id = calls.connection_id
      AND (connections.requester_user_id = (select auth.uid()) OR connections.recipient_user_id = (select auth.uid()))
    )
  );

CREATE POLICY "Users can insert calls for their connections"
  ON calls FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = (select auth.uid()) AND
    EXISTS (
      SELECT 1 FROM connections
      WHERE connections.id = calls.connection_id
      AND (connections.requester_user_id = (select auth.uid()) OR connections.recipient_user_id = (select auth.uid()))
    )
  );

CREATE POLICY "Users can update calls for their connections"
  ON calls FOR UPDATE
  TO authenticated
  USING (
    user_id = (select auth.uid()) AND
    EXISTS (
      SELECT 1 FROM connections
      WHERE connections.id = calls.connection_id
      AND (connections.requester_user_id = (select auth.uid()) OR connections.recipient_user_id = (select auth.uid()))
    )
  )
  WITH CHECK (
    user_id = (select auth.uid()) AND
    EXISTS (
      SELECT 1 FROM connections
      WHERE connections.id = calls.connection_id
      AND (connections.requester_user_id = (select auth.uid()) OR connections.recipient_user_id = (select auth.uid()))
    )
  );

CREATE POLICY "Users can delete calls for their connections"
  ON calls FOR DELETE
  TO authenticated
  USING (
    user_id = (select auth.uid()) AND
    EXISTS (
      SELECT 1 FROM connections
      WHERE connections.id = calls.connection_id
      AND (connections.requester_user_id = (select auth.uid()) OR connections.recipient_user_id = (select auth.uid()))
    )
  );

-- ============================================================================
-- Favorites table policies (if exists)
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'favorites') THEN
    DROP POLICY IF EXISTS "Users can read own favorites" ON favorites;
    CREATE POLICY "Users can read own favorites"
      ON favorites FOR SELECT
      TO authenticated
      USING (user_id = (select auth.uid()));

    DROP POLICY IF EXISTS "Users can create own favorites" ON favorites;
    CREATE POLICY "Users can create own favorites"
      ON favorites FOR INSERT
      TO authenticated
      WITH CHECK (user_id = (select auth.uid()));

    DROP POLICY IF EXISTS "Users can delete own favorites" ON favorites;
    CREATE POLICY "Users can delete own favorites"
      ON favorites FOR DELETE
      TO authenticated
      USING (user_id = (select auth.uid()));
  END IF;
END $$;

-- ============================================================================
-- Offer vault table policies (if exists)
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'offer_vault') THEN
    DROP POLICY IF EXISTS "Users can view own vault entries" ON offer_vault;
    CREATE POLICY "Users can view own vault entries"
      ON offer_vault FOR SELECT
      TO authenticated
      USING (user_id = (select auth.uid()));

    DROP POLICY IF EXISTS "Users can insert own vault entries" ON offer_vault;
    CREATE POLICY "Users can insert own vault entries"
      ON offer_vault FOR INSERT
      TO authenticated
      WITH CHECK (user_id = (select auth.uid()));

    DROP POLICY IF EXISTS "Users can update own vault entries" ON offer_vault;
    CREATE POLICY "Users can update own vault entries"
      ON offer_vault FOR UPDATE
      TO authenticated
      USING (user_id = (select auth.uid()))
      WITH CHECK (user_id = (select auth.uid()));

    DROP POLICY IF EXISTS "Users can delete own vault entries" ON offer_vault;
    CREATE POLICY "Users can delete own vault entries"
      ON offer_vault FOR DELETE
      TO authenticated
      USING (user_id = (select auth.uid()));
  END IF;
END $$;

-- ============================================================================
-- Messages table policies (if exists)
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'messages') THEN
    DROP POLICY IF EXISTS "Users can view messages they sent or received" ON messages;
    CREATE POLICY "Users can view messages they sent or received"
      ON messages FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM connections
          WHERE connections.id = messages.connection_id
          AND (connections.requester_user_id = (select auth.uid()) OR connections.recipient_user_id = (select auth.uid()))
        )
      );

    DROP POLICY IF EXISTS "Users can send messages to accepted connections" ON messages;
    CREATE POLICY "Users can send messages to accepted connections"
      ON messages FOR INSERT
      TO authenticated
      WITH CHECK (
        sender_id = (select auth.uid()) AND
        EXISTS (
          SELECT 1 FROM connections
          WHERE connections.id = messages.connection_id
          AND connections.status = 'accepted'
          AND (connections.requester_user_id = (select auth.uid()) OR connections.recipient_user_id = (select auth.uid()))
        )
      );

    DROP POLICY IF EXISTS "Users can mark their received messages as read" ON messages;
    CREATE POLICY "Users can mark their received messages as read"
      ON messages FOR UPDATE
      TO authenticated
      USING (recipient_id = (select auth.uid()))
      WITH CHECK (recipient_id = (select auth.uid()));
  END IF;
END $$;

-- ============================================================================
-- Notifications table policies (if exists)
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') THEN
    DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
    CREATE POLICY "Users can view own notifications"
      ON notifications FOR SELECT
      TO authenticated
      USING (user_id = (select auth.uid()));

    DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
    CREATE POLICY "Users can update own notifications"
      ON notifications FOR UPDATE
      TO authenticated
      USING (user_id = (select auth.uid()))
      WITH CHECK (user_id = (select auth.uid()));

    DROP POLICY IF EXISTS "Users can delete own notifications" ON notifications;
    CREATE POLICY "Users can delete own notifications"
      ON notifications FOR DELETE
      TO authenticated
      USING (user_id = (select auth.uid()));
  END IF;
END $$;
/*
  # Add Phone Fields to Users Table
  
  ## Overview
  Add phone number fields to support international phone numbers with SMS capabilities.
  
  ## Changes
  
  1. **New Columns in users table**
     - `sms_country_iso` - Two-letter ISO country code (e.g., US, GB, CA)
     - `sms_country_code` - International dialing code (e.g., +1, +44)
     - `sms_phone_national` - National phone number format
     - `sms_phone_e164` - E.164 international format (full number with country code)
     - `sms_can_send` - Boolean flag indicating if SMS can be sent (true only for US)
  
  ## Security
  - No RLS changes needed as users table already has proper RLS policies
*/

-- Add phone fields to users table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'sms_country_iso'
  ) THEN
    ALTER TABLE users ADD COLUMN sms_country_iso text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'sms_country_code'
  ) THEN
    ALTER TABLE users ADD COLUMN sms_country_code text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'sms_phone_national'
  ) THEN
    ALTER TABLE users ADD COLUMN sms_phone_national text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'sms_phone_e164'
  ) THEN
    ALTER TABLE users ADD COLUMN sms_phone_e164 text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'sms_can_send'
  ) THEN
    ALTER TABLE users ADD COLUMN sms_can_send boolean DEFAULT false;
  END IF;
END $$;
/*
  # Add Extended Business Profile Fields
  
  ## Overview
  This migration adds all the remaining fields required for a complete business profile,
  including business address, contact information, financial metrics, and user details.
  
  ## Changes
  
  ### 1. New Columns in businesses table
  **Business Address (Not visible to public)**
  - `business_street_address` - Street address of the business
  - `business_city` - City
  - `business_state` - State/Province
  - `business_zipcode` - Postal/Zip code
  
  **Contact Information (Not visible to public initially)**
  - `business_phone` - Main business phone number
  - `linkedin_url` - LinkedIn profile/page URL
  - `twitter_url` - Twitter/X profile URL
  - `facebook_url` - Facebook page URL
  - `instagram_url` - Instagram profile URL
  
  **Business Metrics**
  - `years_in_business` - How many years the business has been operating
  - `payment_methods` - Array of accepted payment methods
  - `detailed_services` - Detailed description of services/products offered
  - `average_sale_size` - Typical transaction/sale amount
  - `approximate_annual_revenue` - Private field for understanding userbase
  
  ### 2. New Columns in users table
  - `title` - User's job title/position at the company
  - `residential_zipcode` - Private field for location-based partner matching
  - `headshot_url` - Professional headshot photo URL
  
  ## Privacy Notes
  - `approximate_annual_revenue` is PRIVATE (not visible to other users)
  - `residential_zipcode` is PRIVATE (used only for radius-based networking)
  - Business address fields are NOT publicly visible
  - Social media URLs are NOT publicly visible initially
  
  ## Security
  - All fields are nullable to allow gradual completion
  - Existing RLS policies apply to new fields
  - No new policies needed as access control remains the same
*/

-- Add fields to businesses table
DO $$
BEGIN
  -- Business address fields
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'business_street_address'
  ) THEN
    ALTER TABLE businesses ADD COLUMN business_street_address text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'business_city'
  ) THEN
    ALTER TABLE businesses ADD COLUMN business_city text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'business_state'
  ) THEN
    ALTER TABLE businesses ADD COLUMN business_state text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'business_zipcode'
  ) THEN
    ALTER TABLE businesses ADD COLUMN business_zipcode text;
  END IF;

  -- Contact information
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'business_phone'
  ) THEN
    ALTER TABLE businesses ADD COLUMN business_phone text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'linkedin_url'
  ) THEN
    ALTER TABLE businesses ADD COLUMN linkedin_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'twitter_url'
  ) THEN
    ALTER TABLE businesses ADD COLUMN twitter_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'facebook_url'
  ) THEN
    ALTER TABLE businesses ADD COLUMN facebook_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'instagram_url'
  ) THEN
    ALTER TABLE businesses ADD COLUMN instagram_url text;
  END IF;

  -- Business metrics
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'years_in_business'
  ) THEN
    ALTER TABLE businesses ADD COLUMN years_in_business integer;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'payment_methods'
  ) THEN
    ALTER TABLE businesses ADD COLUMN payment_methods text[];
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'detailed_services'
  ) THEN
    ALTER TABLE businesses ADD COLUMN detailed_services text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'average_sale_size'
  ) THEN
    ALTER TABLE businesses ADD COLUMN average_sale_size text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'approximate_annual_revenue'
  ) THEN
    ALTER TABLE businesses ADD COLUMN approximate_annual_revenue text;
  END IF;
END $$;

-- Add fields to users table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'title'
  ) THEN
    ALTER TABLE users ADD COLUMN title text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'residential_zipcode'
  ) THEN
    ALTER TABLE users ADD COLUMN residential_zipcode text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'headshot_url'
  ) THEN
    ALTER TABLE users ADD COLUMN headshot_url text;
  END IF;
END $$;/*
  # Security Improvements: Remove Unused Indexes

  ## Overview
  This migration improves database performance by removing unused indexes that:
  - Consume storage space unnecessarily
  - Slow down INSERT, UPDATE, and DELETE operations
  - Provide no query performance benefit

  ## Changes

  ### Remove Unused Indexes
  The following indexes have been identified as unused and will be dropped:

  1. **call_click_logs table**
     - `idx_call_click_logs_clicked_by`
     - `idx_call_click_logs_connection`

  2. **calls table**
     - `idx_calls_connection`
     - `idx_calls_user`

  3. **connection_notes table**
     - `idx_connection_notes_connection`
     - `idx_connection_notes_user`

  4. **partner_tasks table**
     - `idx_partner_tasks_connection`
     - `idx_partner_tasks_due`

  5. **user_offers table**
     - `idx_user_offers_offer`

  6. **messages table**
     - `idx_messages_connection`
     - `idx_messages_thread`
     - `idx_messages_sender`
     - `idx_messages_recipient`
     - `idx_messages_unread`

  7. **offers table**
     - `idx_offers_business`

  8. **favorites table**
     - `idx_favorites_user`
     - `idx_favorites_partnership`

  9. **offer_vault table**
     - `idx_offer_vault_user_id`
     - `idx_offer_vault_user_business`

  10. **notifications table**
      - `idx_notifications_user`
      - `idx_notifications_unread`
      - `idx_notifications_created`

  ## Performance Impact
  - Improved write performance on affected tables
  - Reduced storage overhead
  - No negative impact on query performance (indexes were not being used)

  ## Security Notes
  - If any of these indexes are needed in the future, they can be recreated
  - Monitor query performance after deployment
*/

-- Drop unused indexes on call_click_logs table
DROP INDEX IF EXISTS idx_call_click_logs_clicked_by;
DROP INDEX IF EXISTS idx_call_click_logs_connection;

-- Drop unused indexes on calls table
DROP INDEX IF EXISTS idx_calls_connection;
DROP INDEX IF EXISTS idx_calls_user;

-- Drop unused indexes on connection_notes table
DROP INDEX IF EXISTS idx_connection_notes_connection;
DROP INDEX IF EXISTS idx_connection_notes_user;

-- Drop unused indexes on partner_tasks table
DROP INDEX IF EXISTS idx_partner_tasks_connection;
DROP INDEX IF EXISTS idx_partner_tasks_due;

-- Drop unused indexes on user_offers table
DROP INDEX IF EXISTS idx_user_offers_offer;

-- Drop unused indexes on messages table
DROP INDEX IF EXISTS idx_messages_connection;
DROP INDEX IF EXISTS idx_messages_thread;
DROP INDEX IF EXISTS idx_messages_sender;
DROP INDEX IF EXISTS idx_messages_recipient;
DROP INDEX IF EXISTS idx_messages_unread;

-- Drop unused indexes on offers table
DROP INDEX IF EXISTS idx_offers_business;

-- Drop unused indexes on favorites table
DROP INDEX IF EXISTS idx_favorites_user;
DROP INDEX IF EXISTS idx_favorites_partnership;

-- Drop unused indexes on offer_vault table
DROP INDEX IF EXISTS idx_offer_vault_user_id;
DROP INDEX IF EXISTS idx_offer_vault_user_business;

-- Drop unused indexes on notifications table
DROP INDEX IF EXISTS idx_notifications_user;
DROP INDEX IF EXISTS idx_notifications_unread;
DROP INDEX IF EXISTS idx_notifications_created;
/*
  # Swap Partnership Fields and Convert Types

  ## Overview
  This migration swaps the usage of partnership fields to better align with user needs.
  The "Looking For" field becomes free text for specificity, while "Partnership Opportunities"
  becomes a structured list.

  ## Changes Made

  1. **Convert partnership_opportunities from array to text**
     - Changes `partnership_opportunities` from text[] to text (free text field)
     - Preserves existing data by converting arrays to comma-separated strings
     - This field will now display under "Looking For" label in the UI

  2. **Keep looking_for as array**
     - Remains as text[] (no changes to structure)
     - This field will now display under "Partnership Opportunities" label in the UI

  ## Field Mapping After Migration
  - Database field `partnership_opportunities` (text) → UI label "Looking For"
  - Database field `looking_for` (text[]) → UI label "Partnership Opportunities"

  ## Data Preservation
  - All existing array data in partnership_opportunities is converted to comma-separated text
  - No data loss occurs during this migration
  - Rollback is possible by recreating the array from comma-separated values

  ## Security
  - RLS policies remain unchanged
  - No new security considerations
*/

-- Step 1: Create a temporary column to hold the converted data
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS partnership_opportunities_temp text;

-- Step 2: Convert existing partnership_opportunities array data to comma-separated text
UPDATE businesses
SET partnership_opportunities_temp = array_to_string(partnership_opportunities, ', ')
WHERE partnership_opportunities IS NOT NULL AND array_length(partnership_opportunities, 1) > 0;

-- Step 3: Drop the old array column
ALTER TABLE businesses DROP COLUMN IF EXISTS partnership_opportunities;

-- Step 4: Rename the temp column to the original name
ALTER TABLE businesses RENAME COLUMN partnership_opportunities_temp TO partnership_opportunities;

-- Add comment to document the field's new purpose
COMMENT ON COLUMN businesses.partnership_opportunities IS 'Free text field describing what the business is looking for in partners. Displayed under "Looking For" label in UI.';
COMMENT ON COLUMN businesses.looking_for IS 'Array of partnership opportunity types offered by the business. Displayed under "Partnership Opportunities" label in UI.';
/*
  # Create CRM Cards Table for Partner Management

  1. New Tables
    - `crm_cards`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users) - The user who owns this CRM card
      - `partner_user_id` (uuid, references auth.users) - The partner being tracked
      - `partner_business_id` (uuid, references businesses) - The partner's business
      - `connection_id` (uuid, references connections) - Link to connection record
      - `stage` (text) - Current pipeline stage
      - `company_name` (text) - Cached partner company name
      - `partner_name` (text) - Cached partner name
      - `profile_image_url` (text, nullable) - Cached partner profile image
      - `last_message_preview` (text, nullable) - Preview of last message
      - `last_message_at` (timestamptz, nullable) - Timestamp of last message
      - `notes` (text, nullable) - User's private notes about this partner
      - `tags` (text[], default empty array) - Custom tags
      - `metadata` (jsonb, default {}) - Flexible metadata storage
      - `created_at` (timestamptz, default now())
      - `updated_at` (timestamptz, default now())

  2. Security
    - Enable RLS on `crm_cards` table
    - Users can only access their own CRM cards
    - Add policies for CRUD operations

  3. Indexes
    - Index on user_id for fast lookups
    - Index on stage for filtering
    - Index on connection_id for joins

  4. Valid Pipeline Stages
    - Connection Pending
    - Connected
    - Booked Call
    - Call Completed
    - Pending Agreement
    - Scheduled Collaboration
    - Generating Revenue
    - Inactive
*/

-- Create CRM cards table
CREATE TABLE IF NOT EXISTS crm_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  partner_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  partner_business_id uuid REFERENCES businesses(id) ON DELETE CASCADE,
  connection_id uuid REFERENCES connections(id) ON DELETE CASCADE,
  stage text NOT NULL DEFAULT 'Connection Pending',
  company_name text NOT NULL DEFAULT '',
  partner_name text NOT NULL DEFAULT '',
  profile_image_url text,
  last_message_preview text,
  last_message_at timestamptz,
  notes text DEFAULT '',
  tags text[] DEFAULT '{}',
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT valid_stage CHECK (
    stage IN (
      'Connection Pending',
      'Connected',
      'Booked Call',
      'Call Completed',
      'Pending Agreement',
      'Scheduled Collaboration',
      'Generating Revenue',
      'Inactive'
    )
  ),
  CONSTRAINT unique_user_partner UNIQUE (user_id, partner_user_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_crm_cards_user_id ON crm_cards(user_id);
CREATE INDEX IF NOT EXISTS idx_crm_cards_stage ON crm_cards(stage);
CREATE INDEX IF NOT EXISTS idx_crm_cards_connection_id ON crm_cards(connection_id);
CREATE INDEX IF NOT EXISTS idx_crm_cards_partner_user_id ON crm_cards(partner_user_id);

-- Enable RLS
ALTER TABLE crm_cards ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own CRM cards"
  ON crm_cards FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own CRM cards"
  ON crm_cards FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own CRM cards"
  ON crm_cards FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own CRM cards"
  ON crm_cards FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_crm_cards_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at
CREATE TRIGGER update_crm_cards_timestamp
  BEFORE UPDATE ON crm_cards
  FOR EACH ROW
  EXECUTE FUNCTION update_crm_cards_updated_at();

-- Function to automatically create CRM card when connection is created
CREATE OR REPLACE FUNCTION create_crm_card_on_connection()
RETURNS TRIGGER AS $$
BEGIN
  -- Create CRM card for requester
  INSERT INTO crm_cards (
    user_id,
    partner_user_id,
    connection_id,
    stage,
    company_name,
    partner_name
  )
  SELECT
    NEW.requester_user_id,
    NEW.recipient_user_id,
    NEW.id,
    'Connection Pending',
    COALESCE(b.company_name, ''),
    COALESCE(u.full_name, u.email, '')
  FROM auth.users u
  LEFT JOIN businesses b ON b.owner_user_id = u.id
  WHERE u.id = NEW.recipient_user_id
  ON CONFLICT (user_id, partner_user_id) DO UPDATE
    SET connection_id = NEW.id,
        stage = 'Connection Pending';

  -- Create CRM card for recipient
  INSERT INTO crm_cards (
    user_id,
    partner_user_id,
    connection_id,
    stage,
    company_name,
    partner_name
  )
  SELECT
    NEW.recipient_user_id,
    NEW.requester_user_id,
    NEW.id,
    'Connection Pending',
    COALESCE(b.company_name, ''),
    COALESCE(u.full_name, u.email, '')
  FROM auth.users u
  LEFT JOIN businesses b ON b.owner_user_id = u.id
  WHERE u.id = NEW.requester_user_id
  ON CONFLICT (user_id, partner_user_id) DO UPDATE
    SET connection_id = NEW.id,
        stage = 'Connection Pending';

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create CRM cards when connection is created
DROP TRIGGER IF EXISTS create_crm_card_on_connection_trigger ON connections;
CREATE TRIGGER create_crm_card_on_connection_trigger
  AFTER INSERT ON connections
  FOR EACH ROW
  EXECUTE FUNCTION create_crm_card_on_connection();

-- Function to automatically move CRM card to "Connected" when connection is accepted
CREATE OR REPLACE FUNCTION update_crm_card_on_connection_accept()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'accepted' AND OLD.status != 'accepted' THEN
    -- Update both users' CRM cards
    UPDATE crm_cards
    SET stage = 'Connected',
        updated_at = now()
    WHERE connection_id = NEW.id
      AND stage = 'Connection Pending';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update CRM cards when connection is accepted
DROP TRIGGER IF EXISTS update_crm_card_on_connection_accept_trigger ON connections;
CREATE TRIGGER update_crm_card_on_connection_accept_trigger
  AFTER UPDATE ON connections
  FOR EACH ROW
  EXECUTE FUNCTION update_crm_card_on_connection_accept();
/*
  # Stripe Integration Schema

  1. New Tables
    - `stripe_customers`: Links Supabase users to Stripe customers
      - Includes `user_id` (references `auth.users`)
      - Stores Stripe `customer_id`
      - Implements soft delete

    - `stripe_subscriptions`: Manages subscription data
      - Tracks subscription status, periods, and payment details
      - Links to `stripe_customers` via `customer_id`
      - Custom enum type for subscription status
      - Implements soft delete

    - `stripe_orders`: Stores order/purchase information
      - Records checkout sessions and payment intents
      - Tracks payment amounts and status
      - Custom enum type for order status
      - Implements soft delete

  2. Views
    - `stripe_user_subscriptions`: Secure view for user subscription data
      - Joins customers and subscriptions
      - Filtered by authenticated user

    - `stripe_user_orders`: Secure view for user order history
      - Joins customers and orders
      - Filtered by authenticated user

  3. Security
    - Enables Row Level Security (RLS) on all tables
    - Implements policies for authenticated users to view their own data
*/

CREATE TABLE IF NOT EXISTS stripe_customers (
  id bigint primary key generated always as identity,
  user_id uuid references auth.users(id) not null unique,
  customer_id text not null unique,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  deleted_at timestamp with time zone default null
);

ALTER TABLE stripe_customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own customer data"
    ON stripe_customers
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid() AND deleted_at IS NULL);

CREATE TYPE stripe_subscription_status AS ENUM (
    'not_started',
    'incomplete',
    'incomplete_expired',
    'trialing',
    'active',
    'past_due',
    'canceled',
    'unpaid',
    'paused'
);

CREATE TABLE IF NOT EXISTS stripe_subscriptions (
  id bigint primary key generated always as identity,
  customer_id text unique not null,
  subscription_id text default null,
  price_id text default null,
  current_period_start bigint default null,
  current_period_end bigint default null,
  cancel_at_period_end boolean default false,
  payment_method_brand text default null,
  payment_method_last4 text default null,
  status stripe_subscription_status not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  deleted_at timestamp with time zone default null
);

ALTER TABLE stripe_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own subscription data"
    ON stripe_subscriptions
    FOR SELECT
    TO authenticated
    USING (
        customer_id IN (
            SELECT customer_id
            FROM stripe_customers
            WHERE user_id = auth.uid() AND deleted_at IS NULL
        )
        AND deleted_at IS NULL
    );

CREATE TYPE stripe_order_status AS ENUM (
    'pending',
    'completed',
    'canceled'
);

CREATE TABLE IF NOT EXISTS stripe_orders (
    id bigint primary key generated always as identity,
    checkout_session_id text not null,
    payment_intent_id text not null,
    customer_id text not null,
    amount_subtotal bigint not null,
    amount_total bigint not null,
    currency text not null,
    payment_status text not null,
    status stripe_order_status not null default 'pending',
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now(),
    deleted_at timestamp with time zone default null
);

ALTER TABLE stripe_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own order data"
    ON stripe_orders
    FOR SELECT
    TO authenticated
    USING (
        customer_id IN (
            SELECT customer_id
            FROM stripe_customers
            WHERE user_id = auth.uid() AND deleted_at IS NULL
        )
        AND deleted_at IS NULL
    );

-- View for user subscriptions
CREATE VIEW stripe_user_subscriptions WITH (security_invoker = true) AS
SELECT
    c.customer_id,
    s.subscription_id,
    s.status as subscription_status,
    s.price_id,
    s.current_period_start,
    s.current_period_end,
    s.cancel_at_period_end,
    s.payment_method_brand,
    s.payment_method_last4
FROM stripe_customers c
LEFT JOIN stripe_subscriptions s ON c.customer_id = s.customer_id
WHERE c.user_id = auth.uid()
AND c.deleted_at IS NULL
AND s.deleted_at IS NULL;

GRANT SELECT ON stripe_user_subscriptions TO authenticated;

-- View for user orders
CREATE VIEW stripe_user_orders WITH (security_invoker) AS
SELECT
    c.customer_id,
    o.id as order_id,
    o.checkout_session_id,
    o.payment_intent_id,
    o.amount_subtotal,
    o.amount_total,
    o.currency,
    o.payment_status,
    o.status as order_status,
    o.created_at as order_date
FROM stripe_customers c
LEFT JOIN stripe_orders o ON c.customer_id = o.customer_id
WHERE c.user_id = auth.uid()
AND c.deleted_at IS NULL
AND o.deleted_at IS NULL;/*
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
/*
  # Add Remaining Foreign Key Indexes

  ## Changes Made

  ### Add Missing Foreign Key Indexes
  
  Adding indexes for foreign keys that were missed in the previous migration:
  - `connections`: recipient_user_id, requester_user_id
  - `crm_cards`: connection_id, partner_user_id

  ## Notes
  
  - The previously created indexes showing as "unused" are expected - they haven't been 
    queried yet but will be used as the application runs
  - These indexes are critical for query performance and should NOT be removed
  - Foreign key indexes significantly improve JOIN performance and foreign key constraint checks
*/

-- =====================================================
-- ADD MISSING FOREIGN KEY INDEXES
-- =====================================================

-- connections table indexes
CREATE INDEX IF NOT EXISTS idx_connections_recipient_user_id 
  ON connections(recipient_user_id);

CREATE INDEX IF NOT EXISTS idx_connections_requester_user_id 
  ON connections(requester_user_id);

-- crm_cards table indexes
CREATE INDEX IF NOT EXISTS idx_crm_cards_connection_id_fk 
  ON crm_cards(connection_id);

CREATE INDEX IF NOT EXISTS idx_crm_cards_partner_user_id_fk 
  ON crm_cards(partner_user_id);
/*
  # Add Missing Foreign Key Indexes

  ## Changes Made

  ### 1. Add Missing Foreign Key Indexes
  These indexes were previously removed but are needed for optimal foreign key query performance.
  
  New indexes added for:
  - `connections`: recipient_user_id, requester_user_id
  - `crm_cards`: connection_id, partner_user_id

  ## Important Notes
  
  ### About "Unused" Indexes
  The system reports many indexes as "unused" because:
  - They are newly created and haven't been exercised by queries yet
  - The database is in development/testing phase
  - These indexes ARE necessary for foreign key performance in production
  
  DO NOT remove indexes on foreign key columns. They are critical for:
  - JOIN operations performance
  - CASCADE delete/update operations
  - Preventing table locks during foreign key checks
  
  ### Leaked Password Protection
  This security feature must be enabled manually through the Supabase Dashboard:
  1. Navigate to: Authentication → Settings
  2. Enable: "Leaked Password Protection"
  3. This prevents users from using passwords found in breach databases
*/

-- =====================================================
-- ADD MISSING FOREIGN KEY INDEXES
-- =====================================================

-- connections table indexes
CREATE INDEX IF NOT EXISTS idx_connections_recipient_user_id 
  ON connections(recipient_user_id);

CREATE INDEX IF NOT EXISTS idx_connections_requester_user_id 
  ON connections(requester_user_id);

-- crm_cards table indexes
CREATE INDEX IF NOT EXISTS idx_crm_cards_connection_id 
  ON crm_cards(connection_id);

CREATE INDEX IF NOT EXISTS idx_crm_cards_partner_user_id 
  ON crm_cards(partner_user_id);
/*
  # Fix Profile Field Data Types

  ## Overview
  This migration fixes data type mismatches between the application and database schema
  that were causing profile save failures.

  ## Changes Made

  1. **Convert integer columns to text**
     - Changes `email_list_size` from integer to text
     - Changes `social_following_size` from integer to text
     - These fields are displayed as free-form text in the UI (e.g., "10,000+ subscribers")
     - Converting to text allows more flexible input like ranges and approximations

  ## Data Preservation
  - All existing integer values are automatically converted to text
  - No data loss occurs during conversion
  - Empty/null values remain unchanged

  ## Affected Tables
  - businesses table

  ## Security
  - RLS policies remain unchanged
  - No new security considerations
*/

-- Convert email_list_size from integer to text
ALTER TABLE businesses 
  ALTER COLUMN email_list_size TYPE text 
  USING CASE 
    WHEN email_list_size IS NULL THEN NULL 
    ELSE email_list_size::text 
  END;

-- Convert social_following_size from integer to text
ALTER TABLE businesses 
  ALTER COLUMN social_following_size TYPE text 
  USING CASE 
    WHEN social_following_size IS NULL THEN NULL 
    ELSE social_following_size::text 
  END;

-- Add comments to document the field types
COMMENT ON COLUMN businesses.email_list_size IS 'Text field for email list size. Allows flexible input like "10,000+ subscribers" or ranges.';
COMMENT ON COLUMN businesses.social_following_size IS 'Text field for social following size. Allows flexible input like "50K across platforms" or ranges.';/*
  # Fix Business Table Issues

  ## Changes
  1. Add unique constraint on owner_user_id (one business per user)
  2. Ensure RLS policies are working correctly
  3. Add helpful error messages

  ## Notes
  - This prevents duplicate business records per user
  - Ensures users can properly read/write their own business data
*/

-- Add unique constraint to prevent duplicate businesses per user
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'businesses_owner_user_id_unique'
  ) THEN
    ALTER TABLE businesses 
    ADD CONSTRAINT businesses_owner_user_id_unique 
    UNIQUE (owner_user_id);
  END IF;
END $$;
/*
  # Add automatic user creation trigger

  1. Purpose
    - Automatically create a public.users record when a new auth.users record is created
    - Ensures foreign key constraints are always satisfied
    - Prevents signup failures due to timing issues

  2. Changes
    - Creates a trigger function that runs after INSERT on auth.users
    - Creates the trigger to invoke the function
    - Ensures user records are always created atomically with auth signup
*/

-- Create function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, first_name, last_name, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'first_name', 'User'),
    COALESCE(new.raw_user_meta_data->>'last_name', 'Account'),
    'user'
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
/*
  # Add Commission Details to Offers Table

  This migration adds detailed commission tracking fields to the offers table.

  ## Changes
  
  1. New Columns Added to `offers` table:
    - `commission_type` (text) - Specifies if commission is "one-time" or "recurring"
    - `commission_duration` (text) - Duration of commission: "one-time", "1-year", or "lifetime"
    - `offer_notes` (text) - Additional notes about the offer
  
  2. Purpose:
    - Allows offer creators to specify commission structure details
    - Helps partners understand payment terms before promoting
    - Provides additional context through notes field
    
  3. Notes:
    - All fields are nullable to maintain compatibility with existing offers
    - No default values set to allow users to explicitly choose options
*/

-- Add commission type field (one-time or recurring)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'offers' AND column_name = 'commission_type'
  ) THEN
    ALTER TABLE offers ADD COLUMN commission_type text;
  END IF;
END $$;

-- Add commission duration field (one-time, 1-year, or lifetime)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'offers' AND column_name = 'commission_duration'
  ) THEN
    ALTER TABLE offers ADD COLUMN commission_duration text;
  END IF;
END $$;

-- Add offer notes field
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'offers' AND column_name = 'offer_notes'
  ) THEN
    ALTER TABLE offers ADD COLUMN offer_notes text;
  END IF;
END $$;
/*
  # Add INSERT policy for notifications table

  ## Summary
  This migration adds a missing INSERT policy for the notifications table to allow
  authenticated users to create notifications for other users (e.g., connection requests).

  ## Changes
  1. Security
    - Add INSERT policy for notifications table
    - Allows authenticated users to create notifications for any user
    - This is necessary for system-generated notifications like connection requests and acceptances
*/

-- Drop the policy if it exists and recreate it
DO $$
BEGIN
  DROP POLICY IF EXISTS "Authenticated users can create notifications" ON notifications;
END $$;

-- Add INSERT policy for notifications
CREATE POLICY "Authenticated users can create notifications"
  ON notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (true);
/*
  # Fix CRM trigger function column references

  ## Summary
  This migration fixes the trigger functions that create and update CRM cards when connections
  are made. The functions were referencing incorrect column names causing the connection
  requests to fail.

  ## Changes
  1. Bug Fixes
    - Fix `create_crm_card_on_connection` to use correct column names:
      - `owner_user_id` instead of `user_id` (businesses table)
      - `requester_user_id` instead of `requester_id` (connections table)
      - `recipient_user_id` instead of `recipient_id` (connections table)
    - Fix `update_crm_card_on_connection_accept` to use correct column names:
      - `requester_user_id` instead of `requester_id`
      - `recipient_user_id` instead of `recipient_id`
*/

-- Drop and recreate the trigger function with correct column names
DROP FUNCTION IF EXISTS create_crm_card_on_connection() CASCADE;

CREATE OR REPLACE FUNCTION create_crm_card_on_connection()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  requester_business_id uuid;
  recipient_business_id uuid;
BEGIN
  -- Get business IDs for both users (using owner_user_id, not user_id)
  SELECT b.id INTO requester_business_id
  FROM businesses b
  WHERE b.owner_user_id = NEW.requester_user_id;

  SELECT b.id INTO recipient_business_id
  FROM businesses b
  WHERE b.owner_user_id = NEW.recipient_user_id;

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
      NEW.requester_user_id,
      NEW.recipient_user_id,
      recipient_business_id,
      NEW.id,
      'contacted',
      b.business_name,
      u.first_name || ' ' || u.last_name
    FROM users u
    JOIN businesses b ON b.owner_user_id = u.id
    WHERE u.id = NEW.recipient_user_id;

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
      NEW.recipient_user_id,
      NEW.requester_user_id,
      requester_business_id,
      NEW.id,
      'new',
      b.business_name,
      u.first_name || ' ' || u.last_name
    FROM users u
    JOIN businesses b ON b.owner_user_id = u.id
    WHERE u.id = NEW.requester_user_id;
  END IF;

  RETURN NEW;
END;
$$;

-- Drop and recreate the update trigger function with correct column names
DROP FUNCTION IF EXISTS update_crm_card_on_connection_accept() CASCADE;

CREATE OR REPLACE FUNCTION update_crm_card_on_connection_accept()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only update when status changes to 'accepted'
  IF NEW.status = 'accepted' AND (OLD.status IS NULL OR OLD.status != 'accepted') THEN
    -- Update CRM card for requester (move to qualified)
    UPDATE crm_cards
    SET stage = 'qualified'
    WHERE connection_id = NEW.id
      AND user_id = NEW.requester_user_id;

    -- Update CRM card for recipient (move to qualified)
    UPDATE crm_cards
    SET stage = 'qualified'
    WHERE connection_id = NEW.id
      AND user_id = NEW.recipient_user_id;
  END IF;

  RETURN NEW;
END;
$$;

-- Recreate the triggers
CREATE TRIGGER create_crm_card_on_connection_trigger
  AFTER INSERT ON connections
  FOR EACH ROW
  EXECUTE FUNCTION create_crm_card_on_connection();

CREATE TRIGGER update_crm_card_on_connection_accept_trigger
  AFTER UPDATE ON connections
  FOR EACH ROW
  EXECUTE FUNCTION update_crm_card_on_connection_accept();
/*
  # Fix CRM trigger function stage values

  ## Summary
  This migration fixes the stage values used in the CRM trigger functions to match
  the valid_stage check constraint on the crm_cards table.

  ## Changes
  1. Bug Fixes
    - Update `create_crm_card_on_connection` to use valid stage values:
      - 'Connection Pending' instead of 'contacted' and 'new'
    - Update `update_crm_card_on_connection_accept` to use valid stage values:
      - 'Connected' instead of 'qualified'
*/

-- Drop and recreate the trigger function with correct stage values
DROP FUNCTION IF EXISTS create_crm_card_on_connection() CASCADE;

CREATE OR REPLACE FUNCTION create_crm_card_on_connection()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  requester_business_id uuid;
  recipient_business_id uuid;
BEGIN
  -- Get business IDs for both users
  SELECT b.id INTO requester_business_id
  FROM businesses b
  WHERE b.owner_user_id = NEW.requester_user_id;

  SELECT b.id INTO recipient_business_id
  FROM businesses b
  WHERE b.owner_user_id = NEW.recipient_user_id;

  -- Create CRM card for requester (they sent the request)
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
      NEW.requester_user_id,
      NEW.recipient_user_id,
      recipient_business_id,
      NEW.id,
      'Connection Pending',
      b.business_name,
      u.first_name || ' ' || u.last_name
    FROM users u
    JOIN businesses b ON b.owner_user_id = u.id
    WHERE u.id = NEW.recipient_user_id;

    -- Create CRM card for recipient (they received the request)
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
      NEW.recipient_user_id,
      NEW.requester_user_id,
      requester_business_id,
      NEW.id,
      'Connection Pending',
      b.business_name,
      u.first_name || ' ' || u.last_name
    FROM users u
    JOIN businesses b ON b.owner_user_id = u.id
    WHERE u.id = NEW.requester_user_id;
  END IF;

  RETURN NEW;
END;
$$;

-- Drop and recreate the update trigger function with correct stage values
DROP FUNCTION IF EXISTS update_crm_card_on_connection_accept() CASCADE;

CREATE OR REPLACE FUNCTION update_crm_card_on_connection_accept()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only update when status changes to 'accepted'
  IF NEW.status = 'accepted' AND (OLD.status IS NULL OR OLD.status != 'accepted') THEN
    -- Update CRM card for requester (move to Connected)
    UPDATE crm_cards
    SET stage = 'Connected'
    WHERE connection_id = NEW.id
      AND user_id = NEW.requester_user_id;

    -- Update CRM card for recipient (move to Connected)
    UPDATE crm_cards
    SET stage = 'Connected'
    WHERE connection_id = NEW.id
      AND user_id = NEW.recipient_user_id;
  END IF;

  RETURN NEW;
END;
$$;

-- Recreate the triggers
CREATE TRIGGER create_crm_card_on_connection_trigger
  AFTER INSERT ON connections
  FOR EACH ROW
  EXECUTE FUNCTION create_crm_card_on_connection();

CREATE TRIGGER update_crm_card_on_connection_accept_trigger
  AFTER UPDATE ON connections
  FOR EACH ROW
  EXECUTE FUNCTION update_crm_card_on_connection_accept();
/*
  # Fix CRM Card Company Name Field

  ## Summary
  Updates the CRM trigger function to use the correct company_name field from
  the businesses table instead of business_name.

  ## Changes
  1. Bug Fixes
    - Update trigger function to pull from businesses.company_name (not business_name)
    - Update existing CRM cards with correct company names from businesses table
*/

-- Drop and recreate the trigger function with correct field
DROP FUNCTION IF EXISTS create_crm_card_on_connection() CASCADE;

CREATE OR REPLACE FUNCTION create_crm_card_on_connection()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  requester_business_id uuid;
  recipient_business_id uuid;
BEGIN
  -- Get business IDs for both users
  SELECT b.id INTO requester_business_id
  FROM businesses b
  WHERE b.owner_user_id = NEW.requester_user_id;

  SELECT b.id INTO recipient_business_id
  FROM businesses b
  WHERE b.owner_user_id = NEW.recipient_user_id;

  -- Create CRM card for requester (they sent the request)
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
      NEW.requester_user_id,
      NEW.recipient_user_id,
      recipient_business_id,
      NEW.id,
      'Connection Pending',
      COALESCE(b.company_name, b.business_name, ''),
      u.first_name || ' ' || u.last_name
    FROM users u
    JOIN businesses b ON b.owner_user_id = u.id
    WHERE u.id = NEW.recipient_user_id;

    -- Create CRM card for recipient (they received the request)
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
      NEW.recipient_user_id,
      NEW.requester_user_id,
      requester_business_id,
      NEW.id,
      'Connection Pending',
      COALESCE(b.company_name, b.business_name, ''),
      u.first_name || ' ' || u.last_name
    FROM users u
    JOIN businesses b ON b.owner_user_id = u.id
    WHERE u.id = NEW.requester_user_id;
  END IF;

  RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER create_crm_card_on_connection_trigger
  AFTER INSERT ON connections
  FOR EACH ROW
  EXECUTE FUNCTION create_crm_card_on_connection();

-- Update existing CRM cards with correct company names
UPDATE crm_cards cc
SET company_name = COALESCE(b.company_name, b.business_name, '')
FROM businesses b
WHERE b.owner_user_id = cc.partner_user_id
  AND (cc.company_name = '' OR cc.company_name IS NULL);
/*
  # Sync User Subscription Status from Stripe

  ## Summary
  Creates a trigger to automatically sync subscription status from stripe_subscriptions
  to the users table whenever a subscription is updated.

  ## Changes
  1. Trigger Function
    - Created function to update users table when stripe_subscriptions changes
    - Maps Stripe subscription status to user subscription_status
    - Updates subscription_tier based on price_id
    - Sets trial_ends_at for trialing subscriptions
    - Updates stripe_customer_id and subscription_ends_at

  2. Trigger
    - Fires after INSERT or UPDATE on stripe_subscriptions
    - Automatically propagates subscription changes to users table
*/

-- Create or replace the trigger function
CREATE OR REPLACE FUNCTION sync_user_subscription_from_stripe()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  target_user_id uuid;
  subscription_tier_value text;
BEGIN
  -- Find the user_id from stripe_customers
  SELECT user_id INTO target_user_id
  FROM stripe_customers
  WHERE customer_id = NEW.customer_id;

  -- If we found a user, update their subscription info
  IF target_user_id IS NOT NULL THEN
    -- Determine subscription tier from price_id
    -- You'll need to adjust these price IDs to match your actual Stripe price IDs
    subscription_tier_value := CASE
      WHEN NEW.price_id LIKE '%pro%' OR NEW.price_id LIKE '%price_%' THEN 'pro'
      WHEN NEW.price_id LIKE '%enterprise%' THEN 'enterprise'
      ELSE 'pro' -- Default to pro for any paid subscription
    END;

    -- Update the users table
    UPDATE users
    SET
      subscription_status = NEW.status::text,
      subscription_tier = CASE
        WHEN NEW.status IN ('active', 'trialing') THEN subscription_tier_value
        ELSE subscription_tier
      END,
      stripe_customer_id = NEW.customer_id,
      subscription_ends_at = to_timestamp(NEW.current_period_end),
      trial_ends_at = CASE
        WHEN NEW.status = 'trialing' THEN to_timestamp(NEW.current_period_end)
        ELSE trial_ends_at
      END
    WHERE id = target_user_id;
  END IF;

  RETURN NEW;
END;
$$;

-- Drop the trigger if it exists
DROP TRIGGER IF EXISTS sync_user_subscription_trigger ON stripe_subscriptions;

-- Create the trigger
CREATE TRIGGER sync_user_subscription_trigger
  AFTER INSERT OR UPDATE ON stripe_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION sync_user_subscription_from_stripe();

-- Update existing users with their current subscription status
UPDATE users u
SET
  subscription_status = ss.status::text,
  subscription_tier = CASE
    WHEN ss.status IN ('active', 'trialing') THEN 'pro'
    ELSE u.subscription_tier
  END,
  stripe_customer_id = ss.customer_id,
  subscription_ends_at = to_timestamp(ss.current_period_end),
  trial_ends_at = CASE
    WHEN ss.status = 'trialing' THEN to_timestamp(ss.current_period_end)
    ELSE u.trial_ends_at
  END
FROM stripe_subscriptions ss
JOIN stripe_customers sc ON sc.customer_id = ss.customer_id
WHERE u.id = sc.user_id;
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
$$;/*
  # Email Verification and High Level CRM Integration

  ## Overview
  This migration adds comprehensive email verification functionality and High Level CRM integration
  to track user verification status, manage communication consent, and sync with external CRM.

  ## New Tables
  
  ### email_verification_tokens
  Stores hashed verification tokens with expiration and usage tracking:
  - `id` (uuid, primary key) - Unique identifier for each token
  - `user_id` (uuid, foreign key) - References auth.users, cascades on delete
  - `token_hash` (text, unique) - SHA-256 hash of verification token (never store plaintext)
  - `expires_at` (timestamptz) - Token expiration timestamp (24 hours from creation)
  - `used_at` (timestamptz, nullable) - Timestamp when token was used (null = unused)
  - `created_at` (timestamptz) - Token creation timestamp

  ### highlevel_sync_queue
  Queues failed High Level API syncs for retry:
  - `id` (uuid, primary key) - Unique identifier
  - `user_id` (uuid, foreign key) - References auth.users
  - `sync_type` (text) - Type of sync: create, update, verify, subscribe
  - `payload` (jsonb) - Data to sync to High Level
  - `retry_count` (integer) - Number of retry attempts (max 3)
  - `last_error` (text, nullable) - Last error message
  - `created_at` (timestamptz) - Queue entry creation time
  - `processed_at` (timestamptz, nullable) - Processing completion time

  ## Modified Tables
  
  ### users (in public schema)
  New columns for verification and CRM tracking:
  - `communication_consent` (boolean, default false) - User agreed to receive communications
  - `communication_consent_at` (timestamptz, nullable) - When consent was given
  - `communication_consent_source` (text, nullable) - Where consent was obtained (signup, settings, etc.)
  - `email_verified_at` (timestamptz, nullable) - When email was verified (null = unverified)
  - `last_verification_email_sent_at` (timestamptz, nullable) - Last time verification email sent
  - `verification_email_count_today` (integer, default 0) - Daily counter for rate limiting
  - `highlevel_contact_id` (text, nullable, unique) - High Level CRM contact ID
  - `highlevel_synced_at` (timestamptz, nullable) - Last successful sync to High Level

  ## Indexes
  
  Performance optimization indexes:
  - email_verification_tokens(token_hash) - Fast token lookup
  - email_verification_tokens(user_id) - Fast user token queries
  - email_verification_tokens(expires_at) - Efficient cleanup of expired tokens
  - highlevel_sync_queue(user_id, processed_at) - Fast queue processing queries
  - users(highlevel_contact_id) - Fast High Level contact lookups

  ## Security
  
  Row Level Security (RLS) policies:
  - email_verification_tokens: No public access (server-side only via service role)
  - highlevel_sync_queue: No public access (admin/server-side only)
  - Users can only view/update their own verification status

  ## Important Notes
  
  1. Tokens are stored as SHA-256 hashes for security - never store plaintext tokens
  2. Tokens expire after 24 hours and are single-use
  3. Rate limiting enforced at 3 emails per day, 60 seconds between sends
  4. High Level sync failures are queued for retry (max 3 attempts)
  5. All timestamps use timestamptz for proper timezone handling
  6. Cascading deletes ensure orphaned records are cleaned up
*/

-- Add new columns to users table for email verification and High Level integration
DO $$
BEGIN
  -- Communication consent tracking
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'users' 
    AND column_name = 'communication_consent'
  ) THEN
    ALTER TABLE public.users ADD COLUMN communication_consent boolean DEFAULT false NOT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'users' 
    AND column_name = 'communication_consent_at'
  ) THEN
    ALTER TABLE public.users ADD COLUMN communication_consent_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'users' 
    AND column_name = 'communication_consent_source'
  ) THEN
    ALTER TABLE public.users ADD COLUMN communication_consent_source text;
  END IF;

  -- Email verification tracking
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'users' 
    AND column_name = 'email_verified_at'
  ) THEN
    ALTER TABLE public.users ADD COLUMN email_verified_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'users' 
    AND column_name = 'last_verification_email_sent_at'
  ) THEN
    ALTER TABLE public.users ADD COLUMN last_verification_email_sent_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'users' 
    AND column_name = 'verification_email_count_today'
  ) THEN
    ALTER TABLE public.users ADD COLUMN verification_email_count_today integer DEFAULT 0 NOT NULL;
  END IF;

  -- High Level CRM integration
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'users' 
    AND column_name = 'highlevel_contact_id'
  ) THEN
    ALTER TABLE public.users ADD COLUMN highlevel_contact_id text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'users' 
    AND column_name = 'highlevel_synced_at'
  ) THEN
    ALTER TABLE public.users ADD COLUMN highlevel_synced_at timestamptz;
  END IF;
END $$;

-- Create unique constraint on highlevel_contact_id if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'users_highlevel_contact_id_key'
  ) THEN
    ALTER TABLE public.users ADD CONSTRAINT users_highlevel_contact_id_key UNIQUE (highlevel_contact_id);
  END IF;
END $$;

-- Create email_verification_tokens table
CREATE TABLE IF NOT EXISTS public.email_verification_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token_hash text UNIQUE NOT NULL,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS on email_verification_tokens (server-side only access)
ALTER TABLE public.email_verification_tokens ENABLE ROW LEVEL SECURITY;

-- No public policies - only service role can access tokens

-- Create indexes for email_verification_tokens
CREATE INDEX IF NOT EXISTS email_verification_tokens_token_hash_idx 
  ON public.email_verification_tokens(token_hash);

CREATE INDEX IF NOT EXISTS email_verification_tokens_user_id_idx 
  ON public.email_verification_tokens(user_id);

CREATE INDEX IF NOT EXISTS email_verification_tokens_expires_at_idx 
  ON public.email_verification_tokens(expires_at);

-- Create highlevel_sync_queue table for retry mechanism
CREATE TABLE IF NOT EXISTS public.highlevel_sync_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sync_type text NOT NULL CHECK (sync_type IN ('create', 'update', 'verify', 'subscribe', 'onboarding')),
  payload jsonb NOT NULL,
  retry_count integer DEFAULT 0 NOT NULL CHECK (retry_count >= 0 AND retry_count <= 3),
  last_error text,
  created_at timestamptz DEFAULT now() NOT NULL,
  processed_at timestamptz
);

-- Enable RLS on highlevel_sync_queue (admin/server-side only)
ALTER TABLE public.highlevel_sync_queue ENABLE ROW LEVEL SECURITY;

-- No public policies - only service role can access queue

-- Create indexes for highlevel_sync_queue
CREATE INDEX IF NOT EXISTS highlevel_sync_queue_user_id_processed_at_idx 
  ON public.highlevel_sync_queue(user_id, processed_at);

CREATE INDEX IF NOT EXISTS highlevel_sync_queue_processed_at_retry_idx 
  ON public.highlevel_sync_queue(processed_at, retry_count) 
  WHERE processed_at IS NULL;

-- Add RLS policy for users to read their own verification status
CREATE POLICY "Users can read own verification status"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Add comment explaining the schema
COMMENT ON TABLE public.email_verification_tokens IS 
  'Stores hashed email verification tokens with expiration and single-use enforcement. Tokens expire after 24 hours.';

COMMENT ON TABLE public.highlevel_sync_queue IS 
  'Queue for retrying failed High Level CRM API syncs. Maximum 3 retry attempts per entry.';

COMMENT ON COLUMN public.users.communication_consent IS 
  'User explicitly agreed to receive marketing and transactional communications';

COMMENT ON COLUMN public.users.email_verified_at IS 
  'Timestamp when user verified their email address. NULL means unverified.';

COMMENT ON COLUMN public.users.highlevel_contact_id IS 
  'External High Level CRM contact ID for syncing user data and triggering workflows';/*
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
/*
  # Update Affiliate Tracking System V2

  This migration updates the existing affiliate tracking system to add missing fields
  and functionality needed for the complete implementation.

  ## Updates

  ### 1. Update affiliate_tax_docs table
  - Change affiliate_user_id to user_id for consistency
  - Add missing columns if needed

  ### 2. Update clicks table  
  - Add ina_click_id column to replace click_id for clarity
  - Update indexes

  ### 3. Update leads table
  - Add ina_click_id column
  - Add affiliate_link_id column
  - Update customer field names for consistency

  ### 4. Update affiliate_links table
  - Add stats columns (clicks_count, conversions_count, total_earned)

  ### 5. Add missing RLS policies
  - Only add policies that don't already exist
*/

-- ============================================================================
-- 1. UPDATE CLICKS TABLE
-- ============================================================================

DO $$
BEGIN
  -- Add ina_click_id if it doesn't exist (keep existing click_id for now)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clicks' AND column_name = 'ina_click_id'
  ) THEN
    ALTER TABLE clicks ADD COLUMN ina_click_id uuid DEFAULT gen_random_uuid();
    CREATE UNIQUE INDEX IF NOT EXISTS idx_clicks_ina_click_id_unique ON clicks(ina_click_id);
  END IF;

  -- Add affiliate_link_id if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clicks' AND column_name = 'affiliate_link_id'
  ) THEN
    ALTER TABLE clicks ADD COLUMN affiliate_link_id uuid REFERENCES affiliate_links(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_clicks_affiliate_link_id_v2 ON clicks(affiliate_link_id);
  END IF;
END $$;

-- ============================================================================
-- 2. UPDATE LEADS TABLE
-- ============================================================================

DO $$
BEGIN
  -- Add ina_click_id if it doesn't exist  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leads' AND column_name = 'ina_click_id'
  ) THEN
    ALTER TABLE leads ADD COLUMN ina_click_id uuid;
    CREATE INDEX IF NOT EXISTS idx_leads_ina_click_id_v2 ON leads(ina_click_id);
  END IF;

  -- Add affiliate_link_id if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leads' AND column_name = 'affiliate_link_id'
  ) THEN
    ALTER TABLE leads ADD COLUMN affiliate_link_id uuid REFERENCES affiliate_links(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_leads_affiliate_link_id_v2 ON leads(affiliate_link_id);
  END IF;

  -- Add customer_email alias for email
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leads' AND column_name = 'customer_email'
  ) THEN
    ALTER TABLE leads ADD COLUMN customer_email text;
  END IF;

  -- Add customer_name for full name
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leads' AND column_name = 'customer_name'
  ) THEN
    ALTER TABLE leads ADD COLUMN customer_name text;
  END IF;

  -- Add customer_phone alias for phone
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leads' AND column_name = 'customer_phone'
  ) THEN
    ALTER TABLE leads ADD COLUMN customer_phone text;
  END IF;

  -- Add conversion_value alias for amount
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leads' AND column_name = 'conversion_value'
  ) THEN
    ALTER TABLE leads ADD COLUMN conversion_value numeric(10,2) DEFAULT 0;
  END IF;

  -- Add external_reference alias for order_id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leads' AND column_name = 'external_reference'
  ) THEN
    ALTER TABLE leads ADD COLUMN external_reference text;
  END IF;

  -- Add metadata alias for raw_payload
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leads' AND column_name = 'metadata'
  ) THEN
    ALTER TABLE leads ADD COLUMN metadata jsonb;
  END IF;
END $$;

-- ============================================================================
-- 3. UPDATE AFFILIATE_LINKS TABLE
-- ============================================================================

DO $$
BEGIN
  -- Add stats columns
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'affiliate_links' AND column_name = 'clicks_count'
  ) THEN
    ALTER TABLE affiliate_links ADD COLUMN clicks_count integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'affiliate_links' AND column_name = 'conversions_count'
  ) THEN
    ALTER TABLE affiliate_links ADD COLUMN conversions_count integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'affiliate_links' AND column_name = 'total_earned'
  ) THEN
    ALTER TABLE affiliate_links ADD COLUMN total_earned numeric(10,2) DEFAULT 0;
  END IF;
END $$;

-- ============================================================================
-- 4. UPDATE COMMISSION_EVENTS TABLE
-- ============================================================================

DO $$
BEGIN
  -- Add affiliate_link_id if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'commission_events' AND column_name = 'affiliate_link_id'
  ) THEN
    ALTER TABLE commission_events ADD COLUMN affiliate_link_id uuid REFERENCES affiliate_links(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_commission_events_affiliate_link_id_v2 ON commission_events(affiliate_link_id);
  END IF;

  -- Add payment_method alias for paid_method
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'commission_events' AND column_name = 'payment_method'
  ) THEN
    ALTER TABLE commission_events ADD COLUMN payment_method text;
  END IF;

  -- Add payment_notes alias for paid_notes
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'commission_events' AND column_name = 'payment_notes'
  ) THEN
    ALTER TABLE commission_events ADD COLUMN payment_notes text;
  END IF;

  -- Add updated_at if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'commission_events' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE commission_events ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;

-- ============================================================================
-- 5. ADD STORAGE BUCKET FOR TAX DOCUMENTS
-- ============================================================================

-- Create storage bucket for tax documents if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('tax-docs', 'tax-docs', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for tax-docs bucket
DO $$
BEGIN
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "Users can upload own tax docs" ON storage.objects;
  DROP POLICY IF EXISTS "Users can view own tax docs" ON storage.objects;
  DROP POLICY IF EXISTS "Users can update own tax docs" ON storage.objects;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Users can upload their own tax documents
CREATE POLICY "Users can upload own tax docs"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'tax-docs' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can view their own tax documents
CREATE POLICY "Users can view own tax docs"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'tax-docs' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can update their own tax documents
CREATE POLICY "Users can update own tax docs"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'tax-docs' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================================================
-- 6. CREATE FUNCTION TO UPDATE AFFILIATE LINK STATS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_affiliate_link_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Update clicks_count when a new click is added
  IF TG_TABLE_NAME = 'clicks' AND TG_OP = 'INSERT' THEN
    UPDATE affiliate_links
    SET clicks_count = clicks_count + 1
    WHERE id = NEW.affiliate_link_id;
  END IF;

  -- Update conversions_count and total_earned when a new commission is added
  IF TG_TABLE_NAME = 'commission_events' AND TG_OP = 'INSERT' THEN
    UPDATE affiliate_links
    SET 
      conversions_count = conversions_count + 1,
      total_earned = total_earned + NEW.affiliate_commission_amount
    WHERE id = NEW.affiliate_link_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for auto-updating stats
DROP TRIGGER IF EXISTS trigger_update_clicks_count ON clicks;
CREATE TRIGGER trigger_update_clicks_count
  AFTER INSERT ON clicks
  FOR EACH ROW
  EXECUTE FUNCTION update_affiliate_link_stats();

DROP TRIGGER IF EXISTS trigger_update_conversions_count ON commission_events;
CREATE TRIGGER trigger_update_conversions_count
  AFTER INSERT ON commission_events
  FOR EACH ROW
  EXECUTE FUNCTION update_affiliate_link_stats();
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
$$ LANGUAGE plpgsql SECURITY DEFINER;/*
  # Create Terms Acceptance Table

  1. New Tables
    - `terms_acceptances`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `accepted_at` (timestamp)
      - `terms_version` (text, version of T&C)
      - `privacy_version` (text, version of Privacy Policy)
      - `ip_address` (text, IP address when accepted)
      - `user_agent` (text, browser info when accepted)

  2. Security
    - Enable RLS on `terms_acceptances` table
    - Add policy for users to insert and read their own records
*/

CREATE TABLE IF NOT EXISTS terms_acceptances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  accepted_at timestamptz DEFAULT now(),
  terms_version text DEFAULT '1.3',
  privacy_version text DEFAULT '1.0',
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE terms_acceptances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own terms acceptance"
  ON terms_acceptances
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read their own terms acceptance"
  ON terms_acceptances
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX idx_terms_acceptances_user_id ON terms_acceptances(user_id);
CREATE INDEX idx_terms_acceptances_accepted_at ON terms_acceptances(accepted_at);/*
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
-- Create offer affiliate clicks tracking table
CREATE TABLE IF NOT EXISTS offer_affiliate_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id UUID NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
  affiliate_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  clicked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT,
  referrer_url TEXT,
  converted BOOLEAN DEFAULT FALSE,
  converted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create offer affiliate codes table for short URLs (prtnr.live)
CREATE TABLE IF NOT EXISTS offer_affiliate_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  offer_id UUID NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
  short_code VARCHAR(12) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, offer_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_offer_affiliate_clicks_offer ON offer_affiliate_clicks(offer_id);
CREATE INDEX IF NOT EXISTS idx_offer_affiliate_clicks_user ON offer_affiliate_clicks(affiliate_user_id);
CREATE INDEX IF NOT EXISTS idx_offer_affiliate_clicks_date ON offer_affiliate_clicks(clicked_at);
CREATE INDEX IF NOT EXISTS idx_offer_affiliate_codes_short ON offer_affiliate_codes(short_code);
CREATE INDEX IF NOT EXISTS idx_offer_affiliate_codes_user_offer ON offer_affiliate_codes(user_id, offer_id);

-- Enable RLS
ALTER TABLE offer_affiliate_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE offer_affiliate_codes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for offer_affiliate_clicks
-- Users can view their own affiliate click data
CREATE POLICY "Users can view their own affiliate clicks"
  ON offer_affiliate_clicks FOR SELECT
  USING (affiliate_user_id = auth.uid());

-- Anyone can insert clicks (for tracking)
CREATE POLICY "Anyone can track affiliate clicks"
  ON offer_affiliate_clicks FOR INSERT
  WITH CHECK (true);

-- RLS Policies for offer_affiliate_codes
-- Users can view their own affiliate codes
CREATE POLICY "Users can view their own affiliate codes"
  ON offer_affiliate_codes FOR SELECT
  USING (user_id = auth.uid());

-- Users can create affiliate codes for themselves
CREATE POLICY "Users can create their own affiliate codes"
  ON offer_affiliate_codes FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Function to generate a short affiliate code
CREATE OR REPLACE FUNCTION generate_offer_affiliate_code()
RETURNS VARCHAR(12) AS $$
DECLARE
  chars VARCHAR := 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  result VARCHAR := '';
  i INTEGER;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to get or create affiliate code for user+offer
CREATE OR REPLACE FUNCTION get_or_create_offer_affiliate_code(p_user_id UUID, p_offer_id UUID)
RETURNS VARCHAR(12) AS $$
DECLARE
  existing_code VARCHAR(12);
  new_code VARCHAR(12);
  attempts INTEGER := 0;
BEGIN
  -- Check if code already exists
  SELECT short_code INTO existing_code
  FROM offer_affiliate_codes
  WHERE user_id = p_user_id AND offer_id = p_offer_id;

  IF existing_code IS NOT NULL THEN
    RETURN existing_code;
  END IF;

  -- Generate new unique code
  LOOP
    new_code := generate_offer_affiliate_code();
    attempts := attempts + 1;

    BEGIN
      INSERT INTO offer_affiliate_codes (user_id, offer_id, short_code)
      VALUES (p_user_id, p_offer_id, new_code);
      RETURN new_code;
    EXCEPTION WHEN unique_violation THEN
      IF attempts > 10 THEN
        RAISE EXCEPTION 'Failed to generate unique affiliate code';
      END IF;
    END;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION get_or_create_offer_affiliate_code(UUID, UUID) TO authenticated;
/*
  # Stripe Product Management System

  1. New Tables
    - `stripe_connection`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `stripe_account_id` (text) - The connected Stripe account ID
      - `access_token` (text) - Encrypted OAuth access token
      - `refresh_token` (text) - Encrypted OAuth refresh token
      - `is_active` (boolean) - Whether the connection is currently active
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `stripe_products`
      - `id` (uuid, primary key)
      - `stripe_product_id` (text) - The Stripe product ID
      - `stripe_price_id` (text) - The Stripe price ID
      - `name` (text) - Product name
      - `description` (text) - Product description
      - `price` (numeric) - Price amount
      - `currency` (text) - Currency code
      - `mode` (text) - 'payment' or 'subscription'
      - `is_active` (boolean) - Whether to show this product
      - `display_order` (integer) - Order to display products
      - `metadata` (jsonb) - Additional product metadata
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      - `synced_at` (timestamptz) - Last sync from Stripe

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users to manage their Stripe connection
    - Add policies for public read access to active products
    - Add policies for admin users to manage products

  3. Indexes
    - Add index on stripe_connection.user_id
    - Add index on stripe_products.stripe_price_id
    - Add index on stripe_products.is_active
*/

-- Create stripe_connection table
CREATE TABLE IF NOT EXISTS stripe_connection (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  stripe_account_id text,
  access_token text,
  refresh_token text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create stripe_products table
CREATE TABLE IF NOT EXISTS stripe_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_product_id text NOT NULL,
  stripe_price_id text NOT NULL UNIQUE,
  name text NOT NULL,
  description text DEFAULT '',
  price numeric NOT NULL,
  currency text DEFAULT 'usd',
  mode text NOT NULL CHECK (mode IN ('payment', 'subscription')),
  is_active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  synced_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE stripe_connection ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_products ENABLE ROW LEVEL SECURITY;

-- Policies for stripe_connection
CREATE POLICY "Users can view own Stripe connection"
  ON stripe_connection FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own Stripe connection"
  ON stripe_connection FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own Stripe connection"
  ON stripe_connection FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own Stripe connection"
  ON stripe_connection FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Policies for stripe_products (public read for active products)
CREATE POLICY "Anyone can view active products"
  ON stripe_products FOR SELECT
  TO public
  USING (is_active = true);

CREATE POLICY "Authenticated users can manage products"
  ON stripe_products FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_stripe_connection_user_id ON stripe_connection(user_id);
CREATE INDEX IF NOT EXISTS idx_stripe_products_price_id ON stripe_products(stripe_price_id);
CREATE INDEX IF NOT EXISTS idx_stripe_products_is_active ON stripe_products(is_active);
CREATE INDEX IF NOT EXISTS idx_stripe_products_display_order ON stripe_products(display_order);

-- Seed initial products from existing configuration
INSERT INTO stripe_products (stripe_product_id, stripe_price_id, name, description, price, currency, mode, is_active, display_order)
VALUES 
  ('prod_monthly', 'price_1SfpEdA83nAUrUVoWDLJt7aQ', 'Monthly', 'Monthly subscription plan with 30-day free trial using code GET30', 97.00, 'usd', 'subscription', true, 1),
  ('prod_lifetime', 'price_1SfpFcA83nAUrUVoq420COua', 'Launch Special Lifetime', 'One-time payment for lifetime access. Only 30 available!', 815.00, 'usd', 'payment', true, 2),
  ('prod_TZQqH6aapPlI3g', 'price_1SfpJVA83nAUrUVoup5Xg5Ac', 'Annual', 'Annual subscription plan - Save 20% with yearly billing', 931.00, 'usd', 'subscription', true, 3)
ON CONFLICT (stripe_price_id) DO NOTHING;
