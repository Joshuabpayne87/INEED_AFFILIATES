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
