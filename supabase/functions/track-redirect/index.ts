import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MINIMUM_PAYOUT_THRESHOLD = 50;

interface ClickData {
  ina_click_id: string;
  affiliate_link_id: string;
  offer_id: string;
  business_id: string;
  affiliate_user_id: string;
  ip_address: string | null;
  user_agent: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_term: string | null;
  utm_content: string | null;
  referrer: string | null;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Extract public_code from URL path
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    const publicCode = pathParts[pathParts.length - 1];

    if (!publicCode) {
      return new Response(JSON.stringify({ error: 'Missing tracking code' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Look up affiliate link
    const { data: affiliateLink, error: linkError } = await supabase
      .from('affiliate_links')
      .select('id, offer_id, business_id, affiliate_user_id, destination_url, tracking_domain')
      .eq('public_code', publicCode)
      .single();

    if (linkError || !affiliateLink) {
      return new Response(JSON.stringify({ error: 'Invalid tracking code' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Generate unique click ID (UUID)
    const inaClickId = crypto.randomUUID();

    // Extract UTM parameters and attribution data
    const utmSource = url.searchParams.get('utm_source');
    const utmMedium = url.searchParams.get('utm_medium');
    const utmCampaign = url.searchParams.get('utm_campaign');
    const utmTerm = url.searchParams.get('utm_term');
    const utmContent = url.searchParams.get('utm_content');

    // Get client IP and user agent
    const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0] || 
                     req.headers.get('x-real-ip') || 
                     null;
    const userAgent = req.headers.get('user-agent') || null;
    const referrer = req.headers.get('referer') || null;

    // Insert click record
    const clickData: ClickData = {
      ina_click_id: inaClickId,
      affiliate_link_id: affiliateLink.id,
      offer_id: affiliateLink.offer_id,
      business_id: affiliateLink.business_id,
      affiliate_user_id: affiliateLink.affiliate_user_id,
      ip_address: ipAddress,
      user_agent: userAgent,
      utm_source: utmSource,
      utm_medium: utmMedium,
      utm_campaign: utmCampaign,
      utm_term: utmTerm,
      utm_content: utmContent,
      referrer: referrer,
    };

    const { error: clickError } = await supabase
      .from('clicks')
      .insert({
        ina_click_id: inaClickId,
        affiliate_link_id: affiliateLink.id,
        offer_id: affiliateLink.offer_id,
        business_id: affiliateLink.business_id,
        affiliate_user_id: affiliateLink.affiliate_user_id,
        public_code: publicCode,
        click_id: inaClickId, // Keep for backward compatibility
        ip_address: ipAddress,
        user_agent: userAgent,
        utm_source: utmSource,
        utm_medium: utmMedium,
        utm_campaign: utmCampaign,
        utm_term: utmTerm,
        utm_content: utmContent,
        referrer: referrer,
      });

    if (clickError) {
      console.error('Error logging click:', clickError);
      // Continue anyway - log error but don't fail redirect
    }

    // Build redirect URL with tracking parameters
    const destinationUrl = new URL(affiliateLink.destination_url);
    
    // Append ina_click_id and UTM params
    destinationUrl.searchParams.set('ina_click_id', inaClickId);
    if (utmSource) destinationUrl.searchParams.set('utm_source', utmSource);
    if (utmMedium) destinationUrl.searchParams.set('utm_medium', utmMedium);
    if (utmCampaign) destinationUrl.searchParams.set('utm_campaign', utmCampaign);
    if (utmTerm) destinationUrl.searchParams.set('utm_term', utmTerm);
    if (utmContent) destinationUrl.searchParams.set('utm_content', utmContent);

    // Redirect with 302
    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        'Location': destinationUrl.toString(),
      },
    });
  } catch (error) {
    console.error('Error in track-redirect:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

