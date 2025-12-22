/**
 * Script to create test data for affiliate tracking
 * 
 * Usage:
 * 1. Set environment variables in .env.local:
 *    VITE_SUPABASE_URL=your_supabase_url
 *    SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
 * 
 * 2. Run: node scripts/create-test-data.js
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env.local if it exists
let envVars = {};
try {
  const envFile = readFileSync(join(__dirname, '../.env.local'), 'utf8');
  envFile.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length) {
      envVars[key.trim()] = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
    }
  });
} catch (e) {
  console.log('No .env.local file found, using process.env');
}

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || envVars.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || envVars.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  console.error('Please set these in .env.local or as environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createTestData() {
  console.log('🚀 Creating test accounts and offers...\n');

  try {
    // Create first test user
    console.log('Creating user 1...');
    const { data: user1, error: user1Error } = await supabase.auth.admin.createUser({
      email: 'test-business1@ineedaffiliates.com',
      password: 'Test123!@#',
      email_confirm: true,
      user_metadata: {
        first_name: 'John',
        last_name: 'Business',
      },
    });

    if (user1Error && !user1Error.message.includes('already registered')) {
      throw user1Error;
    }

    let user1Id;
    if (user1?.user) {
      user1Id = user1.user.id;
      console.log('✓ Created user 1:', user1.user.email);
    } else {
      // User might already exist, get it
      const { data: existing } = await supabase.auth.admin.listUsers();
      const existingUser = existing?.users.find(u => u.email === 'test-business1@ineedaffiliates.com');
      if (existingUser) {
        user1Id = existingUser.id;
        console.log('✓ User 1 already exists:', existingUser.email);
      } else {
        throw new Error('Could not create or find user 1');
      }
    }

    // Create second test user
    console.log('Creating user 2...');
    const { data: user2, error: user2Error } = await supabase.auth.admin.createUser({
      email: 'test-business2@ineedaffiliates.com',
      password: 'Test123!@#',
      email_confirm: true,
      user_metadata: {
        first_name: 'Sarah',
        last_name: 'Entrepreneur',
      },
    });

    if (user2Error && !user2Error.message.includes('already registered')) {
      throw user2Error;
    }

    let user2Id;
    if (user2?.user) {
      user2Id = user2.user.id;
      console.log('✓ Created user 2:', user2.user.email);
    } else {
      // User might already exist, get it
      const { data: existing } = await supabase.auth.admin.listUsers();
      const existingUser = existing?.users.find(u => u.email === 'test-business2@ineedaffiliates.com');
      if (existingUser) {
        user2Id = existingUser.id;
        console.log('✓ User 2 already exists:', existingUser.email);
      } else {
        throw new Error('Could not create or find user 2');
      }
    }

    // Create user profiles
    console.log('Creating user profiles...');
    await supabase.from('users').upsert({
      id: user1Id,
      email: 'test-business1@ineedaffiliates.com',
      first_name: 'John',
      last_name: 'Business',
    }, { onConflict: 'id' });

    await supabase.from('users').upsert({
      id: user2Id,
      email: 'test-business2@ineedaffiliates.com',
      first_name: 'Sarah',
      last_name: 'Entrepreneur',
    }, { onConflict: 'id' });
    console.log('✓ User profiles created');

    // Create business 1
    console.log('Creating business 1...');
    const { data: business1, error: business1Error } = await supabase
      .from('businesses')
      .upsert({
        owner_user_id: user1Id,
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
      }, { onConflict: 'owner_user_id' })
      .select()
      .single();

    if (business1Error) throw business1Error;
    console.log('✓ Created business 1:', business1.company_name);

    // Create business 2
    console.log('Creating business 2...');
    const { data: business2, error: business2Error } = await supabase
      .from('businesses')
      .upsert({
        owner_user_id: user2Id,
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
      }, { onConflict: 'owner_user_id' })
      .select()
      .single();

    if (business2Error) throw business2Error;
    console.log('✓ Created business 2:', business2.company_name);

    // Delete existing offers for these businesses (to avoid duplicates)
    await supabase.from('offers').delete().eq('business_id', business1.id);
    await supabase.from('offers').delete().eq('business_id', business2.id);

    // Create offer 1 for business 1
    console.log('Creating offer 1...');
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
    await supabase.from('offer_price_options').delete().eq('offer_id', offer1.id);
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
    console.log('Creating offer 2...');
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
    await supabase.from('offer_price_options').delete().eq('offer_id', offer2.id);
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
    console.log('\n📧 Test Accounts:');
    console.log('1. Email: test-business1@ineedaffiliates.com | Password: Test123!@#');
    console.log('2. Email: test-business2@ineedaffiliates.com | Password: Test123!@#');
    console.log('\n💡 You can now log in with these accounts to test the affiliate tracking features.');
    console.log('   - Go to /marketplace to see the offers');
    console.log('   - Add offers to your vault to generate affiliate links');
    console.log('   - Test the tracking system with the generated links');

  } catch (error) {
    console.error('❌ Error creating test data:', error.message);
    if (error.details) {
      console.error('Details:', error.details);
    }
    console.error(error);
    process.exit(1);
  }
}

createTestData();

