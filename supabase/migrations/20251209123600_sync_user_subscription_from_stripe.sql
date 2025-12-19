/*
  # Sync User Subscription Status from Stripe

  ## Summary
  Creates a trigger to automatically sync subscription status from stripe_subscriptions
  to the users table whenever a subscription is updated.

  ## Changes
  1. Trigger Function
    - Created function to update users table when stripe_subscriptions changes
    - Maps Stripe subscription status to user subscription_status
    - Updates subscription_tier based on price_id
    - Sets trial_ends_at for trialing subscriptions
    - Updates stripe_customer_id and subscription_ends_at

  2. Trigger
    - Fires after INSERT or UPDATE on stripe_subscriptions
    - Automatically propagates subscription changes to users table
*/

-- Create or replace the trigger function
CREATE OR REPLACE FUNCTION sync_user_subscription_from_stripe()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  target_user_id uuid;
  subscription_tier_value text;
BEGIN
  -- Find the user_id from stripe_customers
  SELECT user_id INTO target_user_id
  FROM stripe_customers
  WHERE customer_id = NEW.customer_id;

  -- If we found a user, update their subscription info
  IF target_user_id IS NOT NULL THEN
    -- Determine subscription tier from price_id
    -- You'll need to adjust these price IDs to match your actual Stripe price IDs
    subscription_tier_value := CASE
      WHEN NEW.price_id LIKE '%pro%' OR NEW.price_id LIKE '%price_%' THEN 'pro'
      WHEN NEW.price_id LIKE '%enterprise%' THEN 'enterprise'
      ELSE 'pro' -- Default to pro for any paid subscription
    END;

    -- Update the users table
    UPDATE users
    SET
      subscription_status = NEW.status::text,
      subscription_tier = CASE
        WHEN NEW.status IN ('active', 'trialing') THEN subscription_tier_value
        ELSE subscription_tier
      END,
      stripe_customer_id = NEW.customer_id,
      subscription_ends_at = to_timestamp(NEW.current_period_end),
      trial_ends_at = CASE
        WHEN NEW.status = 'trialing' THEN to_timestamp(NEW.current_period_end)
        ELSE trial_ends_at
      END
    WHERE id = target_user_id;
  END IF;

  RETURN NEW;
END;
$$;

-- Drop the trigger if it exists
DROP TRIGGER IF EXISTS sync_user_subscription_trigger ON stripe_subscriptions;

-- Create the trigger
CREATE TRIGGER sync_user_subscription_trigger
  AFTER INSERT OR UPDATE ON stripe_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION sync_user_subscription_from_stripe();

-- Update existing users with their current subscription status
UPDATE users u
SET
  subscription_status = ss.status::text,
  subscription_tier = CASE
    WHEN ss.status IN ('active', 'trialing') THEN 'pro'
    ELSE u.subscription_tier
  END,
  stripe_customer_id = ss.customer_id,
  subscription_ends_at = to_timestamp(ss.current_period_end),
  trial_ends_at = CASE
    WHEN ss.status = 'trialing' THEN to_timestamp(ss.current_period_end)
    ELSE u.trial_ends_at
  END
FROM stripe_subscriptions ss
JOIN stripe_customers sc ON sc.customer_id = ss.customer_id
WHERE u.id = sc.user_id;
