import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY')!;
const stripeWebhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;
const stripe = new Stripe(stripeSecret, {
  appInfo: {
    name: 'Bolt Integration',
    version: '1.0.0',
  },
});

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

Deno.serve(async (req) => {
  try {
    // Handle OPTIONS request for CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204 });
    }

    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    // get the signature from the header
    const signature = req.headers.get('stripe-signature');

    if (!signature) {
      return new Response('No signature found', { status: 400 });
    }

    // get the raw body
    const body = await req.text();

    // verify the webhook signature
    let event: Stripe.Event;

    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, stripeWebhookSecret);
    } catch (error: any) {
      console.error(`Webhook signature verification failed: ${error.message}`);
      return new Response(`Webhook signature verification failed: ${error.message}`, { status: 400 });
    }

    EdgeRuntime.waitUntil(handleEvent(event));

    return Response.json({ received: true });
  } catch (error: any) {
    console.error('Error processing webhook:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function handleEvent(event: Stripe.Event) {
  const stripeData = event?.data?.object ?? {};

  if (!stripeData) {
    return;
  }

  if (event.type === 'invoice.paid') {
    const invoice = stripeData as Stripe.Invoice;
    if (invoice.customer && typeof invoice.customer === 'string' && invoice.amount_paid > 0) {
      console.info(`Processing invoice.paid for customer: ${invoice.customer}`);
      await syncCustomerFromStripe(invoice.customer);
      await recordReferralCommission(
        invoice.customer,
        invoice.payment_intent as string || invoice.id,
        invoice.amount_paid / 100,
        invoice.currency || 'usd'
      );
    }
    return;
  }

  if (!('customer' in stripeData)) {
    return;
  }

  if (event.type === 'payment_intent.succeeded' && event.data.object.invoice === null) {
    return;
  }

  const { customer: customerId } = stripeData;

  if (!customerId || typeof customerId !== 'string') {
    console.error(`No customer received on event: ${JSON.stringify(event)}`);
  } else {
    let isSubscription = true;

    if (event.type === 'checkout.session.completed') {
      const { mode } = stripeData as Stripe.Checkout.Session;

      isSubscription = mode === 'subscription';

      console.info(`Processing ${isSubscription ? 'subscription' : 'one-time payment'} checkout session`);
    }

    const { mode, payment_status } = stripeData as Stripe.Checkout.Session;

    if (isSubscription) {
      console.info(`Starting subscription sync for customer: ${customerId}`);
      await syncCustomerFromStripe(customerId);

      const session = stripeData as Stripe.Checkout.Session;
      if (session.amount_total && session.amount_total > 0) {
        await recordReferralCommission(customerId, session.payment_intent as string, session.amount_total / 100, session.currency || 'usd');
      }
    } else if (mode === 'payment' && payment_status === 'paid') {
      try {
        // Extract the necessary information from the session
        const {
          id: checkout_session_id,
          payment_intent,
          amount_subtotal,
          amount_total,
          currency,
        } = stripeData as Stripe.Checkout.Session;

        // Insert the order into the stripe_orders table
        const { error: orderError } = await supabase.from('stripe_orders').insert({
          checkout_session_id,
          payment_intent_id: payment_intent,
          customer_id: customerId,
          amount_subtotal,
          amount_total,
          currency,
          payment_status,
          status: 'completed', // assuming we want to mark it as completed since payment is successful
        });

        if (orderError) {
          console.error('Error inserting order:', orderError);
          return;
        }
        console.info(`Successfully processed one-time payment for session: ${checkout_session_id}`);
      } catch (error) {
        console.error('Error processing one-time payment:', error);
      }
    }
  }
}

// based on the excellent https://github.com/t3dotgg/stripe-recommendations
async function syncCustomerFromStripe(customerId: string) {
  try {
    // fetch latest subscription data from Stripe
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      limit: 1,
      status: 'all',
      expand: ['data.default_payment_method'],
    });

    // TODO verify if needed
    if (subscriptions.data.length === 0) {
      console.info(`No active subscriptions found for customer: ${customerId}`);
      const { error: noSubError } = await supabase.from('stripe_subscriptions').upsert(
        {
          customer_id: customerId,
          status: 'not_started',
        },
        {
          onConflict: 'customer_id',
        },
      );

      if (noSubError) {
        console.error('Error updating subscription status:', noSubError);
        throw new Error('Failed to update subscription status in database');
      }
    }

    // assumes that a customer can only have a single subscription
    const subscription = subscriptions.data[0];

    // store subscription state
    const { error: subError } = await supabase.from('stripe_subscriptions').upsert(
      {
        customer_id: customerId,
        subscription_id: subscription.id,
        price_id: subscription.items.data[0].price.id,
        current_period_start: subscription.current_period_start,
        current_period_end: subscription.current_period_end,
        cancel_at_period_end: subscription.cancel_at_period_end,
        ...(subscription.default_payment_method && typeof subscription.default_payment_method !== 'string'
          ? {
              payment_method_brand: subscription.default_payment_method.card?.brand ?? null,
              payment_method_last4: subscription.default_payment_method.card?.last4 ?? null,
            }
          : {}),
        status: subscription.status,
      },
      {
        onConflict: 'customer_id',
      },
    );

    if (subError) {
      console.error('Error syncing subscription:', subError);
      throw new Error('Failed to sync subscription in database');
    }
    console.info(`Successfully synced subscription for customer: ${customerId}`);

    if (subscription.status === 'active') {
      try {
        const { data: customerData } = await supabase
          .from('stripe_customers')
          .select('user_id')
          .eq('customer_id', customerId)
          .maybeSingle();

        if (customerData?.user_id) {
          const priceId = subscription.items.data[0].price.id;
          let tierName = 'Unknown';

          if (priceId.includes('affiliate') || priceId === Deno.env.get('STRIPE_PRICE_AFFILIATE')) {
            tierName = 'Affiliate';
          } else if (priceId.includes('business') || priceId === Deno.env.get('STRIPE_PRICE_BUSINESS')) {
            tierName = 'Business';
          } else if (priceId.includes('elite') || priceId === Deno.env.get('STRIPE_PRICE_ELITE')) {
            tierName = 'Elite';
          }

          const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
          const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

          await fetch(
            `${supabaseUrl}/functions/v1/update-highlevel-status`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${supabaseAnonKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                userId: customerData.user_id,
                statusType: 'subscription',
                subscriptionTier: tierName,
              }),
            }
          );
        }
      } catch (hlError) {
        console.warn('High Level update failed after subscription:', hlError);
      }
    }
  } catch (error) {
    console.error(`Failed to sync subscription for customer ${customerId}:`, error);
    throw error;
  }
}

async function recordReferralCommission(customerId: string, stripePaymentId: string, paymentAmount: number, currency: string) {
  try {
    const { data: customerData } = await supabase
      .from('stripe_customers')
      .select('user_id')
      .eq('customer_id', customerId)
      .maybeSingle();

    if (!customerData?.user_id) {
      console.info(`No user found for customer ${customerId}, skipping commission`);
      return;
    }

    const { data: userData } = await supabase
      .from('users')
      .select('referred_by_user_id')
      .eq('id', customerData.user_id)
      .maybeSingle();

    if (!userData?.referred_by_user_id) {
      console.info(`User ${customerData.user_id} has no referrer, skipping commission`);
      return;
    }

    const commissionRate = 0.20;
    const commissionAmount = paymentAmount * commissionRate;

    const { error: commissionError } = await supabase
      .from('ina_referral_commissions')
      .insert({
        referrer_user_id: userData.referred_by_user_id,
        referred_user_id: customerData.user_id,
        stripe_payment_id: stripePaymentId,
        payment_amount: paymentAmount,
        commission_rate: commissionRate,
        commission_amount: commissionAmount,
        currency: currency.toUpperCase(),
        status: 'payable',
      });

    if (commissionError) {
      console.error('Error recording commission:', commissionError);
      return;
    }

    console.info(`Recorded $${commissionAmount.toFixed(2)} commission for referrer ${userData.referred_by_user_id}`);
  } catch (error) {
    console.error('Error in recordReferralCommission:', error);
  }
}