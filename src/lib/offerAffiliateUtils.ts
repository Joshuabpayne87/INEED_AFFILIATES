import { supabase } from './supabase';

export interface OfferAffiliateStats {
  totalClicks: number;
  uniqueClicks: number;
  conversions: number;
  conversionRate: number;
}

export interface OfferAffiliateCode {
  id: string;
  offerId: string;
  shortCode: string;
  createdAt: string;
}

// Base URL for short affiliate links
const PRTNR_LIVE_BASE = 'https://prtnr.live';

/**
 * Get or create an affiliate code for a user and offer
 */
export async function getOrCreateOfferAffiliateCode(
  userId: string,
  offerId: string
): Promise<string | null> {
  try {
    // First try to get existing code
    const { data: existing } = await supabase
      .from('offer_affiliate_codes')
      .select('short_code')
      .eq('user_id', userId)
      .eq('offer_id', offerId)
      .maybeSingle();

    if (existing?.short_code) {
      return existing.short_code;
    }

    // Use the database function to get or create
    const { data, error } = await supabase.rpc('get_or_create_offer_affiliate_code', {
      p_user_id: userId,
      p_offer_id: offerId,
    });

    if (error) {
      console.error('Error creating affiliate code:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in getOrCreateOfferAffiliateCode:', error);
    return null;
  }
}

/**
 * Build a prtnr.live short affiliate link
 */
export function buildOfferAffiliateLink(shortCode: string): string {
  return `${PRTNR_LIVE_BASE}/${shortCode}`;
}

/**
 * Get all affiliate codes for a user
 */
export async function getUserOfferAffiliateCodes(userId: string): Promise<OfferAffiliateCode[]> {
  const { data, error } = await supabase
    .from('offer_affiliate_codes')
    .select('id, offer_id, short_code, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error || !data) return [];

  return data.map((code) => ({
    id: code.id,
    offerId: code.offer_id,
    shortCode: code.short_code,
    createdAt: code.created_at,
  }));
}

/**
 * Track an affiliate click
 */
export async function trackOfferAffiliateClick(
  shortCode: string
): Promise<{ success: boolean; redirectUrl?: string }> {
  try {
    // Look up the affiliate code
    const { data: codeData } = await supabase
      .from('offer_affiliate_codes')
      .select(`
        user_id,
        offer_id,
        offers (
          affiliate_signup_link,
          purchase_affiliate_link
        )
      `)
      .eq('short_code', shortCode)
      .maybeSingle();

    if (!codeData) {
      return { success: false };
    }

    // Track the click
    await supabase.from('offer_affiliate_clicks').insert({
      offer_id: codeData.offer_id,
      affiliate_user_id: codeData.user_id,
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
      referrer_url: typeof document !== 'undefined' ? document.referrer : null,
    });

    // Get redirect URL (prefer purchase link, fallback to signup link)
    const offer = codeData.offers as { affiliate_signup_link?: string; purchase_affiliate_link?: string } | null;
    const redirectUrl = offer?.purchase_affiliate_link || offer?.affiliate_signup_link;

    return { success: true, redirectUrl: redirectUrl || undefined };
  } catch (error) {
    console.error('Error tracking affiliate click:', error);
    return { success: false };
  }
}

/**
 * Get affiliate stats for a specific offer
 */
export async function getOfferAffiliateStats(
  userId: string,
  offerId: string
): Promise<OfferAffiliateStats> {
  try {
    const { data: clicks, count } = await supabase
      .from('offer_affiliate_clicks')
      .select('id, ip_address, converted', { count: 'exact' })
      .eq('affiliate_user_id', userId)
      .eq('offer_id', offerId);

    const totalClicks = count || 0;

    // Count unique IPs for unique clicks
    const uniqueIps = new Set(clicks?.map((c) => c.ip_address).filter(Boolean));
    const uniqueClicks = uniqueIps.size || totalClicks;

    const conversions = clicks?.filter((c) => c.converted).length || 0;
    const conversionRate = totalClicks > 0 ? (conversions / totalClicks) * 100 : 0;

    return {
      totalClicks,
      uniqueClicks,
      conversions,
      conversionRate,
    };
  } catch (error) {
    console.error('Error getting affiliate stats:', error);
    return {
      totalClicks: 0,
      uniqueClicks: 0,
      conversions: 0,
      conversionRate: 0,
    };
  }
}

/**
 * Get all affiliate stats for a user across all offers
 */
export async function getUserOfferAffiliateStats(userId: string): Promise<{
  totalClicks: number;
  totalConversions: number;
  offerBreakdown: { offerId: string; clicks: number; conversions: number }[];
}> {
  try {
    const { data: clicks } = await supabase
      .from('offer_affiliate_clicks')
      .select('offer_id, converted')
      .eq('affiliate_user_id', userId);

    if (!clicks) {
      return { totalClicks: 0, totalConversions: 0, offerBreakdown: [] };
    }

    const totalClicks = clicks.length;
    const totalConversions = clicks.filter((c) => c.converted).length;

    // Group by offer
    const offerMap = new Map<string, { clicks: number; conversions: number }>();
    clicks.forEach((click) => {
      const existing = offerMap.get(click.offer_id) || { clicks: 0, conversions: 0 };
      existing.clicks++;
      if (click.converted) existing.conversions++;
      offerMap.set(click.offer_id, existing);
    });

    const offerBreakdown = Array.from(offerMap.entries()).map(([offerId, stats]) => ({
      offerId,
      ...stats,
    }));

    return { totalClicks, totalConversions, offerBreakdown };
  } catch (error) {
    console.error('Error getting user affiliate stats:', error);
    return { totalClicks: 0, totalConversions: 0, offerBreakdown: [] };
  }
}

/**
 * Mark an affiliate click as converted
 */
export async function markAffiliateConversion(
  offerId: string,
  affiliateUserId: string
): Promise<boolean> {
  try {
    // Find the most recent non-converted click and mark it as converted
    const { data: click } = await supabase
      .from('offer_affiliate_clicks')
      .select('id')
      .eq('offer_id', offerId)
      .eq('affiliate_user_id', affiliateUserId)
      .eq('converted', false)
      .order('clicked_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!click) return false;

    const { error } = await supabase
      .from('offer_affiliate_clicks')
      .update({ converted: true, converted_at: new Date().toISOString() })
      .eq('id', click.id);

    return !error;
  } catch (error) {
    console.error('Error marking conversion:', error);
    return false;
  }
}
