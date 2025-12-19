-- Create offer affiliate clicks tracking table
CREATE TABLE IF NOT EXISTS offer_affiliate_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id UUID NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
  affiliate_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  clicked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT,
  referrer_url TEXT,
  converted BOOLEAN DEFAULT FALSE,
  converted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create offer affiliate codes table for short URLs (prtnr.live)
CREATE TABLE IF NOT EXISTS offer_affiliate_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  offer_id UUID NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
  short_code VARCHAR(12) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, offer_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_offer_affiliate_clicks_offer ON offer_affiliate_clicks(offer_id);
CREATE INDEX IF NOT EXISTS idx_offer_affiliate_clicks_user ON offer_affiliate_clicks(affiliate_user_id);
CREATE INDEX IF NOT EXISTS idx_offer_affiliate_clicks_date ON offer_affiliate_clicks(clicked_at);
CREATE INDEX IF NOT EXISTS idx_offer_affiliate_codes_short ON offer_affiliate_codes(short_code);
CREATE INDEX IF NOT EXISTS idx_offer_affiliate_codes_user_offer ON offer_affiliate_codes(user_id, offer_id);

-- Enable RLS
ALTER TABLE offer_affiliate_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE offer_affiliate_codes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for offer_affiliate_clicks
-- Users can view their own affiliate click data
CREATE POLICY "Users can view their own affiliate clicks"
  ON offer_affiliate_clicks FOR SELECT
  USING (affiliate_user_id = auth.uid());

-- Anyone can insert clicks (for tracking)
CREATE POLICY "Anyone can track affiliate clicks"
  ON offer_affiliate_clicks FOR INSERT
  WITH CHECK (true);

-- RLS Policies for offer_affiliate_codes
-- Users can view their own affiliate codes
CREATE POLICY "Users can view their own affiliate codes"
  ON offer_affiliate_codes FOR SELECT
  USING (user_id = auth.uid());

-- Users can create affiliate codes for themselves
CREATE POLICY "Users can create their own affiliate codes"
  ON offer_affiliate_codes FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Function to generate a short affiliate code
CREATE OR REPLACE FUNCTION generate_offer_affiliate_code()
RETURNS VARCHAR(12) AS $$
DECLARE
  chars VARCHAR := 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  result VARCHAR := '';
  i INTEGER;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to get or create affiliate code for user+offer
CREATE OR REPLACE FUNCTION get_or_create_offer_affiliate_code(p_user_id UUID, p_offer_id UUID)
RETURNS VARCHAR(12) AS $$
DECLARE
  existing_code VARCHAR(12);
  new_code VARCHAR(12);
  attempts INTEGER := 0;
BEGIN
  -- Check if code already exists
  SELECT short_code INTO existing_code
  FROM offer_affiliate_codes
  WHERE user_id = p_user_id AND offer_id = p_offer_id;

  IF existing_code IS NOT NULL THEN
    RETURN existing_code;
  END IF;

  -- Generate new unique code
  LOOP
    new_code := generate_offer_affiliate_code();
    attempts := attempts + 1;

    BEGIN
      INSERT INTO offer_affiliate_codes (user_id, offer_id, short_code)
      VALUES (p_user_id, p_offer_id, new_code);
      RETURN new_code;
    EXCEPTION WHEN unique_violation THEN
      IF attempts > 10 THEN
        RAISE EXCEPTION 'Failed to generate unique affiliate code';
      END IF;
    END;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION get_or_create_offer_affiliate_code(UUID, UUID) TO authenticated;
