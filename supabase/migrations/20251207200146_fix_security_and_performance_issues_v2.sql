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
