import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { ExternalLink, Trash2, Eye, AlertCircle, Copy, Check, MousePointer, Users, TrendingUp, DollarSign, Gift, Link2, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { OfferVaultEntry } from '../types/offerVault';
import { displayPrice } from '../lib/currencyUtils';
import { getUserReferralCode, getReferralStats, buildReferralLink, ReferralStats } from '../lib/referralUtils';
import { getOrCreateOfferAffiliateCode, buildOfferAffiliateLink, getOfferAffiliateStats, OfferAffiliateStats } from '../lib/offerAffiliateUtils';

export function OfferVaultPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [entries, setEntries] = useState<OfferVaultEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingField, setEditingField] = useState<{ id: string; field: 'portal_login_link' | 'affiliate_link' } | null>(null);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [referralStats, setReferralStats] = useState<ReferralStats | null>(null);
  const [copied, setCopied] = useState(false);
  const [offerShortCodes, setOfferShortCodes] = useState<Record<string, string>>({});
  const [offerStats, setOfferStats] = useState<Record<string, OfferAffiliateStats>>({});
  const [generatingCode, setGeneratingCode] = useState<string | null>(null);
  const [copiedOfferId, setCopiedOfferId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadVaultEntries();
      loadReferralData();
    }
  }, [user]);

  // Load existing affiliate codes when entries change
  useEffect(() => {
    if (user && entries.length > 0) {
      loadExistingAffiliateCodes();
    }
  }, [entries, user]);

  const loadExistingAffiliateCodes = async () => {
    if (!user) return;
    try {
      const offerIds = entries.map(e => e.offer_id);
      const { data: codes } = await supabase
        .from('offer_affiliate_codes')
        .select('offer_id, short_code')
        .eq('user_id', user.id)
        .in('offer_id', offerIds);

      if (codes && codes.length > 0) {
        const codeMap: Record<string, string> = {};
        codes.forEach(c => {
          codeMap[c.offer_id] = c.short_code;
        });
        setOfferShortCodes(codeMap);

        // Load stats for each offer with a code
        const statsPromises = codes.map(c =>
          getOfferAffiliateStats(user.id, c.offer_id).then(stats => ({
            offerId: c.offer_id,
            stats,
          }))
        );
        const statsResults = await Promise.all(statsPromises);
        const statsMap: Record<string, OfferAffiliateStats> = {};
        statsResults.forEach(r => {
          statsMap[r.offerId] = r.stats;
        });
        setOfferStats(statsMap);
      }
    } catch (error) {
      console.error('Error loading affiliate codes:', error);
    }
  };

  const loadReferralData = async () => {
    if (!user) return;
    try {
      const [code, stats] = await Promise.all([
        getUserReferralCode(user.id),
        getReferralStats(user.id),
      ]);
      setReferralCode(code);
      setReferralStats(stats);
    } catch (error) {
      console.error('Error loading referral data:', error);
    }
  };

  const handleCopyReferralLink = async () => {
    if (!referralCode) return;
    const link = buildReferralLink(referralCode);
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const generateOfferShortLink = async (offerId: string) => {
    if (!user || generatingCode) return;
    setGeneratingCode(offerId);
    try {
      const code = await getOrCreateOfferAffiliateCode(user.id, offerId);
      if (code) {
        setOfferShortCodes(prev => ({ ...prev, [offerId]: code }));
        // Also load stats for this offer
        const stats = await getOfferAffiliateStats(user.id, offerId);
        setOfferStats(prev => ({ ...prev, [offerId]: stats }));
      }
    } catch (error) {
      console.error('Error generating short link:', error);
    } finally {
      setGeneratingCode(null);
    }
  };

  const copyOfferShortLink = async (offerId: string, shortCode: string) => {
    try {
      const link = buildOfferAffiliateLink(shortCode);
      await navigator.clipboard.writeText(link);
      setCopiedOfferId(offerId);
      setTimeout(() => setCopiedOfferId(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const loadVaultEntries = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('offer_vault')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEntries(data || []);
    } catch (error) {
      console.error('Error loading vault entries:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateField = async (id: string, field: 'portal_login_link' | 'affiliate_link', value: string) => {
    try {
      const { error } = await supabase
        .from('offer_vault')
        .update({ [field]: value })
        .eq('id', id);

      if (error) throw error;

      setEntries(prev =>
        prev.map(entry =>
          entry.id === id ? { ...entry, [field]: value } : entry
        )
      );
    } catch (error) {
      console.error('Error updating field:', error);
    }
  };

  const removeFromVault = async (id: string) => {
    if (!confirm('Are you sure you want to remove this offer from your vault?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('offer_vault')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setEntries(prev => prev.filter(entry => entry.id !== id));
    } catch (error) {
      console.error('Error removing from vault:', error);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-heading font-bold text-gray-900 mb-2">
            My Offer Vault
          </h1>
          <p className="text-gray-600">Your personal offers to promote</p>
        </div>
        <Card className="h-96 animate-pulse bg-gray-100" />
      </div>
    );
  }

  const referralLinkEmpty = referralCode ? buildReferralLink(referralCode) : '';

  if (entries.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-heading font-bold text-gray-900 mb-2">
            My Offer Vault
          </h1>
          <p className="text-gray-600">Your personal offers to promote</p>
          <p className="text-sm text-gray-500 mt-2">1 offer saved</p>
        </div>

        <Card className="overflow-hidden border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-cyan/5">
          <div className="p-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary to-cyan flex items-center justify-center flex-shrink-0">
                  <Gift className="w-7 h-7 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-heading font-bold text-gray-900">
                      INeedAffiliates Referral Program
                    </h3>
                    <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                      Active
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    Earn <span className="font-semibold text-primary">20% lifetime commissions</span> for every business you refer
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={referralLinkEmpty}
                  className="w-64 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 font-mono"
                />
                <button
                  onClick={handleCopyReferralLink}
                  className={`px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-all ${
                    copied
                      ? 'bg-green-500 text-white'
                      : 'bg-gradient-to-r from-primary to-cyan text-white hover:shadow-lg'
                  }`}
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy Link
                    </>
                  )}
                </button>
              </div>
            </div>

            {referralStats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-200">
                <div className="bg-white rounded-xl p-4 border border-gray-100">
                  <div className="flex items-center gap-2 text-gray-500 mb-1">
                    <MousePointer className="w-4 h-4" />
                    <span className="text-xs font-medium uppercase tracking-wide">Clicks</span>
                  </div>
                  <p className="text-2xl font-heading font-bold text-gray-900">
                    {referralStats.totalClicks.toLocaleString()}
                  </p>
                </div>
                <div className="bg-white rounded-xl p-4 border border-gray-100">
                  <div className="flex items-center gap-2 text-gray-500 mb-1">
                    <Users className="w-4 h-4" />
                    <span className="text-xs font-medium uppercase tracking-wide">Signups</span>
                  </div>
                  <p className="text-2xl font-heading font-bold text-gray-900">
                    {referralStats.totalConversions.toLocaleString()}
                  </p>
                </div>
                <div className="bg-white rounded-xl p-4 border border-gray-100">
                  <div className="flex items-center gap-2 text-gray-500 mb-1">
                    <TrendingUp className="w-4 h-4" />
                    <span className="text-xs font-medium uppercase tracking-wide">Pending</span>
                  </div>
                  <p className="text-2xl font-heading font-bold text-primary">
                    ${referralStats.pendingCommissions.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="bg-white rounded-xl p-4 border border-gray-100">
                  <div className="flex items-center gap-2 text-gray-500 mb-1">
                    <DollarSign className="w-4 h-4" />
                    <span className="text-xs font-medium uppercase tracking-wide">Total Earned</span>
                  </div>
                  <p className="text-2xl font-heading font-bold text-green-600">
                    ${referralStats.totalEarned.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            )}
          </div>
        </Card>

        <Card className="text-center py-12">
          <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 mb-2">You haven't added any other offers to your Vault yet.</p>
          <p className="text-sm text-gray-400 mb-4">
            Go to the Offer Marketplace to start saving offers to promote.
          </p>
          <button
            onClick={() => navigate('/offers')}
            className="px-6 py-2 bg-gradient-to-r from-[#6666FF] to-[#66FFFF] text-white rounded-lg font-semibold hover:shadow-lg transition-all"
          >
            Browse Offer Marketplace
          </button>
        </Card>
      </div>
    );
  }

  const referralLink = referralCode ? buildReferralLink(referralCode) : '';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-heading font-bold text-gray-900 mb-2">
          My Offer Vault
        </h1>
        <p className="text-gray-600">Your personal offers to promote</p>
        <p className="text-sm text-gray-500 mt-2">
          {entries.length} {entries.length === 1 ? 'offer' : 'offers'} saved
        </p>
      </div>

      <Card className="overflow-hidden border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-cyan/5">
        <div className="p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary to-cyan flex items-center justify-center flex-shrink-0">
                <Gift className="w-7 h-7 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-heading font-bold text-gray-900">
                    INeedAffiliates Referral Program
                  </h3>
                  <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                    Active
                  </span>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  Earn <span className="font-semibold text-primary">20% lifetime commissions</span> for every business you refer
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={referralLink}
                className="w-64 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 font-mono"
              />
              <button
                onClick={handleCopyReferralLink}
                className={`px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-all ${
                  copied
                    ? 'bg-green-500 text-white'
                    : 'bg-gradient-to-r from-primary to-cyan text-white hover:shadow-lg'
                }`}
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copy Link
                  </>
                )}
              </button>
            </div>
          </div>

          {referralStats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-200">
              <div className="bg-white rounded-xl p-4 border border-gray-100">
                <div className="flex items-center gap-2 text-gray-500 mb-1">
                  <MousePointer className="w-4 h-4" />
                  <span className="text-xs font-medium uppercase tracking-wide">Clicks</span>
                </div>
                <p className="text-2xl font-heading font-bold text-gray-900">
                  {referralStats.totalClicks.toLocaleString()}
                </p>
              </div>
              <div className="bg-white rounded-xl p-4 border border-gray-100">
                <div className="flex items-center gap-2 text-gray-500 mb-1">
                  <Users className="w-4 h-4" />
                  <span className="text-xs font-medium uppercase tracking-wide">Signups</span>
                </div>
                <p className="text-2xl font-heading font-bold text-gray-900">
                  {referralStats.totalConversions.toLocaleString()}
                </p>
              </div>
              <div className="bg-white rounded-xl p-4 border border-gray-100">
                <div className="flex items-center gap-2 text-gray-500 mb-1">
                  <TrendingUp className="w-4 h-4" />
                  <span className="text-xs font-medium uppercase tracking-wide">Pending</span>
                </div>
                <p className="text-2xl font-heading font-bold text-primary">
                  ${referralStats.pendingCommissions.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="bg-white rounded-xl p-4 border border-gray-100">
                <div className="flex items-center gap-2 text-gray-500 mb-1">
                  <DollarSign className="w-4 h-4" />
                  <span className="text-xs font-medium uppercase tracking-wide">Total Earned</span>
                </div>
                <p className="text-2xl font-heading font-bold text-green-600">
                  ${referralStats.totalEarned.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          )}
        </div>
      </Card>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200">
                  OFFER
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200">
                  COMPANY
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200">
                  PARTNER NAME
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200">
                  STATUS
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200">
                  AFFILIATE SIGN UP
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200">
                  PRICE
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200">
                  COMMISSION
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200">
                  TARGET CLIENT
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  COMMISSION TYPE
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {entries.map((entry) => {
                const isPending = entry.status === 'pending_connection';

                return (
                  <tr
                    key={entry.id}
                    className={`hover:bg-gray-50 transition-colors ${isPending ? 'opacity-70' : ''}`}
                  >
                    <td className="px-6 py-4 border-r border-gray-200">
                      <button
                        onClick={() => navigate(`/business/${entry.business_id}`)}
                        className="text-sm font-semibold text-[#001134] hover:text-[#6666FF] hover:underline text-left"
                      >
                        {entry.offer_name}
                      </button>
                    </td>
                    <td className="px-6 py-4 border-r border-gray-200">
                      <div className="text-sm text-gray-900">{entry.company_name}</div>
                    </td>
                    <td className="px-6 py-4 border-r border-gray-200">
                      <div className="text-sm text-gray-900">{entry.partner_name}</div>
                    </td>
                    <td className="px-6 py-4 border-r border-gray-200">
                      {isPending ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800">
                          Pending Connection Approval
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                          Approved
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 border-r border-gray-200">
                      {isPending ? (
                        <span className="text-sm text-gray-500">Locked until approved</span>
                      ) : entry.affiliate_signup_link ? (
                        <a
                          href={entry.affiliate_signup_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-semibold text-[#6666FF] hover:underline flex items-center gap-1"
                        >
                          Open signup
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="text-sm text-gray-500">No link yet</span>
                      )}
                    </td>
                    <td className="px-6 py-4 border-r border-gray-200">
                      <div className="text-sm font-bold text-gray-900">{displayPrice(entry.price)}</div>
                    </td>
                    <td className="px-6 py-4 border-r border-gray-200">
                      <div className="text-sm text-gray-700" title={entry.commission}>
                        {entry.commission}
                      </div>
                    </td>
                    <td className="px-6 py-4 border-r border-gray-200">
                      <div className="text-sm text-gray-700 max-w-xs truncate" title={entry.target_client}>
                        {entry.target_client}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{entry.commission_type}</div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
