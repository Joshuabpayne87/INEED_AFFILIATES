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
