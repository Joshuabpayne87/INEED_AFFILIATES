import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MINIMUM_PAYOUT_THRESHOLD = 50;

interface ConversionPayload {
  ina_click_id: string;
  event_type: 'lead' | 'booked_call' | 'purchase';
  amount?: number;
  currency?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  order_id?: string;
  booking_datetime?: string;
  metadata?: Record<string, any>;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    // Initialize Supabase client with service role for admin access
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const payload: ConversionPayload = await req.json();

    // Validate required fields
    if (!payload.ina_click_id || !payload.event_type) {
      return new Response(JSON.stringify({ error: 'Missing required fields: ina_click_id, event_type' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate event_type
    if (!['lead', 'booked_call', 'purchase'].includes(payload.event_type)) {
      return new Response(JSON.stringify({ error: 'Invalid event_type. Must be: lead, booked_call, or purchase' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Look up click to get affiliate and business info
    const { data: click, error: clickError } = await supabase
      .from('clicks')
      .select(`
        id,
        affiliate_link_id,
        offer_id,
        business_id,
        affiliate_user_id,
        affiliate_links!inner(id, offer_id, business_id, affiliate_user_id)
      `)
      .eq('ina_click_id', payload.ina_click_id)
      .single();

    if (clickError || !click) {
      return new Response(JSON.stringify({ error: 'Invalid click ID' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch business commission terms
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('affiliate_commission_type, affiliate_commission_value, ina_commission_type, ina_commission_value, commission_currency')
      .eq('id', click.business_id)
      .single();

    if (businessError || !business) {
      return new Response(JSON.stringify({ error: 'Business not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get conversion amount (default to 0 for lead/booked_call)
    const conversionAmount = payload.amount || 0;
    const currency = payload.currency || business.commission_currency || 'USD';

    // Calculate commissions
    let affiliateCommission = 0;
    let inaCommission = 0;

    // Calculate affiliate commission
    if (business.affiliate_commission_type === 'percent') {
      affiliateCommission = (conversionAmount * Number(business.affiliate_commission_value)) / 100;
    } else {
      affiliateCommission = Number(business.affiliate_commission_value);
    }

    // Calculate INA commission
    if (business.ina_commission_type === 'percent') {
      inaCommission = (conversionAmount * Number(business.ina_commission_value)) / 100;
    } else {
      inaCommission = Number(business.ina_commission_value);
    }

    // Insert lead record
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .insert({
        offer_id: click.offer_id,
        business_id: click.business_id,
        affiliate_user_id: click.affiliate_user_id,
        affiliate_link_id: click.affiliate_link_id,
        ina_click_id: payload.ina_click_id,
        click_id: payload.ina_click_id, // Backward compatibility
        event_type: payload.event_type,
        email: payload.email,
        first_name: payload.first_name,
        last_name: payload.last_name,
        phone: payload.phone,
        customer_email: payload.email,
        customer_name: payload.first_name && payload.last_name 
          ? `${payload.first_name} ${payload.last_name}` 
          : undefined,
        customer_phone: payload.phone,
        amount: conversionAmount,
        conversion_value: conversionAmount,
        currency: currency,
        order_id: payload.order_id,
        external_reference: payload.order_id,
        booking_datetime: payload.booking_datetime ? new Date(payload.booking_datetime).toISOString() : null,
        raw_payload: payload.metadata || null,
        metadata: payload.metadata || null,
      })
      .select()
      .single();

    if (leadError) {
      console.error('Error creating lead:', leadError);
      return new Response(JSON.stringify({ error: 'Failed to create lead record' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check affiliate's pending + payable commission total to determine status
    const { data: existingCommissions } = await supabase
      .from('commission_events')
      .select('affiliate_commission_amount, status')
      .eq('affiliate_user_id', click.affiliate_user_id)
      .in('status', ['pending', 'payable']);

    const currentTotal = existingCommissions?.reduce((sum, c) => sum + Number(c.affiliate_commission_amount), 0) || 0;
    const newTotal = currentTotal + affiliateCommission;

    // Determine status based on payout threshold
    // Only mark as 'payable' if the new total (including this commission) meets the threshold
    let status: 'pending' | 'payable' = 'pending';
    if (newTotal >= MINIMUM_PAYOUT_THRESHOLD) {
      status = 'payable';
    }

    // Insert commission event (atomic transaction)
    const { data: commissionEvent, error: commissionError } = await supabase
      .from('commission_events')
      .insert({
        business_id: click.business_id,
        offer_id: click.offer_id,
        affiliate_user_id: click.affiliate_user_id,
        affiliate_link_id: click.affiliate_link_id,
        lead_id: lead.id,
        click_id: payload.ina_click_id,
        affiliate_commission_amount: affiliateCommission,
        ina_commission_amount: inaCommission,
        currency: currency,
        status: status,
        payable_at: status === 'payable' ? new Date().toISOString() : null,
      })
      .select()
      .single();

    if (commissionError) {
      console.error('Error creating commission event:', commissionError);
      return new Response(JSON.stringify({ error: 'Failed to create commission event' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Return commission breakdown
    return new Response(
      JSON.stringify({
        success: true,
        lead_id: lead.id,
        commission_event_id: commissionEvent.id,
        affiliate_commission_amount: affiliateCommission,
        ina_commission_amount: inaCommission,
        currency: currency,
        status: status,
        message: status === 'pending' 
          ? `Pending. Earn $${(MINIMUM_PAYOUT_THRESHOLD - newPendingTotal).toFixed(2)} more to reach $${MINIMUM_PAYOUT_THRESHOLD} minimum payout threshold.`
          : 'Payable - commission meets minimum payout threshold',
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in conversion-webhook:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

