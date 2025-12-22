/*
  # Link Offer Vault to Affiliate Links

  This migration adds support for linking offer_vault entries to affiliate_links
  and ensures type consistency for offer_id.
*/

-- Add affiliate_link_id to offer_vault for direct reference
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'offer_vault' AND column_name = 'affiliate_link_id'
  ) THEN
    ALTER TABLE offer_vault ADD COLUMN affiliate_link_id uuid REFERENCES affiliate_links(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_offer_vault_affiliate_link_id ON offer_vault(affiliate_link_id);
  END IF;
END $$;

