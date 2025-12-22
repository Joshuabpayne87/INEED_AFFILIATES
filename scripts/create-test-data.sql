-- Create Test Data for Affiliate Tracking
-- Run this in Supabase SQL Editor

-- Create first test user (you'll need to create these via Auth UI or use existing users)
-- For now, we'll assume you have user IDs or will create users manually
-- This script creates the businesses and offers

-- First, let's create test users via auth (if they don't exist)
-- Note: You may need to create these users manually via Supabase Auth UI first
-- Then replace the user IDs below with the actual user IDs

-- Example: Create users (you'll need to do this via Supabase Dashboard > Authentication > Users)
-- Or use the Supabase Auth API

-- For this script, we'll use a helper function to get or create users
-- But first, let's create the businesses and offers assuming users exist

-- If you need to create users first, use this pattern:
-- INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
-- VALUES 
--   (gen_random_uuid(), 'test-business1@ineedaffiliates.com', crypt('Test123!@#', gen_salt('bf')), now(), now(), now()),
--   (gen_random_uuid(), 'test-business2@ineedaffiliates.com', crypt('Test123!@#', gen_salt('bf')), now(), now(), now());

-- For now, let's create a simpler approach - create businesses with placeholder user IDs
-- You can replace these with actual user IDs after creating users

DO $$
DECLARE
  user1_id uuid;
  user2_id uuid;
  business1_id uuid;
  business2_id uuid;
  offer1_id uuid;
  offer2_id uuid;
BEGIN
  -- Create or get user 1
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_user_meta_data)
  VALUES (
    gen_random_uuid(),
    'test-business1@ineedaffiliates.com',
    crypt('Test123!@#', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"first_name": "John", "last_name": "Business"}'::jsonb
  )
  ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
  RETURNING id INTO user1_id;

  -- Create or get user 2
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_user_meta_data)
  VALUES (
    gen_random_uuid(),
    'test-business2@ineedaffiliates.com',
    crypt('Test123!@#', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"first_name": "Sarah", "last_name": "Entrepreneur"}'::jsonb
  )
  ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
  RETURNING id INTO user2_id;

  -- Get user IDs if they already exist
  IF user1_id IS NULL THEN
    SELECT id INTO user1_id FROM auth.users WHERE email = 'test-business1@ineedaffiliates.com';
  END IF;
  
  IF user2_id IS NULL THEN
    SELECT id INTO user2_id FROM auth.users WHERE email = 'test-business2@ineedaffiliates.com';
  END IF;

  -- Create user profiles
  INSERT INTO users (id, email, first_name, last_name)
  VALUES 
    (user1_id, 'test-business1@ineedaffiliates.com', 'John', 'Business'),
    (user2_id, 'test-business2@ineedaffiliates.com', 'Sarah', 'Entrepreneur')
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name;

  -- Create Business 1
  INSERT INTO businesses (
    owner_user_id,
    company_name,
    business_name,
    tagline,
    industry,
    niche,
    website,
    description,
    main_offer_type,
    monetization_type,
    target_audience,
    is_profile_published,
    is_live,
    affiliate_commission_type,
    affiliate_commission_value,
    ina_commission_type,
    ina_commission_value,
    commission_currency
  )
  VALUES (
    user1_id,
    'Premium Coaching Co.',
    'Premium Coaching Co.',
    'Transform your business with expert coaching',
    'Coaching & Consulting',
    'Business Coaching',
    'https://premiumcoaching.example.com',
    'We provide world-class business coaching services to help entrepreneurs scale their businesses.',
    'Coaching Program',
    'Coaching Services',
    'Entrepreneurs and business owners',
    true,
    true,
    'percent',
    30,
    'percent',
    10,
    'USD'
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO business1_id;

  -- Get business1_id if it already exists
  IF business1_id IS NULL THEN
    SELECT id INTO business1_id FROM businesses WHERE owner_user_id = user1_id LIMIT 1;
  END IF;

  -- Create Business 2
  INSERT INTO businesses (
    owner_user_id,
    company_name,
    business_name,
    tagline,
    industry,
    niche,
    website,
    description,
    main_offer_type,
    monetization_type,
    target_audience,
    is_profile_published,
    is_live,
    affiliate_commission_type,
    affiliate_commission_value,
    ina_commission_type,
    ina_commission_value,
    commission_currency
  )
  VALUES (
    user2_id,
    'SaaS Solutions Inc.',
    'SaaS Solutions Inc.',
    'Powerful SaaS tools for modern businesses',
    'SaaS Companies',
    'Business Software',
    'https://saassolutions.example.com',
    'We build cutting-edge SaaS products that help businesses automate and scale.',
    'SaaS Subscription',
    'SaaS Subscriptions',
    'Small to medium businesses',
    true,
    true,
    'percent',
    25,
    'percent',
    10,
    'USD'
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO business2_id;

  -- Get business2_id if it already exists
  IF business2_id IS NULL THEN
    SELECT id INTO business2_id FROM businesses WHERE owner_user_id = user2_id LIMIT 1;
  END IF;

  -- Create Offer 1
  INSERT INTO offers (
    business_id,
    offer_name,
    description,
    price_point,
    commission_percent,
    offer_type,
    promo_methods,
    affiliate_signup_link,
    purchase_affiliate_link,
    commission_type,
    commission_duration,
    is_active
  )
  VALUES (
    business1_id,
    'Premium Business Coaching Program',
    'A comprehensive 12-week business coaching program designed to help you scale your business and achieve your goals.',
    '$2,997',
    30,
    'Coaching Program',
    ARRAY['Email', 'Webinar', 'Social Media'],
    'https://premiumcoaching.example.com/affiliate-signup',
    'https://premiumcoaching.example.com/checkout',
    'Recurring',
    'As long as customer keeps paying',
    true
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO offer1_id;

  -- Get offer1_id if it already exists
  IF offer1_id IS NULL THEN
    SELECT id INTO offer1_id FROM offers WHERE business_id = business1_id AND offer_name = 'Premium Business Coaching Program' LIMIT 1;
  END IF;

  -- Create price options for offer 1
  INSERT INTO offer_price_options (offer_id, amount, currency, frequency, sort_order)
  VALUES 
    (offer1_id, 2997, 'USD', 'one_time', 0),
    (offer1_id, 997, 'USD', 'per_month', 1)
  ON CONFLICT DO NOTHING;

  -- Create Offer 2
  INSERT INTO offers (
    business_id,
    offer_name,
    description,
    price_point,
    commission_percent,
    offer_type,
    promo_methods,
    affiliate_signup_link,
    purchase_affiliate_link,
    commission_type,
    commission_duration,
    is_active
  )
  VALUES (
    business2_id,
    'Business Automation Suite',
    'Complete SaaS suite for automating your business operations. Includes CRM, project management, and analytics.',
    '$97/month',
    25,
    'SaaS Subscription',
    ARRAY['Email', 'Blog Post', 'YouTube', 'White-Label'],
    'https://saassolutions.example.com/affiliate-signup',
    'https://saassolutions.example.com/signup',
    'Recurring',
    'As long as customer keeps paying',
    true
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO offer2_id;

  -- Get offer2_id if it already exists
  IF offer2_id IS NULL THEN
    SELECT id INTO offer2_id FROM offers WHERE business_id = business2_id AND offer_name = 'Business Automation Suite' LIMIT 1;
  END IF;

  -- Create price options for offer 2
  INSERT INTO offer_price_options (offer_id, amount, currency, frequency, sort_order)
  VALUES 
    (offer2_id, 97, 'USD', 'per_month', 0),
    (offer2_id, 970, 'USD', 'per_year', 1)
  ON CONFLICT DO NOTHING;

  RAISE NOTICE 'Test data created successfully!';
  RAISE NOTICE 'User 1 ID: %', user1_id;
  RAISE NOTICE 'User 2 ID: %', user2_id;
  RAISE NOTICE 'Business 1 ID: %', business1_id;
  RAISE NOTICE 'Business 2 ID: %', business2_id;
  RAISE NOTICE 'Offer 1 ID: %', offer1_id;
  RAISE NOTICE 'Offer 2 ID: %', offer2_id;
END $$;

-- Display created accounts
SELECT 
  u.email,
  u.first_name || ' ' || u.last_name as name,
  b.company_name,
  COUNT(o.id) as offer_count
FROM users u
LEFT JOIN businesses b ON b.owner_user_id = u.id
LEFT JOIN offers o ON o.business_id = b.id
WHERE u.email IN ('test-business1@ineedaffiliates.com', 'test-business2@ineedaffiliates.com')
GROUP BY u.id, u.email, u.first_name, u.last_name, b.company_name;

