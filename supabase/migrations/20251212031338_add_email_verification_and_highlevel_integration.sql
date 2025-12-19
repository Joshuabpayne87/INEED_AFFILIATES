/*
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
  'External High Level CRM contact ID for syncing user data and triggering workflows';