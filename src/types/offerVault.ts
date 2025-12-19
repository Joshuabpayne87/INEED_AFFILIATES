export type OfferVaultStatus = 'pending_connection' | 'approved';

export interface OfferVaultEntry {
  id: string;
  user_id: string;
  offer_id: string;
  business_id: string;
  offer_name: string;
  company_name: string;
  partner_name: string;
  price: string;
  commission: string;
  target_client: string;
  commission_type: string;
  affiliate_signup_link: string;
  portal_login_link: string;
  affiliate_link: string;
  status: OfferVaultStatus;
  created_at: string;
}
