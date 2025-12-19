import { supabase } from './supabase';

export interface ReferralStats {
  totalClicks: number;
  totalConversions: number;
  totalEarned: number;
  pendingCommissions: number;
  paidCommissions: number;
}

export interface ReferralCommission {
  id: string;
  referredUserEmail: string;
  paymentAmount: number;
  commissionAmount: number;
  status: 'payable' | 'paid' | 'void';
  createdAt: string;
  paidAt: string | null;
}

export async function getUserReferralCode(userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('users')
    .select('referral_code')
    .eq('id', userId)
    .maybeSingle();

  if (error || !data) return null;
  return data.referral_code;
}

export async function getReferralStats(userId: string): Promise<ReferralStats> {
  const [clicksResult, conversionsResult, commissionsResult] = await Promise.all([
    supabase
      .from('ina_referral_clicks')
      .select('id', { count: 'exact', head: true })
      .eq('referrer_user_id', userId),
    supabase
      .from('ina_referral_conversions')
      .select('id', { count: 'exact', head: true })
      .eq('referrer_user_id', userId),
    supabase
      .from('ina_referral_commissions')
      .select('commission_amount, status')
      .eq('referrer_user_id', userId),
  ]);

  const commissions = commissionsResult.data || [];
  const totalEarned = commissions.reduce((sum, c) => sum + Number(c.commission_amount), 0);
  const pendingCommissions = commissions
    .filter((c) => c.status === 'payable')
    .reduce((sum, c) => sum + Number(c.commission_amount), 0);
  const paidCommissions = commissions
    .filter((c) => c.status === 'paid')
    .reduce((sum, c) => sum + Number(c.commission_amount), 0);

  return {
    totalClicks: clicksResult.count || 0,
    totalConversions: conversionsResult.count || 0,
    totalEarned,
    pendingCommissions,
    paidCommissions,
  };
}

export async function getReferralCommissions(userId: string): Promise<ReferralCommission[]> {
  const { data, error } = await supabase
    .from('ina_referral_commissions')
    .select(`
      id,
      referred_user_id,
      payment_amount,
      commission_amount,
      status,
      created_at,
      paid_at
    `)
    .eq('referrer_user_id', userId)
    .order('created_at', { ascending: false });

  if (error || !data) return [];

  const userIds = [...new Set(data.map((c) => c.referred_user_id))];
  const { data: users } = await supabase
    .from('users')
    .select('id, email')
    .in('id', userIds);

  const userMap = new Map(users?.map((u) => [u.id, u.email]) || []);

  return data.map((c) => ({
    id: c.id,
    referredUserEmail: userMap.get(c.referred_user_id) || 'Unknown',
    paymentAmount: Number(c.payment_amount),
    commissionAmount: Number(c.commission_amount),
    status: c.status,
    createdAt: c.created_at,
    paidAt: c.paid_at,
  }));
}

export function buildReferralLink(referralCode: string): string {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://ineedaffiliates.com';
  return `${baseUrl}/signup?ref=${referralCode}`;
}

export async function trackReferralClick(
  referralCode: string,
  referrerUserId: string
): Promise<void> {
  await supabase.from('ina_referral_clicks').insert({
    referrer_user_id: referrerUserId,
    referral_code: referralCode,
    user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
    referrer_url: typeof document !== 'undefined' ? document.referrer : null,
  });
}

export async function trackReferralClickByCode(referralCode: string): Promise<boolean> {
  const { data: referrer } = await supabase
    .from('users')
    .select('id')
    .eq('referral_code', referralCode)
    .maybeSingle();

  if (!referrer) return false;

  await supabase.from('ina_referral_clicks').insert({
    referrer_user_id: referrer.id,
    referral_code: referralCode,
    user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
    referrer_url: typeof document !== 'undefined' ? document.referrer : null,
  });

  return true;
}
