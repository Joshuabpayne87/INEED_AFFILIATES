export type ProfileState = 'draft' | 'live';
export type ConnectionStatus = 'none' | 'pending_sent' | 'pending_received' | 'accepted';

export interface BusinessProfile {
  id: string;
  owner_user_id: string;
  company_name: string;
  contact_name: string;
  email: string;
  website: string;
  description: string;
  partnership_type: string;
  industry: string;
  commission_rate: string;
  requirements: string;
  logo_url: string | null;
  featured: boolean;
  profile_state: ProfileState;
  tagline?: string;
  video_url?: string;
  problem_solved?: string;
  target_audience?: string;
  main_offer_type?: string;
  unique_value?: string;
  founder_name?: string;
  founder_headshot_url?: string;
  founder_bio?: string;
  founder_background?: string;
  founder_why_started?: string;
  niche?: string;
  monetization_type?: string;
  cross_promotion_preference?: string;
  social_audience_size?: string;
  email_list_size?: string;
  email_open_rate?: string;
  number_of_offers?: string;
  partnership_opportunities?: string;
  looking_for?: string[];
  primary_offers?: Array<{
    name: string;
    description: string;
    offer_type: string;
    price?: string;
    commission_structure: string;
    target_audience: string;
  }>;
  interested_offer_types?: string[];
  collaboration_types?: string[];
  calendar_link?: string;
}

export function isProfileComplete(b: BusinessProfile | null): boolean {
  if (!b) return false;

  const requiredStrings = [
    b.company_name,
    b.website,
    b.industry,
    b.niche,
    b.partnership_type,
    b.main_offer_type,
    b.monetization_type,
    b.tagline,
    b.description,
    b.problem_solved,
    b.target_audience,
    b.unique_value,
    b.founder_name,
    b.founder_bio,
    b.founder_background,
    b.founder_why_started,
    b.social_audience_size,
    b.email_list_size,
    b.email_open_rate,
    b.number_of_offers,
    b.commission_rate,
    b.requirements,
    b.cross_promotion_preference,
    b.contact_name,
    b.email,
    b.calendar_link,
  ];

  const anyEmpty = requiredStrings.some(
    (value) => !value || String(value).trim().length === 0
  );

  if (anyEmpty) return false;

  const hasPartnershipOpps =
    typeof b.partnership_opportunities === 'string' &&
    b.partnership_opportunities.trim().length > 0;

  const hasLookingFor =
    Array.isArray(b.looking_for) && b.looking_for.length > 0;

  return hasPartnershipOpps && hasLookingFor;
}
