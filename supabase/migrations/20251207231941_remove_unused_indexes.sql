/*
  # Security Improvements: Remove Unused Indexes

  ## Overview
  This migration improves database performance by removing unused indexes that:
  - Consume storage space unnecessarily
  - Slow down INSERT, UPDATE, and DELETE operations
  - Provide no query performance benefit

  ## Changes

  ### Remove Unused Indexes
  The following indexes have been identified as unused and will be dropped:

  1. **call_click_logs table**
     - `idx_call_click_logs_clicked_by`
     - `idx_call_click_logs_connection`

  2. **calls table**
     - `idx_calls_connection`
     - `idx_calls_user`

  3. **connection_notes table**
     - `idx_connection_notes_connection`
     - `idx_connection_notes_user`

  4. **partner_tasks table**
     - `idx_partner_tasks_connection`
     - `idx_partner_tasks_due`

  5. **user_offers table**
     - `idx_user_offers_offer`

  6. **messages table**
     - `idx_messages_connection`
     - `idx_messages_thread`
     - `idx_messages_sender`
     - `idx_messages_recipient`
     - `idx_messages_unread`

  7. **offers table**
     - `idx_offers_business`

  8. **favorites table**
     - `idx_favorites_user`
     - `idx_favorites_partnership`

  9. **offer_vault table**
     - `idx_offer_vault_user_id`
     - `idx_offer_vault_user_business`

  10. **notifications table**
      - `idx_notifications_user`
      - `idx_notifications_unread`
      - `idx_notifications_created`

  ## Performance Impact
  - Improved write performance on affected tables
  - Reduced storage overhead
  - No negative impact on query performance (indexes were not being used)

  ## Security Notes
  - If any of these indexes are needed in the future, they can be recreated
  - Monitor query performance after deployment
*/

-- Drop unused indexes on call_click_logs table
DROP INDEX IF EXISTS idx_call_click_logs_clicked_by;
DROP INDEX IF EXISTS idx_call_click_logs_connection;

-- Drop unused indexes on calls table
DROP INDEX IF EXISTS idx_calls_connection;
DROP INDEX IF EXISTS idx_calls_user;

-- Drop unused indexes on connection_notes table
DROP INDEX IF EXISTS idx_connection_notes_connection;
DROP INDEX IF EXISTS idx_connection_notes_user;

-- Drop unused indexes on partner_tasks table
DROP INDEX IF EXISTS idx_partner_tasks_connection;
DROP INDEX IF EXISTS idx_partner_tasks_due;

-- Drop unused indexes on user_offers table
DROP INDEX IF EXISTS idx_user_offers_offer;

-- Drop unused indexes on messages table
DROP INDEX IF EXISTS idx_messages_connection;
DROP INDEX IF EXISTS idx_messages_thread;
DROP INDEX IF EXISTS idx_messages_sender;
DROP INDEX IF EXISTS idx_messages_recipient;
DROP INDEX IF EXISTS idx_messages_unread;

-- Drop unused indexes on offers table
DROP INDEX IF EXISTS idx_offers_business;

-- Drop unused indexes on favorites table
DROP INDEX IF EXISTS idx_favorites_user;
DROP INDEX IF EXISTS idx_favorites_partnership;

-- Drop unused indexes on offer_vault table
DROP INDEX IF EXISTS idx_offer_vault_user_id;
DROP INDEX IF EXISTS idx_offer_vault_user_business;

-- Drop unused indexes on notifications table
DROP INDEX IF EXISTS idx_notifications_user;
DROP INDEX IF EXISTS idx_notifications_unread;
DROP INDEX IF EXISTS idx_notifications_created;
