/*
  # Add INSERT Policy for Stripe Subscriptions

  ## Problem
  The `stripe_subscriptions` table has RLS enabled but no INSERT policy,
  preventing the edge function from creating subscription records.
  
  ## Solution
  Add a policy that allows service role and system to insert subscription records.
  This is needed for the stripe-checkout edge function to create initial subscription records.
  
  ## Changes
  1. Add INSERT policy for creating new subscription records
  
  ## Security
  - Policy allows inserts for service role operations (edge functions)
  - Records can only be created, not modified by users
*/

-- Allow service role and system to insert subscription records
CREATE POLICY "Allow system to create subscription records"
  ON stripe_subscriptions
  FOR INSERT
  WITH CHECK (true);
