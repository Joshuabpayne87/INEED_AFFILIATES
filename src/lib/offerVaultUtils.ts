import { supabase } from './supabase';
import { getConnectionStatus as getConnectionStatusUtil, sendConnectionRequest as sendConnectionRequestUtil } from './connectionUtils';

interface AddToVaultParams {
  userId: string;
  offerId: string;
  businessId: string;
  offerName: string;
  companyName: string;
  partnerName: string;
  price: string;
  commission: string;
  targetClient: string;
  commissionType: string;
  affiliateSignupLink?: string;
}

async function getBusinessOwnerId(businessId: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('businesses')
      .select('owner_user_id')
      .eq('id', businessId)
      .maybeSingle();

    if (error) throw error;
    return data?.owner_user_id || null;
  } catch (error) {
    console.error('Error getting business owner:', error);
    return null;
  }
}

export function detectCommissionType(commission: string): string {
  const lower = commission.toLowerCase();
  if (lower.includes('recurring')) return 'Recurring';
  if (lower.includes('rev-share') || lower.includes('revenue share')) return 'Rev-share';
  if (lower.includes('one-time')) return 'One-time';
  if (lower.includes('recurring') && lower.includes('one-time')) return 'Hybrid';
  return 'One-time';
}

export async function addOfferToVault(params: AddToVaultParams): Promise<{ success: boolean; message: string; status?: string }> {
  try {
    const { userId, businessId, offerId } = params;

    const { data: existing } = await supabase
      .from('offer_vault')
      .select('id')
      .eq('user_id', userId)
      .eq('offer_id', offerId)
      .maybeSingle();

    if (existing) {
      return {
        success: false,
        message: 'This offer is already in your Vault.',
      };
    }

    const businessOwnerId = await getBusinessOwnerId(businessId);
    if (!businessOwnerId) {
      return {
        success: false,
        message: 'Business owner not found.',
      };
    }

    const connectionStatus = await getConnectionStatusUtil(userId, businessOwnerId);

    let vaultStatus: 'pending_connection' | 'approved';
    if (connectionStatus === 'none' || connectionStatus === 'pending_sent') {
      vaultStatus = 'pending_connection';

      if (connectionStatus === 'none') {
        await sendConnectionRequestUtil(userId, businessOwnerId);
      }
    } else if (connectionStatus === 'accepted') {
      vaultStatus = 'approved';
    } else {
      vaultStatus = 'pending_connection';
    }

    const { error: insertError } = await supabase
      .from('offer_vault')
      .insert({
        user_id: userId,
        offer_id: offerId,
        business_id: businessId,
        offer_name: params.offerName,
        company_name: params.companyName,
        partner_name: params.partnerName,
        price: params.price || '',
        commission: params.commission,
        target_client: params.targetClient,
        commission_type: params.commissionType,
        affiliate_signup_link: params.affiliateSignupLink || '',
        portal_login_link: '',
        affiliate_link: '',
        status: vaultStatus,
      });

    if (insertError) throw insertError;

    const message = vaultStatus === 'pending_connection'
      ? 'Offer added to your Offer Vault. Connection request sent to partner.'
      : 'Offer added to your Offer Vault. You can access affiliate details in My Offer Vault.';

    return {
      success: true,
      message,
      status: vaultStatus,
    };
  } catch (error) {
    console.error('Error adding offer to vault:', error);
    return {
      success: false,
      message: 'Failed to add offer to vault. Please try again.',
    };
  }
}
