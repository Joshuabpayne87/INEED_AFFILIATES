-- =====================================================================
-- SAMPLE DATA FOR INEEDAFFILIATES.COM
-- Your User UUID: a37df4b7-3490-4c34-a6f6-83d5c9b7d289
-- =====================================================================

-- IMPORTANT: Run this SQL in your Supabase SQL Editor
-- This script bypasses RLS for sample data insertion

-- =====================================================================
-- 1. TEMPORARILY DISABLE RLS FOR DATA INSERTION
-- =====================================================================

-- Disable RLS on tables we need to insert into
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE businesses DISABLE ROW LEVEL SECURITY;
ALTER TABLE offers DISABLE ROW LEVEL SECURITY;
ALTER TABLE offer_vault DISABLE ROW LEVEL SECURITY;
ALTER TABLE favorites DISABLE ROW LEVEL SECURITY;
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE terms_acceptances DISABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_links DISABLE ROW LEVEL SECURITY;
ALTER TABLE clicks DISABLE ROW LEVEL SECURITY;
ALTER TABLE leads DISABLE ROW LEVEL SECURITY;
ALTER TABLE commission_events DISABLE ROW LEVEL SECURITY;

-- =====================================================================
-- 2. CREATE AUTH USER (if not exists)
-- =====================================================================

-- First create the auth.users entry (needed for foreign key)
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
)
VALUES (
  'a37df4b7-3490-4c34-a6f6-83d5c9b7d289',
  '00000000-0000-0000-0000-000000000000',
  'joshua@example.com',
  crypt('Password123!', gen_salt('bf')),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{"first_name":"Joshua","last_name":"Test"}',
  NOW(),
  NOW(),
  '',
  '',
  '',
  ''
)
ON CONFLICT (id) DO NOTHING;

-- =====================================================================
-- 3. SAMPLE USER PROFILE
-- =====================================================================

INSERT INTO users (id, first_name, last_name, email, photo_url, role, subscription_tier, subscription_status)
VALUES
  ('a37df4b7-3490-4c34-a6f6-83d5c9b7d289', 'Joshua', 'Test', 'joshua@example.com', 'https://api.dicebear.com/7.x/avataaars/svg?seed=joshua', 'user', 'pro', 'active')
ON CONFLICT (id) DO UPDATE SET
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  subscription_tier = EXCLUDED.subscription_tier;


-- =====================================================================
-- 4. SAMPLE BUSINESS FOR YOUR USER
-- =====================================================================

INSERT INTO businesses (
  id,
  owner_user_id,
  business_name,
  industry,
  niche,
  target_audience,
  website_url,
  offer_summary,
  offer_type,
  price_point,
  email_list_size,
  social_following_size,
  booking_link,
  affiliate_signup_link,
  is_profile_published,
  collaboration_types,
  affiliate_commission_type,
  affiliate_commission_value,
  ina_commission_type,
  ina_commission_value,
  is_live
)
VALUES (
  'b1111111-1111-1111-1111-111111111111',
  'a37df4b7-3490-4c34-a6f6-83d5c9b7d289',
  'Digital Growth Agency',
  'Marketing',
  'SaaS Marketing',
  'B2B SaaS companies looking to scale',
  'https://digitalgrowthagency.com',
  'Full-service SaaS marketing including paid ads, content marketing, and conversion optimization',
  'Service',
  '$5,000 - $15,000/mo',
  15000,
  25000,
  'https://calendly.com/digitalgrowth',
  'https://digitalgrowthagency.com/affiliates',
  true,
  ARRAY['Affiliate', 'JV Webinar', 'Podcast Swap', 'Email Swap'],
  'percent',
  15,
  'percent',
  5,
  true
)
ON CONFLICT (id) DO UPDATE SET
  business_name = EXCLUDED.business_name,
  industry = EXCLUDED.industry;


-- =====================================================================
-- 5. SAMPLE OFFERS FROM YOUR BUSINESS
-- =====================================================================

INSERT INTO offers (
  id,
  business_id,
  offer_name,
  description,
  price_point,
  commission_percent,
  offer_type,
  promo_methods,
  resources_link,
  affiliate_signup_link,
  is_active
)
VALUES
  (
    'o1111111-1111-1111-1111-111111111111',
    'b1111111-1111-1111-1111-111111111111',
    'SaaS Growth Accelerator Program',
    'Our flagship 6-month program that helps SaaS companies 3x their MRR through paid acquisition and conversion optimization. Includes weekly coaching calls, custom strategy, and done-for-you implementation.',
    '$15,000',
    20,
    'High-Ticket Service',
    ARRAY['Email', 'Webinar', 'Podcast', 'Social Media'],
    'https://digitalgrowthagency.com/affiliate-resources',
    'https://digitalgrowthagency.com/affiliate-signup',
    true
  ),
  (
    'o2222222-2222-2222-2222-222222222222',
    'b1111111-1111-1111-1111-111111111111',
    'Paid Ads Audit & Strategy',
    'Comprehensive audit of existing paid advertising campaigns with actionable recommendations. Perfect entry point for new clients.',
    '$2,500',
    15,
    'Service',
    ARRAY['Email', 'Content', 'Social Media'],
    'https://digitalgrowthagency.com/audit-resources',
    'https://digitalgrowthagency.com/affiliate-signup',
    true
  ),
  (
    'o3333333-3333-3333-3333-333333333333',
    'b1111111-1111-1111-1111-111111111111',
    'SaaS Marketing Course',
    'Self-paced video course teaching SaaS founders and marketers the exact strategies we use with clients. Includes templates and frameworks.',
    '$997',
    40,
    'Digital Product',
    ARRAY['Email', 'Content', 'YouTube', 'Podcast'],
    'https://digitalgrowthagency.com/course-resources',
    'https://digitalgrowthagency.com/affiliate-signup',
    true
  )
ON CONFLICT (id) DO UPDATE SET
  offer_name = EXCLUDED.offer_name;


-- =====================================================================
-- 6. SAMPLE OFFER VAULT ENTRIES (Offers you're promoting)
-- =====================================================================

INSERT INTO offer_vault (
  id,
  user_id,
  offer_id,
  business_id,
  offer_name,
  company_name,
  partner_name,
  price,
  commission,
  target_client,
  commission_type,
  affiliate_signup_link,
  portal_login_link,
  affiliate_link,
  status
)
VALUES
  (
    'v1111111-1111-1111-1111-111111111111',
    'a37df4b7-3490-4c34-a6f6-83d5c9b7d289',
    'external-offer-1',
    'external-business-1',
    'AI Content Writing Tool',
    'ContentAI Pro',
    'Mark Thompson',
    '$49/mo',
    '30% Recurring',
    'Content marketers and bloggers',
    'Recurring',
    'https://contentaipro.com/affiliates',
    'https://contentaipro.com/portal',
    'https://contentaipro.com/?ref=joshua123',
    'approved'
  ),
  (
    'v2222222-2222-2222-2222-222222222222',
    'a37df4b7-3490-4c34-a6f6-83d5c9b7d289',
    'external-offer-2',
    'external-business-2',
    'Sales CRM Suite',
    'SalesFlow HQ',
    'Jennifer Adams',
    '$199/mo',
    '25% First Year',
    'Sales teams and agencies',
    'Recurring',
    'https://salesflowhq.com/partners',
    'https://salesflowhq.com/affiliate-portal',
    'https://salesflowhq.com/?aff=dga',
    'approved'
  ),
  (
    'v3333333-3333-3333-3333-333333333333',
    'a37df4b7-3490-4c34-a6f6-83d5c9b7d289',
    'external-offer-3',
    'external-business-3',
    'Webinar Platform Pro',
    'WebinarGenius',
    'Alex Rivera',
    '$297/mo',
    '$100 per sale',
    'Coaches, consultants, course creators',
    'One-time',
    'https://webinargenius.com/affiliate-program',
    '',
    '',
    'pending_connection'
  )
ON CONFLICT (user_id, offer_id) DO UPDATE SET
  offer_name = EXCLUDED.offer_name;


-- =====================================================================
-- 7. SAMPLE FAVORITES (Bookmarked partnerships)
-- =====================================================================

INSERT INTO favorites (id, user_id, partnership_id)
VALUES
  ('f1111111-1111-1111-1111-111111111111', 'a37df4b7-3490-4c34-a6f6-83d5c9b7d289', 'b1111111-1111-1111-1111-111111111111')
ON CONFLICT (user_id, partnership_id) DO NOTHING;


-- =====================================================================
-- 8. SAMPLE NOTIFICATIONS (using valid types from constraint)
-- =====================================================================

INSERT INTO notifications (id, user_id, type, title, message, link, is_read)
VALUES
  (
    'n1111111-1111-1111-1111-111111111111',
    'a37df4b7-3490-4c34-a6f6-83d5c9b7d289',
    'offer_match',
    'New Offer Match!',
    'ContentAI Pro has a new offer that matches your audience profile. Check it out!',
    '/marketplace',
    false
  ),
  (
    'n2222222-2222-2222-2222-222222222222',
    'a37df4b7-3490-4c34-a6f6-83d5c9b7d289',
    'payment_success',
    'Commission Paid!',
    'Your $150 commission from SalesFlow HQ has been paid to your account.',
    '/earnings',
    false
  ),
  (
    'n3333333-3333-3333-3333-333333333333',
    'a37df4b7-3490-4c34-a6f6-83d5c9b7d289',
    'connection_request',
    'New Connection Request',
    'Sarah Johnson from Marketing Mastery wants to connect with you.',
    '/partners',
    true
  ),
  (
    'n4444444-4444-4444-4444-444444444444',
    'a37df4b7-3490-4c34-a6f6-83d5c9b7d289',
    'connection_accepted',
    'Connection Accepted!',
    'Michael Chen from Tech Solutions accepted your connection request.',
    '/partners',
    true
  )
ON CONFLICT (id) DO NOTHING;


-- =====================================================================
-- 9. SAMPLE TERMS ACCEPTANCE
-- =====================================================================

INSERT INTO terms_acceptances (id, user_id, terms_version, privacy_version, ip_address, user_agent)
VALUES (
  'ta111111-1111-1111-1111-111111111111',
  'a37df4b7-3490-4c34-a6f6-83d5c9b7d289',
  '1.3',
  '1.0',
  '192.168.1.1',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0'
)
ON CONFLICT (id) DO NOTHING;


-- =====================================================================
-- 10. SAMPLE AFFILIATE LINKS (for your offers)
-- =====================================================================

INSERT INTO affiliate_links (
  id,
  offer_id,
  business_id,
  affiliate_user_id,
  public_code,
  tracking_domain,
  tracking_url,
  destination_url
)
VALUES
  (
    'al111111-1111-1111-1111-111111111111',
    'o1111111-1111-1111-1111-111111111111',
    'b1111111-1111-1111-1111-111111111111',
    'a37df4b7-3490-4c34-a6f6-83d5c9b7d289',
    'DGA-ACCEL-001',
    'prtnr.live',
    'https://prtnr.live/DGA-ACCEL-001',
    'https://digitalgrowthagency.com/accelerator'
  ),
  (
    'al222222-2222-2222-2222-222222222222',
    'o2222222-2222-2222-2222-222222222222',
    'b1111111-1111-1111-1111-111111111111',
    'a37df4b7-3490-4c34-a6f6-83d5c9b7d289',
    'DGA-AUDIT-001',
    'prtnr.live',
    'https://prtnr.live/DGA-AUDIT-001',
    'https://digitalgrowthagency.com/audit'
  )
ON CONFLICT (offer_id, affiliate_user_id) DO UPDATE SET
  public_code = EXCLUDED.public_code;


-- =====================================================================
-- 11. SAMPLE CLICKS (tracking data)
-- =====================================================================

INSERT INTO clicks (
  id,
  click_id,
  public_code,
  offer_id,
  business_id,
  affiliate_user_id,
  ip_address,
  user_agent,
  utm_source,
  utm_medium,
  utm_campaign,
  referrer,
  created_at
)
VALUES
  (
    'cl111111-1111-1111-1111-111111111111',
    'clk_abc123def456',
    'DGA-ACCEL-001',
    'o1111111-1111-1111-1111-111111111111',
    'b1111111-1111-1111-1111-111111111111',
    'a37df4b7-3490-4c34-a6f6-83d5c9b7d289',
    '203.0.113.42',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    'newsletter',
    'email',
    'december_promo',
    'https://mail.google.com',
    NOW() - INTERVAL '5 days'
  ),
  (
    'cl222222-2222-2222-2222-222222222222',
    'clk_ghi789jkl012',
    'DGA-ACCEL-001',
    'o1111111-1111-1111-1111-111111111111',
    'b1111111-1111-1111-1111-111111111111',
    'a37df4b7-3490-4c34-a6f6-83d5c9b7d289',
    '198.51.100.15',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    'twitter',
    'social',
    'organic',
    'https://twitter.com',
    NOW() - INTERVAL '3 days'
  ),
  (
    'cl333333-3333-3333-3333-333333333333',
    'clk_mno345pqr678',
    'DGA-AUDIT-001',
    'o2222222-2222-2222-2222-222222222222',
    'b1111111-1111-1111-1111-111111111111',
    'a37df4b7-3490-4c34-a6f6-83d5c9b7d289',
    '192.0.2.88',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)',
    'podcast',
    'audio',
    'guest_appearance',
    'https://podcasts.apple.com',
    NOW() - INTERVAL '1 day'
  )
ON CONFLICT (click_id) DO NOTHING;


-- =====================================================================
-- 12. SAMPLE LEADS (conversions)
-- =====================================================================

INSERT INTO leads (
  id,
  offer_id,
  business_id,
  affiliate_user_id,
  click_id,
  event_type,
  email,
  first_name,
  last_name,
  phone,
  amount,
  currency,
  order_id,
  created_at
)
VALUES
  (
    'ld111111-1111-1111-1111-111111111111',
    'o1111111-1111-1111-1111-111111111111',
    'b1111111-1111-1111-1111-111111111111',
    'a37df4b7-3490-4c34-a6f6-83d5c9b7d289',
    'clk_abc123def456',
    'booked_call',
    'prospect1@example.com',
    'Robert',
    'Williams',
    '+1-555-0123',
    0,
    'USD',
    NULL,
    NOW() - INTERVAL '4 days'
  ),
  (
    'ld222222-2222-2222-2222-222222222222',
    'o1111111-1111-1111-1111-111111111111',
    'b1111111-1111-1111-1111-111111111111',
    'a37df4b7-3490-4c34-a6f6-83d5c9b7d289',
    'clk_abc123def456',
    'purchase',
    'prospect1@example.com',
    'Robert',
    'Williams',
    '+1-555-0123',
    15000,
    'USD',
    'ORD-2024-001',
    NOW() - INTERVAL '2 days'
  ),
  (
    'ld333333-3333-3333-3333-333333333333',
    'o2222222-2222-2222-2222-222222222222',
    'b1111111-1111-1111-1111-111111111111',
    'a37df4b7-3490-4c34-a6f6-83d5c9b7d289',
    'clk_mno345pqr678',
    'lead',
    'prospect2@example.com',
    'Amanda',
    'Garcia',
    '+1-555-0456',
    0,
    'USD',
    NULL,
    NOW() - INTERVAL '12 hours'
  )
ON CONFLICT (id) DO NOTHING;


-- =====================================================================
-- 13. SAMPLE COMMISSION EVENTS
-- =====================================================================

INSERT INTO commission_events (
  id,
  business_id,
  offer_id,
  affiliate_user_id,
  lead_id,
  click_id,
  affiliate_commission_amount,
  ina_commission_amount,
  currency,
  status,
  payable_at,
  paid_at,
  paid_method
)
VALUES
  (
    'ce111111-1111-1111-1111-111111111111',
    'b1111111-1111-1111-1111-111111111111',
    'o1111111-1111-1111-1111-111111111111',
    'a37df4b7-3490-4c34-a6f6-83d5c9b7d289',
    'ld222222-2222-2222-2222-222222222222',
    'clk_abc123def456',
    3000.00,
    750.00,
    'USD',
    'paid',
    NOW() - INTERVAL '2 days',
    NOW() - INTERVAL '1 day',
    'bank_transfer'
  ),
  (
    'ce222222-2222-2222-2222-222222222222',
    'b1111111-1111-1111-1111-111111111111',
    'o2222222-2222-2222-2222-222222222222',
    'a37df4b7-3490-4c34-a6f6-83d5c9b7d289',
    'ld333333-3333-3333-3333-333333333333',
    'clk_mno345pqr678',
    375.00,
    125.00,
    'USD',
    'payable',
    NOW(),
    NULL,
    NULL
  )
ON CONFLICT (id) DO NOTHING;


-- =====================================================================
-- 14. RE-ENABLE RLS ON ALL TABLES
-- =====================================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE offer_vault ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE terms_acceptances ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_events ENABLE ROW LEVEL SECURITY;


-- =====================================================================
-- VERIFICATION QUERIES
-- Run these to verify the data was inserted correctly
-- =====================================================================

-- Check user data
SELECT 'users' as table_name, COUNT(*) as count FROM users WHERE id = 'a37df4b7-3490-4c34-a6f6-83d5c9b7d289'
UNION ALL
SELECT 'businesses', COUNT(*) FROM businesses WHERE owner_user_id = 'a37df4b7-3490-4c34-a6f6-83d5c9b7d289'
UNION ALL
SELECT 'offers', COUNT(*) FROM offers WHERE business_id = 'b1111111-1111-1111-1111-111111111111'
UNION ALL
SELECT 'offer_vault', COUNT(*) FROM offer_vault WHERE user_id = 'a37df4b7-3490-4c34-a6f6-83d5c9b7d289'
UNION ALL
SELECT 'notifications', COUNT(*) FROM notifications WHERE user_id = 'a37df4b7-3490-4c34-a6f6-83d5c9b7d289'
UNION ALL
SELECT 'affiliate_links', COUNT(*) FROM affiliate_links WHERE affiliate_user_id = 'a37df4b7-3490-4c34-a6f6-83d5c9b7d289'
UNION ALL
SELECT 'clicks', COUNT(*) FROM clicks WHERE affiliate_user_id = 'a37df4b7-3490-4c34-a6f6-83d5c9b7d289'
UNION ALL
SELECT 'leads', COUNT(*) FROM leads WHERE affiliate_user_id = 'a37df4b7-3490-4c34-a6f6-83d5c9b7d289'
UNION ALL
SELECT 'commission_events', COUNT(*) FROM commission_events WHERE affiliate_user_id = 'a37df4b7-3490-4c34-a6f6-83d5c9b7d289';

-- =====================================================================
-- END OF SAMPLE DATA
-- =====================================================================
