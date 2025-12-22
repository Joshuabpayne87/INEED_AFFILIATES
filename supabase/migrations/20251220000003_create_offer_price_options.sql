/*
  # Create Offer Price Options Table

  This migration creates a normalized table for multiple pricing options per offer.
  Each offer can have 0..N price options with different amounts and frequencies.
  
  Key constraints:
  - One offer = one landing page (destination_url is on offers table, not here)
  - Frequencies: per_month, per_year, lifetime, one_time
  - Supports currency (default USD, extensible)
  - Sortable via sort_order
*/

-- Create offer_price_options table
CREATE TABLE IF NOT EXISTS offer_price_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id uuid NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
  amount numeric(12,2) NOT NULL CHECK (amount >= 0),
  currency text NOT NULL DEFAULT 'USD',
  frequency text NOT NULL CHECK (frequency IN ('per_month', 'per_year', 'lifetime', 'one_time')),
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  -- Prevent duplicate identical price options
  UNIQUE(offer_id, amount, currency, frequency)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS offer_price_options_offer_id_idx ON offer_price_options(offer_id);
CREATE INDEX IF NOT EXISTS offer_price_options_sort_order_idx ON offer_price_options(offer_id, sort_order);

-- Enable RLS
ALTER TABLE offer_price_options ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user can manage an offer
CREATE OR REPLACE FUNCTION can_manage_offer(p_offer_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_business_id uuid;
  v_owner_user_id uuid;
  v_user_role text;
BEGIN
  -- Get business_id and owner from offer
  SELECT business_id INTO v_business_id
  FROM offers
  WHERE id = p_offer_id;

  IF v_business_id IS NULL THEN
    RETURN false;
  END IF;

  -- Get business owner
  SELECT owner_user_id INTO v_owner_user_id
  FROM businesses
  WHERE id = v_business_id;

  -- Check if current user is business owner
  IF v_owner_user_id = auth.uid() THEN
    RETURN true;
  END IF;

  -- Check if current user is admin
  SELECT role INTO v_user_role
  FROM users
  WHERE id = auth.uid();

  IF v_user_role = 'admin' THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

-- RLS Policies

-- SELECT: Users can view price options for offers they can view
CREATE POLICY "Users can view price options for accessible offers"
  ON offer_price_options FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM offers o
      JOIN businesses b ON o.business_id = b.id
      WHERE o.id = offer_price_options.offer_id
        AND (
          b.owner_user_id = auth.uid()
          OR b.is_profile_published = true
          OR (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
        )
    )
  );

-- INSERT: Only offer owners/admins can insert
CREATE POLICY "Offer owners can insert price options"
  ON offer_price_options FOR INSERT
  TO authenticated
  WITH CHECK (can_manage_offer(offer_id));

-- UPDATE: Only offer owners/admins can update
CREATE POLICY "Offer owners can update price options"
  ON offer_price_options FOR UPDATE
  TO authenticated
  USING (can_manage_offer(offer_id))
  WITH CHECK (can_manage_offer(offer_id));

-- DELETE: Only offer owners/admins can delete
CREATE POLICY "Offer owners can delete price options"
  ON offer_price_options FOR DELETE
  TO authenticated
  USING (can_manage_offer(offer_id));

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_offer_price_options_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_offer_price_options_updated_at
  BEFORE UPDATE ON offer_price_options
  FOR EACH ROW
  EXECUTE FUNCTION update_offer_price_options_updated_at();

