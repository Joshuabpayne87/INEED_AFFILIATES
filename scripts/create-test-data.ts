/**
 * Script to create test data for affiliate tracking
 * Run with: npx tsx scripts/create-test-data.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { join } from 'path';

// Load environment variables
dotenv.config({ path: join(__dirname, '../.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createTestData() {
  console.log('Creating test accounts and offers...\n');

  try {
    // Create first test user
    const { data: user1, error: user1Error } = await supabase.auth.admin.createUser({
      email: 'test-business1@ineedaffiliates.com',
      password: 'Test123!@#',
      email_confirm: true,
      user_metadata: {
        first_name: 'John',
        last_name: 'Business',
      },
    });

    if (user1Error) throw user1Error;
    console.log('✓ Created user 1:', user1.user?.email);

    // Create second test user
    const { data: user2, error: user2Error } = await supabase.auth.admin.createUser({
      email: 'test-business2@ineedaffiliates.com',
      password: 'Test123!@#',
      email_confirm: true,
      user_metadata: {
        first_name: 'Sarah',
        last_name: 'Entrepreneur',
      },
    });

    if (user2Error) throw user2Error;
    console.log('✓ Created user 2:', user2.user?.email);

    // Create user profiles
    if (user1.user) {
      await supabase.from('users').upsert({
        id: user1.user.id,
        email: user1.user.email,
        first_name: 'John',
        last_name: 'Business',
      });
    }

    if (user2.user) {
      await supabase.from('users').upsert({
        id: user2.user.id,
        email: user2.user.email,
        first_name: 'Sarah',
        last_name: 'Entrepreneur',
      });
    }

    // Create business 1
    const { data: business1, error: business1Error } = await supabase
      .from('businesses')
      .insert({
        owner_user_id: user1.user!.id,
        company_name: 'Premium Coaching Co.',
        business_name: 'Premium Coaching Co.',
        tagline: 'Transform your business with expert coaching',
        industry: 'Coaching & Consulting',
        niche: 'Business Coaching',
        website: 'https://premiumcoaching.example.com',
        description: 'We provide world-class business coaching services to help entrepreneurs scale their businesses.',
        main_offer_type: 'Coaching Program',
        monetization_type: 'Coaching Services',
        target_audience: 'Entrepreneurs and business owners',
        is_profile_published: true,
        is_live: true,
        affiliate_commission_type: 'percent',
        affiliate_commission_value: 30,
        ina_commission_type: 'percent',
        ina_commission_value: 10,
        commission_currency: 'USD',
      })
      .select()
      .single();

    if (business1Error) throw business1Error;
    console.log('✓ Created business 1:', business1.company_name);

    // Create business 2
    const { data: business2, error: business2Error } = await supabase
      .from('businesses')
      .insert({
        owner_user_id: user2.user!.id,
        company_name: 'SaaS Solutions Inc.',
        business_name: 'SaaS Solutions Inc.',
        tagline: 'Powerful SaaS tools for modern businesses',
        industry: 'SaaS Companies',
        niche: 'Business Software',
        website: 'https://saassolutions.example.com',
        description: 'We build cutting-edge SaaS products that help businesses automate and scale.',
        main_offer_type: 'SaaS Subscription',
        monetization_type: 'SaaS Subscriptions',
        target_audience: 'Small to medium businesses',
        is_profile_published: true,
        is_live: true,
        affiliate_commission_type: 'percent',
        affiliate_commission_value: 25,
        ina_commission_type: 'percent',
        ina_commission_value: 10,
        commission_currency: 'USD',
      })
      .select()
      .single();

    if (business2Error) throw business2Error;
    console.log('✓ Created business 2:', business2.company_name);

    // Create offer 1 for business 1
    const { data: offer1, error: offer1Error } = await supabase
      .from('offers')
      .insert({
        business_id: business1.id,
        offer_name: 'Premium Business Coaching Program',
        description: 'A comprehensive 12-week business coaching program designed to help you scale your business and achieve your goals.',
        price_point: '$2,997',
        commission_percent: 30,
        offer_type: 'Coaching Program',
        promo_methods: ['Email', 'Webinar', 'Social Media'],
        affiliate_signup_link: 'https://premiumcoaching.example.com/affiliate-signup',
        purchase_affiliate_link: 'https://premiumcoaching.example.com/checkout',
        commission_type: 'Recurring',
        commission_duration: 'As long as customer keeps paying',
        is_active: true,
      })
      .select()
      .single();

    if (offer1Error) throw offer1Error;
    console.log('✓ Created offer 1:', offer1.offer_name);

    // Create price options for offer 1
    await supabase.from('offer_price_options').insert([
      {
        offer_id: offer1.id,
        amount: 2997,
        currency: 'USD',
        frequency: 'one_time',
        sort_order: 0,
      },
      {
        offer_id: offer1.id,
        amount: 997,
        currency: 'USD',
        frequency: 'per_month',
        sort_order: 1,
      },
    ]);
    console.log('✓ Created price options for offer 1');

    // Create offer 2 for business 2
    const { data: offer2, error: offer2Error } = await supabase
      .from('offers')
      .insert({
        business_id: business2.id,
        offer_name: 'Business Automation Suite',
        description: 'Complete SaaS suite for automating your business operations. Includes CRM, project management, and analytics.',
        price_point: '$97/month',
        commission_percent: 25,
        offer_type: 'SaaS Subscription',
        promo_methods: ['Email', 'Blog Post', 'YouTube', 'White-Label'],
        affiliate_signup_link: 'https://saassolutions.example.com/affiliate-signup',
        purchase_affiliate_link: 'https://saassolutions.example.com/signup',
        commission_type: 'Recurring',
        commission_duration: 'As long as customer keeps paying',
        is_active: true,
      })
      .select()
      .single();

    if (offer2Error) throw offer2Error;
    console.log('✓ Created offer 2:', offer2.offer_name);

    // Create price options for offer 2
    await supabase.from('offer_price_options').insert([
      {
        offer_id: offer2.id,
        amount: 97,
        currency: 'USD',
        frequency: 'per_month',
        sort_order: 0,
      },
      {
        offer_id: offer2.id,
        amount: 970,
        currency: 'USD',
        frequency: 'per_year',
        sort_order: 1,
      },
    ]);
    console.log('✓ Created price options for offer 2');

    console.log('\n✅ Test data created successfully!');
    console.log('\nTest Accounts:');
    console.log('1. Email: test-business1@ineedaffiliates.com | Password: Test123!@#');
    console.log('2. Email: test-business2@ineedaffiliates.com | Password: Test123!@#');
    console.log('\nYou can now log in with these accounts to test the affiliate tracking features.');

  } catch (error: any) {
    console.error('❌ Error creating test data:', error.message);
    if (error.details) {
      console.error('Details:', error.details);
    }
    process.exit(1);
  }
}

createTestData();


