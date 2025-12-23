DO $$
DECLARE
    target_user_id UUID := 'a37df4b7-3490-4c34-a6f6-83d5c9b7d289';
BEGIN

-- 1. Create several Partner Users in auth.users
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
VALUES 
  ('u1111111-1111-1111-1111-111111111111', 'sarah@marketingmastery.com', crypt('Password123!', gen_salt('bf')), NOW(), '{"provider":"email"}', '{"first_name":"Sarah","last_name":"Johnson"}', NOW(), NOW()),
  ('u2222222-2222-2222-2222-222222222222', 'mike@techflow.io', crypt('Password123!', gen_salt('bf')), NOW(), '{"provider":"email"}', '{"first_name":"Mike","last_name":"Chen"}', NOW(), NOW()),
  ('u3333333-3333-3333-3333-333333333333', 'elena@creative-scale.com', crypt('Password123!', gen_salt('bf')), NOW(), '{"provider":"email"}', '{"first_name":"Elena","last_name":"Rodriguez"}', NOW(), NOW()),
  ('u4444444-4444-4444-4444-444444444444', 'david@saas-accelerate.com', crypt('Password123!', gen_salt('bf')), NOW(), '{"provider":"email"}', '{"first_name":"David","last_name":"Smith"}', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- 2. Create User Profiles
INSERT INTO public.users (id, first_name, last_name, email, photo_url, role)
VALUES
  ('u1111111-1111-1111-1111-111111111111', 'Sarah', 'Johnson', 'sarah@marketingmastery.com', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah', 'user'),
  ('u2222222-2222-2222-2222-222222222222', 'Mike', 'Chen', 'mike@techflow.io', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mike', 'user'),
  ('u3333333-3333-3333-3333-333333333333', 'Elena', 'Rodriguez', 'elena@creative-scale.com', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Elena', 'user'),
  ('u4444444-4444-4444-4444-444444444444', 'David', 'Smith', 'david@saas-accelerate.com', 'https://api.dicebear.com/7.x/avataaars/svg?seed=David', 'user')
ON CONFLICT (id) DO NOTHING;

-- 3. Create Businesses
INSERT INTO public.businesses (
  id, owner_user_id, business_name, company_name, industry, niche, target_audience, 
  website_url, tagline, description, is_profile_published, collaboration_types,
  logo_url, featured
)
VALUES
  (
    'b1111111-1111-1111-1111-111111111111', 'u1111111-1111-1111-1111-111111111111', 
    'Marketing Mastery', 'Johnson Media Group', 'Marketing', 'High-Ticket Coaching', 'Course creators and coaches making $10k+/mo',
    'https://marketingmastery.com', 'Scale your coaching business to 7 figures', 
    'We help elite coaches dominate their niche through advanced funnel strategies.',
    true, ARRAY['Affiliate', 'JV Webinar', 'Email Swap'],
    'https://api.dicebear.com/7.x/initials/svg?seed=MM', true
  ),
  (
    'b2222222-2222-2222-2222-222222222222', 'u2222222-2222-2222-2222-222222222222', 
    'TechFlow AI', 'TechFlow Solutions Inc', 'Technology', 'AI Automation', 'E-commerce brands',
    'https://techflow.io', 'AI-Powered Customer Excellence', 
    'Custom AI agents that handle support tickets.',
    true, ARRAY['Affiliate', 'Podcast Swap'],
    'https://api.dicebear.com/7.x/initials/svg?seed=TF', false
  ),
  (
    'b3333333-3333-3333-3333-333333333333', 'u3333333-3333-3333-3333-333333333333', 
    'Creative Scale', 'Creative Scale Agency', 'Creative Services', 'Short-form Video', 'Founders building personal brands',
    'https://creativescale.com', 'Viral Content as a Service', 
    'We turn your long-form ideas into viral clips.',
    true, ARRAY['Affiliate', 'Email Swap'],
    'https://api.dicebear.com/7.x/initials/svg?seed=CS', true
  )
ON CONFLICT (id) DO NOTHING;

-- 4. Create Offers
INSERT INTO public.offers (
  id, business_id, offer_name, description, price_point, commission_percent, offer_type, promo_methods, is_active
)
VALUES
  ('o1111111-1111-1111-1111-111111111111', 'b1111111-1111-1111-1111-111111111111', '7-Figure Funnel Blueprint', 'Blueprint for funnels.', '$5,000', 20, 'High-Ticket Service', ARRAY['Email', 'Webinar'], true),
  ('o2222222-2222-2222-2222-222222222222', 'b2222222-2222-2222-2222-222222222222', 'AI Support Agent Setup', 'DFY AI support agent.', '$2,997', 15, 'Service', ARRAY['Social Media', 'Content'], true),
  ('o3333333-3333-3333-3333-333333333333', 'b3333333-3333-3333-3333-333333333333', 'Short-Form Video Engine', '30 edited clips.', '$1,500/mo', 10, 'Subscription', ARRAY['Email'], true)
ON CONFLICT (id) DO NOTHING;

-- 5. Create Connections
INSERT INTO public.connections (id, requester_user_id, recipient_user_id, status, created_at, accepted_at)
VALUES
  ('c1111111-1111-1111-1111-111111111111', target_user_id, 'u1111111-1111-1111-1111-111111111111', 'accepted', NOW() - INTERVAL '10 days', NOW() - INTERVAL '9 days'),
  ('c2222222-2222-2222-2222-222222222222', 'u2222222-2222-2222-2222-222222222222', target_user_id, 'accepted', NOW() - INTERVAL '5 days', NOW() - INTERVAL '4 days'),
  ('c3333333-3333-3333-3333-333333333333', target_user_id, 'u3333333-3333-3333-3333-333333333333', 'pending', NOW() - INTERVAL '1 day', NULL)
ON CONFLICT (id) DO NOTHING;

-- 6. Create CRM Cards
INSERT INTO public.crm_cards (user_id, partner_user_id, partner_business_id, connection_id, stage, partner_name, company_name, notes)
VALUES
  (target_user_id, 'u1111111-1111-1111-1111-111111111111', 'b1111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111111', 'Generating Revenue', 'Sarah Johnson', 'Marketing Mastery', 'Active affiliate.'),
  (target_user_id, 'u2222222-2222-2222-2222-222222222222', 'b2222222-2222-2222-2222-222222222222', 'c2222222-2222-2222-2222-222222222222', 'Connected', 'Mike Chen', 'TechFlow AI', 'Webinar next month.'),
  (target_user_id, 'u3333333-3333-3333-3333-333333333333', 'b3333333-3333-3333-3333-333333333333', 'c3333333-3333-3333-3333-333333333333', 'Connection Pending', 'Elena Rodriguez', 'Creative Scale', 'Sent request.')
ON CONFLICT (user_id, partner_user_id) DO UPDATE SET stage = EXCLUDED.stage;

-- 7. Add Notifications
INSERT INTO public.notifications (user_id, type, title, message, is_read)
VALUES
  (target_user_id, 'connection_accepted', 'Connection Accepted!', 'Mike Chen accepted your partnership request.', false),
  (target_user_id, 'offer_match', 'New Offer Match', 'Elena Rodriguez posted a new offer.', false)
ON CONFLICT DO NOTHING;

END $$;