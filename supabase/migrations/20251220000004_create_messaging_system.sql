/*
  # Create Messaging System

  This migration creates the complete messaging system for partner communication.
  All partner communication happens within the platform to maintain privacy and audit trails.
*/

-- =====================================================================
-- 1. CREATE CONVERSATIONS TABLE
-- =====================================================================

-- Drop if exists (for idempotency)
DROP TABLE IF EXISTS conversations CASCADE;

CREATE TABLE conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_1_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  participant_2_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  connection_id uuid REFERENCES connections(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_message_at timestamptz,
  participant_1_last_read_at timestamptz,
  participant_2_last_read_at timestamptz,
  -- Ensure unique conversation between two users
  UNIQUE(participant_1_user_id, participant_2_user_id),
  -- Ensure participant_1 is always the smaller ID for consistency
  CHECK (participant_1_user_id < participant_2_user_id)
);

-- Indexes for conversations
CREATE INDEX IF NOT EXISTS idx_conversations_participant_1 ON conversations(participant_1_user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_participant_2 ON conversations(participant_2_user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_connection_id ON conversations(connection_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message_at ON conversations(last_message_at DESC);

-- RLS for conversations
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own conversations"
  ON conversations FOR SELECT
  TO authenticated
  USING (
    participant_1_user_id = auth.uid() OR
    participant_2_user_id = auth.uid()
  );

CREATE POLICY "Users can create conversations they participate in"
  ON conversations FOR INSERT
  TO authenticated
  WITH CHECK (
    participant_1_user_id = auth.uid() OR
    participant_2_user_id = auth.uid()
  );

CREATE POLICY "Users can update their own conversations"
  ON conversations FOR UPDATE
  TO authenticated
  USING (
    participant_1_user_id = auth.uid() OR
    participant_2_user_id = auth.uid()
  )
  WITH CHECK (
    participant_1_user_id = auth.uid() OR
    participant_2_user_id = auth.uid()
  );

-- =====================================================================
-- 2. CREATE MESSAGES TABLE
-- =====================================================================

-- Drop old messages table if it exists (different structure from previous migration)
DROP TABLE IF EXISTS messages CASCADE;

CREATE TABLE messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content text NOT NULL,
  is_read boolean DEFAULT false,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  -- For system messages
  is_system_message boolean DEFAULT false,
  system_message_type text -- e.g., 'connection_accepted', 'call_booked', 'referral_received'
);

-- Indexes for messages
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_user_id ON messages(sender_user_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_is_read ON messages(is_read);

-- RLS for messages
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages in their conversations"
  ON messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
        AND (conversations.participant_1_user_id = auth.uid() OR conversations.participant_2_user_id = auth.uid())
    )
  );

CREATE POLICY "Users can send messages in their conversations"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
        AND (conversations.participant_1_user_id = auth.uid() OR conversations.participant_2_user_id = auth.uid())
    )
  );

CREATE POLICY "Users can update their own messages (mark as read)"
  ON messages FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
        AND (conversations.participant_1_user_id = auth.uid() OR conversations.participant_2_user_id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
        AND (conversations.participant_1_user_id = auth.uid() OR conversations.participant_2_user_id = auth.uid())
    )
  );

-- =====================================================================
-- 3. CREATE MESSAGE NOTIFICATIONS TABLE
-- =====================================================================

-- Drop if exists (for idempotency)
DROP TABLE IF EXISTS message_notifications CASCADE;

CREATE TABLE message_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  unread_count integer DEFAULT 0,
  last_notified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, conversation_id)
);

-- Indexes for message_notifications
CREATE INDEX IF NOT EXISTS idx_message_notifications_user_id ON message_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_message_notifications_conversation_id ON message_notifications(conversation_id);

-- RLS for message_notifications
ALTER TABLE message_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own message notifications"
  ON message_notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "System can manage message notifications"
  ON message_notifications FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- =====================================================================
-- 4. FUNCTIONS AND TRIGGERS
-- =====================================================================

-- Drop all triggers and functions if they exist (for idempotency)
-- Drop triggers first (they depend on functions)
DROP TRIGGER IF EXISTS trigger_update_conversation_last_message ON messages;
DROP TRIGGER IF EXISTS trigger_update_message_notifications ON messages;
-- Then drop functions
DROP FUNCTION IF EXISTS get_or_create_conversation(uuid, uuid, uuid);
DROP FUNCTION IF EXISTS update_conversation_last_message();
DROP FUNCTION IF EXISTS update_message_notifications();
DROP FUNCTION IF EXISTS mark_conversation_messages_read(uuid, uuid);

-- Function to get or create a conversation between two users
CREATE OR REPLACE FUNCTION get_or_create_conversation(
  p_user_1_id uuid,
  p_user_2_id uuid,
  p_connection_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_conversation_id uuid;
  v_participant_1 uuid;
  v_participant_2 uuid;
BEGIN
  -- Ensure participant_1 is always the smaller ID
  IF p_user_1_id < p_user_2_id THEN
    v_participant_1 := p_user_1_id;
    v_participant_2 := p_user_2_id;
  ELSE
    v_participant_1 := p_user_2_id;
    v_participant_2 := p_user_1_id;
  END IF;

  -- Try to get existing conversation
  SELECT id INTO v_conversation_id
  FROM conversations
  WHERE participant_1_user_id = v_participant_1
    AND participant_2_user_id = v_participant_2;

  -- Create if doesn't exist
  IF v_conversation_id IS NULL THEN
    INSERT INTO conversations (participant_1_user_id, participant_2_user_id, connection_id)
    VALUES (v_participant_1, v_participant_2, p_connection_id)
    RETURNING id INTO v_conversation_id;
  END IF;

  RETURN v_conversation_id;
END;
$$;

-- Function to update conversation last_message_at
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations
  SET last_message_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update last_message_at when message is created
CREATE TRIGGER trigger_update_conversation_last_message
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_last_message();

-- Function to update message notifications
CREATE OR REPLACE FUNCTION update_message_notifications()
RETURNS TRIGGER AS $$
DECLARE
  v_other_participant uuid;
BEGIN
  -- Get the other participant in the conversation
  SELECT CASE
    WHEN participant_1_user_id = NEW.sender_user_id THEN participant_2_user_id
    ELSE participant_1_user_id
  END INTO v_other_participant
  FROM conversations
  WHERE id = NEW.conversation_id;

  -- Update or insert notification for the recipient
  INSERT INTO message_notifications (user_id, conversation_id, unread_count, last_notified_at, updated_at)
  VALUES (v_other_participant, NEW.conversation_id, 1, now(), now())
  ON CONFLICT (user_id, conversation_id)
  DO UPDATE SET
    unread_count = message_notifications.unread_count + 1,
    last_notified_at = now(),
    updated_at = now();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update notifications when message is created
CREATE TRIGGER trigger_update_message_notifications
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_message_notifications();

-- Function to mark messages as read
CREATE OR REPLACE FUNCTION mark_conversation_messages_read(
  p_conversation_id uuid,
  p_user_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Mark messages as read
  UPDATE messages
  SET is_read = true, read_at = now()
  WHERE conversation_id = p_conversation_id
    AND sender_user_id != p_user_id
    AND is_read = false;

  -- Update conversation last_read_at
  UPDATE conversations
  SET
    participant_1_last_read_at = CASE WHEN participant_1_user_id = p_user_id THEN now() ELSE participant_1_last_read_at END,
    participant_2_last_read_at = CASE WHEN participant_2_user_id = p_user_id THEN now() ELSE participant_2_last_read_at END
  WHERE id = p_conversation_id;

  -- Reset notification count
  UPDATE message_notifications
  SET unread_count = 0, updated_at = now()
  WHERE conversation_id = p_conversation_id
    AND user_id = p_user_id;
END;
$$;

-- Note: Realtime is enabled by default for all tables in Supabase
-- If you need to explicitly enable it, use the Supabase dashboard or:
-- ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
-- ALTER PUBLICATION supabase_realtime ADD TABLE messages;
-- ALTER PUBLICATION supabase_realtime ADD TABLE message_notifications;

