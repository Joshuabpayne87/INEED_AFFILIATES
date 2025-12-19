/*
  # Update Affiliate Tracking System V2

  This migration updates the existing affiliate tracking system to add missing fields
  and functionality needed for the complete implementation.

  ## Updates

  ### 1. Update affiliate_tax_docs table
  - Change affiliate_user_id to user_id for consistency
  - Add missing columns if needed

  ### 2. Update clicks table  
  - Add ina_click_id column to replace click_id for clarity
  - Update indexes

  ### 3. Update leads table
  - Add ina_click_id column
  - Add affiliate_link_id column
  - Update customer field names for consistency

  ### 4. Update affiliate_links table
  - Add stats columns (clicks_count, conversions_count, total_earned)

  ### 5. Add missing RLS policies
  - Only add policies that don't already exist
*/

-- ============================================================================
-- 1. UPDATE CLICKS TABLE
-- ============================================================================

DO $$
BEGIN
  -- Add ina_click_id if it doesn't exist (keep existing click_id for now)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clicks' AND column_name = 'ina_click_id'
  ) THEN
    ALTER TABLE clicks ADD COLUMN ina_click_id uuid DEFAULT gen_random_uuid();
    CREATE UNIQUE INDEX IF NOT EXISTS idx_clicks_ina_click_id_unique ON clicks(ina_click_id);
  END IF;

  -- Add affiliate_link_id if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clicks' AND column_name = 'affiliate_link_id'
  ) THEN
    ALTER TABLE clicks ADD COLUMN affiliate_link_id uuid REFERENCES affiliate_links(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_clicks_affiliate_link_id_v2 ON clicks(affiliate_link_id);
  END IF;
END $$;

-- ============================================================================
-- 2. UPDATE LEADS TABLE
-- ============================================================================

DO $$
BEGIN
  -- Add ina_click_id if it doesn't exist  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leads' AND column_name = 'ina_click_id'
  ) THEN
    ALTER TABLE leads ADD COLUMN ina_click_id uuid;
    CREATE INDEX IF NOT EXISTS idx_leads_ina_click_id_v2 ON leads(ina_click_id);
  END IF;

  -- Add affiliate_link_id if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leads' AND column_name = 'affiliate_link_id'
  ) THEN
    ALTER TABLE leads ADD COLUMN affiliate_link_id uuid REFERENCES affiliate_links(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_leads_affiliate_link_id_v2 ON leads(affiliate_link_id);
  END IF;

  -- Add customer_email alias for email
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leads' AND column_name = 'customer_email'
  ) THEN
    ALTER TABLE leads ADD COLUMN customer_email text;
  END IF;

  -- Add customer_name for full name
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leads' AND column_name = 'customer_name'
  ) THEN
    ALTER TABLE leads ADD COLUMN customer_name text;
  END IF;

  -- Add customer_phone alias for phone
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leads' AND column_name = 'customer_phone'
  ) THEN
    ALTER TABLE leads ADD COLUMN customer_phone text;
  END IF;

  -- Add conversion_value alias for amount
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leads' AND column_name = 'conversion_value'
  ) THEN
    ALTER TABLE leads ADD COLUMN conversion_value numeric(10,2) DEFAULT 0;
  END IF;

  -- Add external_reference alias for order_id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leads' AND column_name = 'external_reference'
  ) THEN
    ALTER TABLE leads ADD COLUMN external_reference text;
  END IF;

  -- Add metadata alias for raw_payload
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leads' AND column_name = 'metadata'
  ) THEN
    ALTER TABLE leads ADD COLUMN metadata jsonb;
  END IF;
END $$;

-- ============================================================================
-- 3. UPDATE AFFILIATE_LINKS TABLE
-- ============================================================================

DO $$
BEGIN
  -- Add stats columns
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'affiliate_links' AND column_name = 'clicks_count'
  ) THEN
    ALTER TABLE affiliate_links ADD COLUMN clicks_count integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'affiliate_links' AND column_name = 'conversions_count'
  ) THEN
    ALTER TABLE affiliate_links ADD COLUMN conversions_count integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'affiliate_links' AND column_name = 'total_earned'
  ) THEN
    ALTER TABLE affiliate_links ADD COLUMN total_earned numeric(10,2) DEFAULT 0;
  END IF;
END $$;

-- ============================================================================
-- 4. UPDATE COMMISSION_EVENTS TABLE
-- ============================================================================

DO $$
BEGIN
  -- Add affiliate_link_id if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'commission_events' AND column_name = 'affiliate_link_id'
  ) THEN
    ALTER TABLE commission_events ADD COLUMN affiliate_link_id uuid REFERENCES affiliate_links(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_commission_events_affiliate_link_id_v2 ON commission_events(affiliate_link_id);
  END IF;

  -- Add payment_method alias for paid_method
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'commission_events' AND column_name = 'payment_method'
  ) THEN
    ALTER TABLE commission_events ADD COLUMN payment_method text;
  END IF;

  -- Add payment_notes alias for paid_notes
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'commission_events' AND column_name = 'payment_notes'
  ) THEN
    ALTER TABLE commission_events ADD COLUMN payment_notes text;
  END IF;

  -- Add updated_at if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'commission_events' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE commission_events ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;

-- ============================================================================
-- 5. ADD STORAGE BUCKET FOR TAX DOCUMENTS
-- ============================================================================

-- Create storage bucket for tax documents if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('tax-docs', 'tax-docs', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for tax-docs bucket
DO $$
BEGIN
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "Users can upload own tax docs" ON storage.objects;
  DROP POLICY IF EXISTS "Users can view own tax docs" ON storage.objects;
  DROP POLICY IF EXISTS "Users can update own tax docs" ON storage.objects;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Users can upload their own tax documents
CREATE POLICY "Users can upload own tax docs"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'tax-docs' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can view their own tax documents
CREATE POLICY "Users can view own tax docs"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'tax-docs' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can update their own tax documents
CREATE POLICY "Users can update own tax docs"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'tax-docs' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================================================
-- 6. CREATE FUNCTION TO UPDATE AFFILIATE LINK STATS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_affiliate_link_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Update clicks_count when a new click is added
  IF TG_TABLE_NAME = 'clicks' AND TG_OP = 'INSERT' THEN
    UPDATE affiliate_links
    SET clicks_count = clicks_count + 1
    WHERE id = NEW.affiliate_link_id;
  END IF;

  -- Update conversions_count and total_earned when a new commission is added
  IF TG_TABLE_NAME = 'commission_events' AND TG_OP = 'INSERT' THEN
    UPDATE affiliate_links
    SET 
      conversions_count = conversions_count + 1,
      total_earned = total_earned + NEW.affiliate_commission_amount
    WHERE id = NEW.affiliate_link_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for auto-updating stats
DROP TRIGGER IF EXISTS trigger_update_clicks_count ON clicks;
CREATE TRIGGER trigger_update_clicks_count
  AFTER INSERT ON clicks
  FOR EACH ROW
  EXECUTE FUNCTION update_affiliate_link_stats();

DROP TRIGGER IF EXISTS trigger_update_conversions_count ON commission_events;
CREATE TRIGGER trigger_update_conversions_count
  AFTER INSERT ON commission_events
  FOR EACH ROW
  EXECUTE FUNCTION update_affiliate_link_stats();
