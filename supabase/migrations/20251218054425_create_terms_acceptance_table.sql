/*
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
CREATE INDEX idx_terms_acceptances_accepted_at ON terms_acceptances(accepted_at);