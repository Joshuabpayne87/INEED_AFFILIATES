/*
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
