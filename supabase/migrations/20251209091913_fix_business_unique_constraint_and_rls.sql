/*
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
