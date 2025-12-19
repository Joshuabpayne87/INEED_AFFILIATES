import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY')!;
const stripe = new Stripe(stripeSecret, {
  appInfo: { name: 'Bolt Integration', version: '1.0.0' },
});

function corsResponse(body: string | object | null, status = 200) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': '*',
  };
  if (status === 204) return new Response(null, { status, headers });
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json' },
  });
}

async function getOrCreateStripeCustomer(userId: string, email: string): Promise<string> {
  const { data: existingCustomer } = await supabase
    .from('stripe_customers')
    .select('customer_id')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .maybeSingle();

  if (existingCustomer?.customer_id) {
    try {
      await stripe.customers.retrieve(existingCustomer.customer_id);
      return existingCustomer.customer_id;
    } catch (e: any) {
      console.log(`Stale customer ${existingCustomer.customer_id} not found in Stripe, creating new one`);
      await supabase
        .from('stripe_customers')
        .delete()
        .eq('user_id', userId);
      await supabase
        .from('stripe_subscriptions')
        .delete()
        .eq('customer_id', existingCustomer.customer_id);
    }
  }

  const newCustomer = await stripe.customers.create({
    email,
    metadata: { userId },
  });

  await supabase.from('stripe_customers').insert({
    user_id: userId,
    customer_id: newCustomer.id,
  });

  console.log(`Created new Stripe customer ${newCustomer.id} for user ${userId}`);
  return newCustomer.id;
}

Deno.serve(async (req) => {
  try {
    if (req.method === 'OPTIONS') return corsResponse({}, 204);
    if (req.method !== 'POST') return corsResponse({ error: 'Method not allowed' }, 405);

    const { tier, success_url, cancel_url, mode, promo_code } = await req.json();

    if (!tier || !success_url || !cancel_url || !mode) {
      return corsResponse({ error: 'Missing required parameters' }, 400);
    }

    const priceIdMap: Record<string, string | undefined> = {
      monthly: Deno.env.get('STRIPE_PRICE_MONTHLY'),
      annual: Deno.env.get('STRIPE_PRICE_ANNUAL'),
      lifetime: Deno.env.get('STRIPE_PRICE_LIFETIME'),
    };

    const price_id = priceIdMap[tier];
    if (!price_id) {
      return corsResponse({ error: `Price ID not configured for tier: ${tier}` }, 500);
    }

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: getUserError } = await supabase.auth.getUser(token);

    if (getUserError || !user) {
      return corsResponse({ error: 'Failed to authenticate user' }, 401);
    }

    const customerId = await getOrCreateStripeCustomer(user.id, user.email!);

    if (mode === 'subscription') {
      const { data: subscription } = await supabase
        .from('stripe_subscriptions')
        .select('id')
        .eq('customer_id', customerId)
        .maybeSingle();

      if (!subscription) {
        await supabase.from('stripe_subscriptions').insert({
          customer_id: customerId,
          status: 'not_started',
        });
      }
    }

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{ price: price_id, quantity: 1 }],
      mode,
      success_url,
      cancel_url,
    };

    if (promo_code) {
      const promotionCodes = await stripe.promotionCodes.list({
        code: promo_code,
        active: true,
        limit: 1,
      });
      if (promotionCodes.data.length > 0) {
        sessionParams.discounts = [{ promotion_code: promotionCodes.data[0].id }];
      } else {
        return corsResponse({ error: 'Invalid or expired promo code' }, 400);
      }
    }

    const session = await stripe.checkout.sessions.create(sessionParams);
    return corsResponse({ sessionId: session.id, url: session.url });
  } catch (error: any) {
    console.error(`Checkout error: ${error.message}`);
    return corsResponse({ error: error.message }, 500);
  }
});