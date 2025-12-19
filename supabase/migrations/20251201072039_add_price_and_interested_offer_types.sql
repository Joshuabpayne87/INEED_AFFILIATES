/*
  # Add Price and Interested Offer Types Fields

  ## Overview
  This migration adds support for offer pricing and user offer type preferences to improve
  the offer marketplace experience and enable AI-powered offer matching.

  ## Changes Made

  1. **New Column: interested_offer_types**
     - Added to `businesses` table
     - Type: text[] (array of strings)
     - Purpose: Stores the types of offers a business owner is interested in promoting
     - Example values: ['SaaS tools', 'Coaching programs', 'High-ticket offers']
     - Optional field (nullable)

  2. **Updated JSONB Structure: primary_offers**
     - Added `price` field to the primary_offers JSONB array structure
     - Type: text (stored as part of JSONB)
     - Purpose: Displays offer pricing in marketplace and business profiles
     - Example values: '$297/mo', '$5,000-$15,000', '$3,500'
     - Optional field

  ## Benefits
  - **Better Offer Discovery**: Users can filter and sort offers by price range
  - **AI Matching**: System can suggest relevant offers based on user preferences
  - **Transparency**: Clear pricing information helps partners make informed decisions
  - **User Experience**: Personalized offer recommendations improve marketplace engagement

  ## Notes
  - These fields are optional and do not affect existing profile completion requirements
  - No data migration needed as fields are nullable
  - Existing primary_offers JSONB data remains valid (price field is optional)
  - RLS policies remain unchanged as no new tables were created
*/

-- Add interested_offer_types column to businesses table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'interested_offer_types'
  ) THEN
    ALTER TABLE businesses ADD COLUMN interested_offer_types text[];
  END IF;
END $$;

-- Add comment to document the new column
COMMENT ON COLUMN businesses.interested_offer_types IS 'Array of offer types the business is interested in promoting (e.g., SaaS tools, Coaching programs). Used for AI offer matching in marketplace.';
