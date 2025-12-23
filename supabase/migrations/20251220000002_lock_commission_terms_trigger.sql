/*
  # Lock Commission Terms Trigger

  Automatically locks commission terms when the first commission event is created for a business.
  This prevents businesses from changing commission rates after they've been used.
*/

-- Function to lock commission terms on first commission event
CREATE OR REPLACE FUNCTION lock_commission_terms_on_first_commission()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if this is the first commission event for this business
  -- If so, lock the commission terms
  UPDATE businesses
  SET 
    commission_terms_locked = true,
    commission_terms_locked_at = COALESCE(commission_terms_locked_at, now())
  WHERE id = NEW.business_id
    AND commission_terms_locked = false
    AND (
      -- This is the first commission event (no other commission events exist)
      (SELECT COUNT(*) FROM commission_events WHERE business_id = NEW.business_id) = 1
      OR commission_terms_locked_at IS NULL
    );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_lock_commission_terms ON commission_events;
CREATE TRIGGER trigger_lock_commission_terms
  AFTER INSERT ON commission_events
  FOR EACH ROW
  EXECUTE FUNCTION lock_commission_terms_on_first_commission();


