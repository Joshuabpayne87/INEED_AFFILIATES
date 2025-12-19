/*
  # Add Missing Foreign Key Indexes

  ## Changes Made

  ### 1. Add Missing Foreign Key Indexes
  These indexes were previously removed but are needed for optimal foreign key query performance.
  
  New indexes added for:
  - `connections`: recipient_user_id, requester_user_id
  - `crm_cards`: connection_id, partner_user_id

  ## Important Notes
  
  ### About "Unused" Indexes
  The system reports many indexes as "unused" because:
  - They are newly created and haven't been exercised by queries yet
  - The database is in development/testing phase
  - These indexes ARE necessary for foreign key performance in production
  
  DO NOT remove indexes on foreign key columns. They are critical for:
  - JOIN operations performance
  - CASCADE delete/update operations
  - Preventing table locks during foreign key checks
  
  ### Leaked Password Protection
  This security feature must be enabled manually through the Supabase Dashboard:
  1. Navigate to: Authentication → Settings
  2. Enable: "Leaked Password Protection"
  3. This prevents users from using passwords found in breach databases
*/

-- =====================================================
-- ADD MISSING FOREIGN KEY INDEXES
-- =====================================================

-- connections table indexes
CREATE INDEX IF NOT EXISTS idx_connections_recipient_user_id 
  ON connections(recipient_user_id);

CREATE INDEX IF NOT EXISTS idx_connections_requester_user_id 
  ON connections(requester_user_id);

-- crm_cards table indexes
CREATE INDEX IF NOT EXISTS idx_crm_cards_connection_id 
  ON crm_cards(connection_id);

CREATE INDEX IF NOT EXISTS idx_crm_cards_partner_user_id 
  ON crm_cards(partner_user_id);
