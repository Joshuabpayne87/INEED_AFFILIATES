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
