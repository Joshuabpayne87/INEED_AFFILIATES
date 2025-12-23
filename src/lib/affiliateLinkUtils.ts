import { supabase } from './supabase';

export interface AffiliateLink {
  id: string;
  offer_id: string;
  business_id: string;
  affiliate_user_id: string;
  public_code: string;
  tracking_domain: string;
  tracking_url: string;
  destination_url: string;
  clicks_count: number;
  conversions_count: number;
  total_earned: number;
  created_at: string;
}

export interface AffiliateLinkStats {
  clicks: number;
  conversions: number;
  paid: number;
  pending: number;
  payable: number;
}

/**
 * Generate a random 8-character public code
 */
function generatePublicCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Get or create an affiliate link for a user and offer
 */
export async function getOrCreateAffiliateLink(
  userId: string,
  offerId: string,
  businessId: string,
  destinationUrl: string
): Promise<AffiliateLink | null> {
  try {
    // First try to get existing link
    const { data: existing } = await supabase
      .from('affiliate_links')
      .select('*')
      .eq('affiliate_user_id', userId)
      .eq('offer_id', offerId)
      .maybeSingle();

    if (existing) {
      return existing as AffiliateLink;
    }

    // Generate unique public code
    let publicCode: string;
    let attempts = 0;
    do {
      publicCode = generatePublicCode();
      const { data: exists } = await supabase
        .from('affiliate_links')
        .select('id')
        .eq('public_code', publicCode)
        .maybeSingle();
      
      if (!exists) break;
      attempts++;
      if (attempts > 10) {
        throw new Error('Failed to generate unique code');
      }
    } while (true);

    // Determine tracking domain based on destination
    // prtnr.live for business offers, ineedaffiliates.com/r for platform referrals
    const trackingDomain = 'prtnr.live';
    const trackingUrl = `https://${trackingDomain}/${publicCode}`;

    // Create new affiliate link
    const { data: newLink, error } = await supabase
      .from('affiliate_links')
      .insert({
        offer_id: offerId,
        business_id: businessId,
        affiliate_user_id: userId,
        public_code: publicCode,
        tracking_domain: trackingDomain,
        tracking_url: trackingUrl,
        destination_url: destinationUrl,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating affiliate link:', error);
      return null;
    }

    return newLink as AffiliateLink;
  } catch (error) {
    console.error('Error in getOrCreateAffiliateLink:', error);
    return null;
  }
}

/**
 * Get all affiliate links for a user
 */
export async function getUserAffiliateLinks(userId: string): Promise<AffiliateLink[]> {
  try {
    const { data, error } = await supabase
      .from('affiliate_links')
      .select('*')
      .eq('affiliate_user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching affiliate links:', error);
      return [];
    }

    return (data || []) as AffiliateLink[];
  } catch (error) {
    console.error('Error in getUserAffiliateLinks:', error);
    return [];
  }
}

/**
 * Get affiliate link stats
 */
export async function getAffiliateLinkStats(
  userId: string,
  linkId?: string
): Promise<AffiliateLinkStats> {
  try {
    let query = supabase
      .from('commission_events')
      .select('affiliate_commission_amount, status')
      .eq('affiliate_user_id', userId);

    if (linkId) {
      query = query.eq('affiliate_link_id', linkId);
    }

    const { data: commissions, error: commError } = await query;

    if (commError) {
      console.error('Error fetching commissions:', commError);
      return { clicks: 0, conversions: 0, paid: 0, pending: 0, payable: 0 };
    }

    const paid = commissions
      ?.filter((c) => c.status === 'paid')
      .reduce((sum, c) => sum + Number(c.affiliate_commission_amount), 0) || 0;

    const pending = commissions
      ?.filter((c) => c.status === 'pending')
      .reduce((sum, c) => sum + Number(c.affiliate_commission_amount), 0) || 0;

    const payable = commissions
      ?.filter((c) => c.status === 'payable')
      .reduce((sum, c) => sum + Number(c.affiliate_commission_amount), 0) || 0;

    // Get clicks count
    let clicksQuery = supabase
      .from('clicks')
      .select('id', { count: 'exact', head: true })
      .eq('affiliate_user_id', userId);

    if (linkId) {
      clicksQuery = clicksQuery.eq('affiliate_link_id', linkId);
    }

    const { count: clicks } = await clicksQuery;

    // Conversions = all commission events (pending, payable, paid)
    const conversions = commissions?.length || 0;

    return {
      clicks: clicks || 0,
      conversions,
      paid,
      pending,
      payable,
    };
  } catch (error) {
    console.error('Error in getAffiliateLinkStats:', error);
    return { clicks: 0, conversions: 0, paid: 0, pending: 0, payable: 0 };
  }
}

/**
 * Get affiliate link by public code
 */
export async function getAffiliateLinkByCode(publicCode: string): Promise<AffiliateLink | null> {
  try {
    const { data, error } = await supabase
      .from('affiliate_links')
      .select('*')
      .eq('public_code', publicCode)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return data as AffiliateLink;
  } catch (error) {
    console.error('Error in getAffiliateLinkByCode:', error);
    return null;
  }
}


