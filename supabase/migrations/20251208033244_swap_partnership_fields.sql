/*
  # Swap Partnership Fields and Convert Types

  ## Overview
  This migration swaps the usage of partnership fields to better align with user needs.
  The "Looking For" field becomes free text for specificity, while "Partnership Opportunities"
  becomes a structured list.

  ## Changes Made

  1. **Convert partnership_opportunities from array to text**
     - Changes `partnership_opportunities` from text[] to text (free text field)
     - Preserves existing data by converting arrays to comma-separated strings
     - This field will now display under "Looking For" label in the UI

  2. **Keep looking_for as array**
     - Remains as text[] (no changes to structure)
     - This field will now display under "Partnership Opportunities" label in the UI

  ## Field Mapping After Migration
  - Database field `partnership_opportunities` (text) → UI label "Looking For"
  - Database field `looking_for` (text[]) → UI label "Partnership Opportunities"

  ## Data Preservation
  - All existing array data in partnership_opportunities is converted to comma-separated text
  - No data loss occurs during this migration
  - Rollback is possible by recreating the array from comma-separated values

  ## Security
  - RLS policies remain unchanged
  - No new security considerations
*/

-- Step 1: Create a temporary column to hold the converted data
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS partnership_opportunities_temp text;

-- Step 2: Convert existing partnership_opportunities array data to comma-separated text
UPDATE businesses
SET partnership_opportunities_temp = array_to_string(partnership_opportunities, ', ')
WHERE partnership_opportunities IS NOT NULL AND array_length(partnership_opportunities, 1) > 0;

-- Step 3: Drop the old array column
ALTER TABLE businesses DROP COLUMN IF EXISTS partnership_opportunities;

-- Step 4: Rename the temp column to the original name
ALTER TABLE businesses RENAME COLUMN partnership_opportunities_temp TO partnership_opportunities;

-- Add comment to document the field's new purpose
COMMENT ON COLUMN businesses.partnership_opportunities IS 'Free text field describing what the business is looking for in partners. Displayed under "Looking For" label in UI.';
COMMENT ON COLUMN businesses.looking_for IS 'Array of partnership opportunity types offered by the business. Displayed under "Partnership Opportunities" label in UI.';
