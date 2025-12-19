import { useState, useEffect } from 'react';
import { X, Copy, Check, Users, TrendingUp, DollarSign, MousePointer } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getUserReferralCode, getReferralStats, buildReferralLink, ReferralStats } from '../lib/referralUtils';

interface InviteFriendsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function InviteFriendsModal({ isOpen, onClose }: InviteFriendsModalProps) {
  const { user } = useAuth();
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && user) {
      loadReferralData();
    }
  }, [isOpen, user]);

  const loadReferralData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const [code, referralStats] = await Promise.all([
        getUserReferralCode(user.id),
        getReferralStats(user.id),
      ]);
      setReferralCode(code);
      setStats(referralStats);
    } catch (error) {
      console.error('Error loading referral data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
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

  if (!isOpen) return null;

  const referralLink = referralCode ? buildReferralLink(referralCode) : '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="bg-gradient-to-r from-navy to-navy-600 px-6 py-5 text-white">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-heading font-bold">Invite Friends</h2>
              <p className="text-cyan-100 text-sm">Earn 20% lifetime commissions</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-gradient-to-br from-primary/5 to-cyan/5 rounded-xl p-4 border border-primary/10">
            <p className="text-gray-700 leading-relaxed">
              Invite other businesses to grow their revenue on ineedaffiliates.com!
              <span className="font-semibold text-primary"> Earn 20% lifetime commissions</span> for
              each new signup and track your commissions in your Offer Vault.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Your Unique Referral Link
            </label>
            {loading ? (
              <div className="h-12 bg-gray-100 rounded-lg animate-pulse" />
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={referralLink}
                  className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 font-mono"
                />
                <button
                  onClick={handleCopy}
                  className={`px-4 py-3 rounded-lg font-medium text-sm flex items-center gap-2 transition-all ${
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
                      Copy
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {!loading && stats && (
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <div className="flex items-center gap-2 text-gray-500 mb-1">
                  <MousePointer className="w-4 h-4" />
                  <span className="text-xs font-medium uppercase tracking-wide">Clicks</span>
                </div>
                <p className="text-2xl font-heading font-bold text-gray-900">
                  {stats.totalClicks.toLocaleString()}
                </p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <div className="flex items-center gap-2 text-gray-500 mb-1">
                  <Users className="w-4 h-4" />
                  <span className="text-xs font-medium uppercase tracking-wide">Signups</span>
                </div>
                <p className="text-2xl font-heading font-bold text-gray-900">
                  {stats.totalConversions.toLocaleString()}
                </p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <div className="flex items-center gap-2 text-gray-500 mb-1">
                  <TrendingUp className="w-4 h-4" />
                  <span className="text-xs font-medium uppercase tracking-wide">Pending</span>
                </div>
                <p className="text-2xl font-heading font-bold text-primary">
                  ${stats.pendingCommissions.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <div className="flex items-center gap-2 text-gray-500 mb-1">
                  <DollarSign className="w-4 h-4" />
                  <span className="text-xs font-medium uppercase tracking-wide">Total Earned</span>
                </div>
                <p className="text-2xl font-heading font-bold text-green-600">
                  ${stats.totalEarned.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          )}

          <div className="pt-2">
            <p className="text-xs text-gray-500 text-center">
              Commission payouts are processed monthly for balances over $50.
              Track detailed earnings in your Offer Vault.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
