/*
  # Add Remaining Foreign Key Indexes

  ## Changes Made

  ### Add Missing Foreign Key Indexes
  
  Adding indexes for foreign keys that were missed in the previous migration:
  - `connections`: recipient_user_id, requester_user_id
  - `crm_cards`: connection_id, partner_user_id

  ## Notes
  
  - The previously created indexes showing as "unused" are expected - they haven't been 
    queried yet but will be used as the application runs
  - These indexes are critical for query performance and should NOT be removed
  - Foreign key indexes significantly improve JOIN performance and foreign key constraint checks
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
CREATE INDEX IF NOT EXISTS idx_crm_cards_connection_id_fk 
  ON crm_cards(connection_id);

CREATE INDEX IF NOT EXISTS idx_crm_cards_partner_user_id_fk 
  ON crm_cards(partner_user_id);
