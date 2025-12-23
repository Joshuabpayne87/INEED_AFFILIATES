import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import {
  Package,
  TrendingUp,
  Users,
  ArrowRight,
  DollarSign,
  Search,
  Sparkles,
  Filter,
  X,
  Bookmark,
  ShoppingCart,
  RefreshCw,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { BusinessProfile } from '../types/business';
import { addOfferToVault, detectCommissionType } from '../lib/offerVaultUtils';
import { displayPrice } from '../lib/currencyUtils';

interface Offer {
  id: string;
  business_id: string;
  business_name: string;
  name: string;
  description: string;
  offer_type: string;
  price?: string;
  commission_structure: string;
  target_audience: string;
  commission_type?: string | null;
  commission_duration?: string | null;
  offer_notes?: string | null;
}


function extractPriceValue(price?: string): number {
  if (!price) return 0;
  const match = price.match(/\$?([\d,]+)/);
  if (match) {
    return parseInt(match[1].replace(/,/g, ''), 10);
  }
  return 0;
}

function getCommissionType(commission: string): string {
  const lower = commission.toLowerCase();
  if (lower.includes('recurring')) return 'recurring';
  if (lower.includes('rev-share') || lower.includes('revenue share')) return 'rev-share';
  if (lower.includes('one-time')) return 'one-time';
  if (lower.includes('recurring') && lower.includes('one-time')) return 'hybrid';
  return 'one-time';
}

function getPriceRange(price?: string): string {
  const value = extractPriceValue(price);
  if (value === 0) return 'unknown';
  if (value < 100) return '$0-$99';
  if (value < 500) return '$100-$499';
  if (value < 1000) return '$500-$999';
  if (value < 5000) return '$1000-$4999';
  return 'Above $5000';
}

function getAISuggestedOffers(userProfile: Partial<BusinessProfile> | null, allOffers: Offer[]): Offer[] {
  if (!userProfile || !userProfile.interested_offer_types) {
    return allOffers.slice(0, 3);
  }

  const scored = allOffers.map(offer => {
    let score = 0;

    if (userProfile.interested_offer_types?.some(type =>
      offer.offer_type.toLowerCase().includes(type.toLowerCase()) ||
      type.toLowerCase().includes(offer.offer_type.toLowerCase())
    )) {
      score += 10;
    }

    if (userProfile.target_audience && offer.target_audience.toLowerCase().includes(userProfile.target_audience.toLowerCase())) {
      score += 5;
    }

    if (userProfile.looking_for?.some(looking =>
      offer.description.toLowerCase().includes(looking.toLowerCase())
    )) {
      score += 3;
    }

    return { offer, score };
  });

  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, 6).map(s => s.offer);
}

export function OfferMarketplace() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterOfferType, setFilterOfferType] = useState<string>('');
  const [filterCommissionType, setFilterCommissionType] = useState<string>('');
  const [filterPriceRange, setFilterPriceRange] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('best-match');
  const [showFilters, setShowFilters] = useState(false);
  const [userProfile, setUserProfile] = useState<Partial<BusinessProfile> | null>(null);
  const [addingToVault, setAddingToVault] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Reload offers when component mounts or when location changes (user navigates to this page)
  useEffect(() => {
    loadOffers();
    if (user) {
      loadUserProfile();
    }
  }, [user, location.pathname]);

  const loadUserProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('businesses')
        .select('*')
        .eq('owner_user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setUserProfile(data);
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  const loadOffers = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    
    try {
      const { data, error } = await supabase
        .from('offers')
        .select(`
          *,
          businesses!inner(
            id,
            company_name,
            profile_state,
            target_audience,
            owner_user_id
          )
        `)
        .eq('is_active', true)
        .eq('businesses.profile_state', 'live');

      if (error) throw error;

      const allOffers: Offer[] = (data || [])
        .filter((offer: any) => !user || offer.businesses.owner_user_id !== user.id)
        .map((offer: any) => ({
          id: offer.id,
          business_id: offer.business_id,
          business_name: offer.businesses.company_name,
          name: offer.offer_name,
          description: offer.description,
          offer_type: offer.offer_type,
          price: offer.price_point,
          commission_structure: `${offer.commission_percent}% commission`,
          target_audience: offer.businesses.target_audience || 'Various audiences',
          commission_type: offer.commission_type,
          commission_duration: offer.commission_duration,
          offer_notes: offer.offer_notes,
        }));

      setOffers(allOffers);
    } catch (error) {
      console.error('Error loading offers:', error);
      setOffers([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    loadOffers(true);
  };

  const filteredAndSortedOffers = useMemo(() => {
    let filtered = offers.filter(offer => {
      const matchesSearch = searchQuery === '' ||
        offer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        offer.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        offer.business_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        offer.offer_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
        offer.target_audience.toLowerCase().includes(searchQuery.toLowerCase()) ||
        offer.commission_structure.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesOfferType = filterOfferType === '' ||
        offer.offer_type.toLowerCase().includes(filterOfferType.toLowerCase());

      const matchesCommissionType = filterCommissionType === '' ||
        getCommissionType(offer.commission_structure) === filterCommissionType;

      const matchesPriceRange = filterPriceRange === '' ||
        getPriceRange(offer.price) === filterPriceRange;

      return matchesSearch && matchesOfferType && matchesCommissionType && matchesPriceRange;
    });

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'price-low':
          return extractPriceValue(a.price) - extractPriceValue(b.price);
        case 'price-high':
          return extractPriceValue(b.price) - extractPriceValue(a.price);
        case 'best-match':
        default:
          return 0;
      }
    });

    return filtered;
  }, [offers, searchQuery, filterOfferType, filterCommissionType, filterPriceRange, sortBy]);

  const aiSuggestedOffers = useMemo(() => {
    if (!user || !userProfile) return [];
    return getAISuggestedOffers(userProfile, offers);
  }, [user, userProfile, offers]);

  const handleViewBusiness = (businessId: string) => {
    navigate(`/business/${businessId}`);
  };

  const handlePromoteOffer = async (offer: Offer) => {
    if (!user) {
      alert('Please sign in to promote offers');
      return;
    }

    setAddingToVault(offer.id);
    setToastMessage(null);

    const result = await addOfferToVault({
      userId: user.id,
      offerId: offer.id,
      businessId: offer.business_id,
      offerName: offer.name,
      companyName: offer.business_name,
      partnerName: offer.business_name,
      price: offer.price || '',
      commission: offer.commission_structure,
      targetClient: offer.target_audience,
      commissionType: detectCommissionType(offer.commission_structure),
      affiliateSignupLink: '',
    });

    setAddingToVault(null);
    setToastMessage({
      text: result.message,
      type: result.success ? 'success' : 'error',
    });

    setTimeout(() => {
      setToastMessage(null);
    }, 5000);
  };

  const handleGetForMyself = (offer: Offer) => {
    alert('This will link to the offer\'s sales page or checkout in a future update.');
  };

  const clearFilters = () => {
    setSearchQuery('');
    setFilterOfferType('');
    setFilterCommissionType('');
    setFilterPriceRange('');
    setSortBy('best-match');
  };

  const hasActiveFilters = searchQuery || filterOfferType || filterCommissionType || filterPriceRange || sortBy !== 'best-match';

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-heading font-bold text-gray-900 mb-2">
            Offer Marketplace
          </h1>
          <p className="text-gray-600">Browse high-ticket offers from partners</p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="h-64 animate-pulse bg-gray-100" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {toastMessage && (
        <div className={`fixed top-20 right-4 z-50 px-6 py-3 rounded-lg shadow-lg ${
          toastMessage.type === 'success' ? 'bg-green-500' : 'bg-red-500'
        } text-white font-semibold`}>
          {toastMessage.text}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold text-gray-900 mb-2">
            Offer Marketplace
          </h1>
          <p className="text-gray-600">Browse high-ticket offers from partners</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing || loading}
          className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          title="Refresh offers"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search offers by name, type, business, or keywords..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6666FF] focus:border-transparent"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-4 py-2 rounded-lg font-semibold flex items-center gap-2 transition-all ${
              showFilters
                ? 'bg-[#6666FF] text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Filter className="w-5 h-5" />
            Filters
          </button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-gray-200">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Offer Type</label>
              <select
                value={filterOfferType}
                onChange={(e) => setFilterOfferType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6666FF] focus:border-transparent"
              >
                <option value="">All Types</option>
                <option value="SaaS">SaaS</option>
                <option value="Coaching">Coaching</option>
                <option value="Agency">Agency Service</option>
                <option value="Done-for-you">Done-for-you</option>
                <option value="Strategy">Strategy Session</option>
                <option value="Info Product">Info Product</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Commission Type</label>
              <select
                value={filterCommissionType}
                onChange={(e) => setFilterCommissionType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6666FF] focus:border-transparent"
              >
                <option value="">All Types</option>
                <option value="recurring">Recurring</option>
                <option value="one-time">One-time</option>
                <option value="rev-share">Rev-share</option>
                <option value="hybrid">Hybrid</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Price Range</label>
              <select
                value={filterPriceRange}
                onChange={(e) => setFilterPriceRange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6666FF] focus:border-transparent"
              >
                <option value="">All Prices</option>
                <option value="$0-$99">$0 - $99</option>
                <option value="$100-$499">$100 - $499</option>
                <option value="$500-$999">$500 - $999</option>
                <option value="$1000-$4999">$1,000 - $4,999</option>
                <option value="Above $5000">Above $5,000</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Sort By</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6666FF] focus:border-transparent"
              >
                <option value="best-match">Best Match</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
              </select>
            </div>
          </div>
        )}

        {hasActiveFilters && (
          <div className="flex items-center justify-between pt-2 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              Showing {filteredAndSortedOffers.length} of {offers.length} offers
            </p>
            <button
              onClick={clearFilters}
              className="text-sm text-[#6666FF] hover:text-[#5555EE] font-semibold flex items-center gap-1"
            >
              <X className="w-4 h-4" />
              Clear filters
            </button>
          </div>
        )}
      </div>

      {user && aiSuggestedOffers.length > 0 && (
        <div className="bg-gradient-to-r from-[#6666FF]/10 to-[#66FFFF]/10 rounded-lg border border-[#6666FF]/20 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-6 h-6 text-[#6666FF]" />
            <h2 className="text-xl font-bold text-[#001134]">AI Suggested Offers for You</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {aiSuggestedOffers.slice(0, 3).map((offer) => (
              <Card key={offer.id} hover className="flex flex-col bg-white p-4">
                <Badge variant="primary" className="text-xs w-fit mb-2">Recommended</Badge>
                <h3 className="text-base font-bold text-[#001134] mb-1 line-clamp-1">{offer.name}</h3>
                <p className="text-xs text-gray-600 mb-2">{offer.business_name}</p>
                {offer.price && (
                  <p className="text-lg font-extrabold text-[#6666FF] mb-2">{displayPrice(offer.price)}</p>
                )}
                <Badge variant="secondary" className="text-xs w-fit mb-2">{offer.offer_type}</Badge>
                <p className="text-xs text-gray-700 line-clamp-2 mb-3">{offer.description}</p>

                <div className="space-y-2 mb-3 text-xs">
                  <div className="flex items-start gap-2">
                    <TrendingUp className="w-3 h-3 text-[#66FFFF] mt-0.5 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-600 uppercase text-[10px]">Commission</p>
                      <p className="text-gray-900 line-clamp-1">{offer.commission_structure}</p>
                    </div>
                  </div>

                  {offer.commission_type && (
                    <div className="flex items-start gap-2">
                      <DollarSign className="w-3 h-3 text-[#6666FF] mt-0.5 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-600 uppercase text-[10px]">Type</p>
                        <p className="text-gray-900 line-clamp-1 capitalize">{offer.commission_type}</p>
                      </div>
                    </div>
                  )}

                  {offer.commission_duration && (
                    <div className="flex items-start gap-2">
                      <TrendingUp className="w-3 h-3 text-[#66FFFF] mt-0.5 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-600 uppercase text-[10px]">Duration</p>
                        <p className="text-gray-900 line-clamp-1 capitalize">{offer.commission_duration}</p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-start gap-2">
                    <Users className="w-3 h-3 text-[#FF1493] mt-0.5 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-600 uppercase text-[10px]">Target</p>
                      <p className="text-gray-900 line-clamp-1">{offer.target_audience}</p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleViewBusiness(offer.business_id)}
                  className="w-full px-3 py-2 text-sm bg-gradient-to-r from-[#6666FF] to-[#66FFFF] text-white rounded-lg font-semibold hover:shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  View Details
                  <ArrowRight className="w-3 h-3" />
                </button>
              </Card>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredAndSortedOffers.map((offer) => (
          <Card key={offer.id} hover className="flex flex-col p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-[#6666FF] to-[#66FFFF] flex items-center justify-center flex-shrink-0">
                <Package className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-[#001134] line-clamp-1">{offer.name}</h3>
                <p className="text-xs text-gray-600 line-clamp-1">{offer.business_name}</p>
              </div>
            </div>

            <div className="flex items-baseline gap-2 mb-2">
              {offer.price && (
                <p className="text-lg font-extrabold text-[#6666FF]">{displayPrice(offer.price)}</p>
              )}
              <Badge variant="secondary" className="text-xs">{offer.offer_type}</Badge>
            </div>

            <p className="text-xs text-gray-700 line-clamp-3 mb-3 flex-1">{offer.description}</p>

            <div className="space-y-2 mb-3 text-xs">
              <div className="flex items-start gap-2">
                <TrendingUp className="w-3 h-3 text-[#66FFFF] mt-0.5 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="font-semibold text-gray-600 uppercase text-[10px]">Commission</p>
                  <p className="text-gray-900 line-clamp-1">{offer.commission_structure}</p>
                </div>
              </div>

              {offer.commission_type && (
                <div className="flex items-start gap-2">
                  <DollarSign className="w-3 h-3 text-[#6666FF] mt-0.5 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-600 uppercase text-[10px]">Type</p>
                    <p className="text-gray-900 line-clamp-1 capitalize">{offer.commission_type}</p>
                  </div>
                </div>
              )}

              {offer.commission_duration && (
                <div className="flex items-start gap-2">
                  <TrendingUp className="w-3 h-3 text-[#66FFFF] mt-0.5 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-600 uppercase text-[10px]">Duration</p>
                    <p className="text-gray-900 line-clamp-1 capitalize">{offer.commission_duration}</p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-2">
                <Users className="w-3 h-3 text-[#FF1493] mt-0.5 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="font-semibold text-gray-600 uppercase text-[10px]">Target</p>
                  <p className="text-gray-900 line-clamp-1">{offer.target_audience}</p>
                </div>
              </div>

              {offer.offer_notes && (
                <div className="flex items-start gap-2">
                  <Package className="w-3 h-3 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-600 uppercase text-[10px]">Notes</p>
                    <p className="text-gray-900 line-clamp-2">{offer.offer_notes}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-gray-200 space-y-2">
              <button
                onClick={() => handlePromoteOffer(offer)}
                disabled={!user || addingToVault === offer.id}
                className="w-full px-3 py-2 text-sm bg-gradient-to-r from-[#6666FF] to-[#66FFFF] text-white rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Bookmark className="w-3 h-3" />
                {addingToVault === offer.id ? 'Adding...' : 'Promote'}
              </button>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleGetForMyself(offer)}
                  className="px-2 py-1.5 text-xs border border-[#6666FF] text-[#6666FF] rounded-lg font-semibold hover:bg-[#6666FF] hover:text-white transition-all flex items-center justify-center gap-1"
                >
                  <ShoppingCart className="w-3 h-3" />
                  Get It
                </button>
                <button
                  onClick={() => handleViewBusiness(offer.business_id)}
                  className="px-2 py-1.5 text-xs bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-all flex items-center justify-center gap-1"
                >
                  Details
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {filteredAndSortedOffers.length === 0 && (
        <Card className="text-center py-12">
          <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 mb-2">No offers match your search criteria</p>
          <button
            onClick={clearFilters}
            className="text-[#6666FF] hover:text-[#5555EE] font-semibold"
          >
            Clear filters to see all offers
          </button>
        </Card>
      )}
    </div>
  );
}
