import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Mail,
  Globe,
  Megaphone,
  BarChart3,
  Users,
  Package,
  TrendingUp,
  MessageCircle,
  Calendar,
  Bookmark,
  UserPlus,
  Check,
  Clock,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { BusinessProfile, ConnectionStatus } from '../types/business';
import { addOfferToVault, detectCommissionType } from '../lib/offerVaultUtils';
import { useAuth } from '../contexts/AuthContext';
import { displayPrice } from '../lib/currencyUtils';
import {
  getConnectionStatus,
  sendConnectionRequest,
  acceptConnectionRequest,
  getConnection
} from '../lib/connectionUtils';

interface Offer {
  id: string;
  business_id: string;
  offer_name: string;
  description: string;
  price_point: string;
  commission_percent: number;
  offer_type: string;
  promo_methods: string[];
  resources_link: string | null;
  affiliate_signup_link: string | null;
  purchase_affiliate_link: string | null;
  commission_type: string | null;
  commission_duration: string | null;
  offer_notes: string | null;
  is_active: boolean;
  created_at: string;
}

export default function BusinessProfilePage() {
  const { id } = useParams<{ id: string }>();
  const [business, setBusiness] = useState<Partial<BusinessProfile> | null>(null);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedOffer, setExpandedOffer] = useState<number | null>(null);
  const [isFavorited, setIsFavorited] = useState(false);
  const [isFavLoading, setIsFavLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('none');
  const [addingToVault, setAddingToVault] = useState<number | null>(null);
  const [vaultMessage, setVaultMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [connectionLoading, setConnectionLoading] = useState(false);
  const [connectionId, setConnectionId] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (id) {
      loadBusiness();
      checkFavoriteStatus();
      checkConnectionStatus();
    }
  }, [id]);

  async function loadBusiness() {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('businesses')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) {
        console.error('Error loading business:', error);
      }

      if (data) {
        setBusiness(data);
        await loadOffers(data.id);
      } else {
        setBusiness(null);
      }
    } catch (error) {
      console.error('Error loading business:', error);
      setBusiness(null);
    } finally {
      setIsLoading(false);
    }
  }

  async function loadOffers(businessId: string) {
    try {
      const { data, error } = await supabase
        .from('offers')
        .select('*')
        .eq('business_id', businessId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOffers(data || []);
    } catch (error) {
      console.error('Error loading offers:', error);
      setOffers([]);
    }
  }

  const checkFavoriteStatus = async () => {
    if (!id) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('favorites')
      .select('id')
      .eq('user_id', user.id)
      .eq('partnership_id', id)
      .maybeSingle();

    setIsFavorited(!!data);
  };

  const checkConnectionStatus = async () => {
    if (!id || !user) return;

    const { data: businessData } = await supabase
      .from('businesses')
      .select('owner_user_id')
      .eq('id', id)
      .maybeSingle();

    if (!businessData) return;

    if (businessData.owner_user_id === user.id) {
      setConnectionStatus('none');
      return;
    }

    const status = await getConnectionStatus(user.id, businessData.owner_user_id);
    setConnectionStatus(status);

    const connection = await getConnection(user.id, businessData.owner_user_id);
    if (connection) {
      setConnectionId(connection.id);
    }
  };

  const toggleFavorite = async () => {
    if (!id) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      alert('Please sign in to bookmark partnerships');
      return;
    }

    setIsFavLoading(true);

    if (isFavorited) {
      await supabase
        .from('favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('partnership_id', id);
      setIsFavorited(false);
    } else {
      await supabase
        .from('favorites')
        .insert({ user_id: user.id, partnership_id: id });
      setIsFavorited(true);
    }

    setIsFavLoading(false);
  };

  const handleConnect = async () => {
    if (!user || !business) return;

    setConnectionLoading(true);
    try {
      const { data: businessData } = await supabase
        .from('businesses')
        .select('owner_user_id')
        .eq('id', business.id)
        .maybeSingle();

      if (!businessData) {
        alert('Business not found');
        return;
      }

      const result = await sendConnectionRequest(user.id, businessData.owner_user_id);

      if (result.success) {
        await checkConnectionStatus();
      } else {
        alert(result.message || 'Failed to send connection request');
      }
    } catch (error) {
      console.error('Error sending connection request:', error);
      alert('Failed to send connection request. Please try again.');
    } finally {
      setConnectionLoading(false);
    }
  };

  const handleAcceptConnection = async () => {
    if (!connectionId) return;

    setConnectionLoading(true);
    try {
      const result = await acceptConnectionRequest(connectionId);

      if (result.success) {
        await checkConnectionStatus();
      } else {
        alert(result.message || 'Failed to accept connection');
      }
    } catch (error) {
      console.error('Error accepting connection:', error);
      alert('Failed to accept connection. Please try again.');
    } finally {
      setConnectionLoading(false);
    }
  };

  const handleAddToVault = async (offer: Offer, offerIndex: number) => {
    if (!user) {
      alert('Please sign in to add offers to your vault');
      return;
    }

    if (!business) return;

    setAddingToVault(offerIndex);
    setVaultMessage(null);

    const commissionStr = `${offer.commission_percent}% commission`;
    const result = await addOfferToVault({
      userId: user.id,
      offerId: offer.id,
      businessId: business.id as string,
      offerName: offer.offer_name,
      companyName: business.company_name || '',
      partnerName: business.founder_name || business.contact_name || '',
      price: offer.price_point || '',
      commission: commissionStr,
      targetClient: business.target_audience || '',
      commissionType: detectCommissionType(commissionStr),
      affiliateSignupLink: offer.affiliate_signup_link || '',
    });

    setAddingToVault(null);
    setVaultMessage({
      text: result.message,
      type: result.success ? 'success' : 'error',
    });

    setTimeout(() => {
      setVaultMessage(null);
    }, 5000);

    if (result.success) {
      await checkConnectionStatus();
    }
  };

  function getEmbedUrl(url: string): string {
    if (!url) return '';

    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      const videoId = url.includes('youtu.be')
        ? url.split('youtu.be/')[1]?.split('?')[0]
        : url.split('v=')[1]?.split('&')[0];
      return `https://www.youtube.com/embed/${videoId}`;
    }

    if (url.includes('vimeo.com')) {
      const videoId = url.split('vimeo.com/')[1]?.split('?')[0];
      return `https://player.vimeo.com/video/${videoId}`;
    }

    if (url.includes('loom.com')) {
      const videoId = url.split('loom.com/share/')[1]?.split('?')[0];
      return `https://www.loom.com/embed/${videoId}`;
    }

    if (url.includes('wistia')) {
      return url;
    }

    return url;
  }

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-8">
        <div className="h-12 bg-gray-200 rounded w-1/3"></div>
        <div className="h-64 bg-gray-200 rounded"></div>
        <div className="h-96 bg-gray-200 rounded"></div>
      </div>
    );
  }

  if (!business) {
    return (
      <div className="text-center py-16">
        <h1 className="text-3xl font-bold text-[#001134] mb-4">Business Not Found</h1>
        <Link to="/directory" className="text-[#6666FF] hover:underline">
          Return to Directory
        </Link>
      </div>
    );
  }

  return (
    <>
      <Link
        to="/directory"
        className="inline-flex items-center gap-2 text-[#6666FF] hover:text-[#5555EE] mb-6 font-medium"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Directory
      </Link>

      <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6 mb-4">
            <div className="flex-1">
              <div className="flex flex-col md:flex-row md:items-center gap-3 mb-3">
                <h1 className="text-4xl md:text-5xl font-bold text-[#001134]">
                  {business.company_name}
                </h1>
                {business.featured && (
                  <span className="bg-gradient-to-r from-[#6666FF] to-[#66FFFF] text-white text-xs font-bold px-3 py-1 rounded-full">
                    FEATURED
                  </span>
                )}
                <button
                  onClick={toggleFavorite}
                  disabled={isFavLoading}
                  className="text-3xl hover:scale-110 transition-transform disabled:opacity-50 md:ml-2"
                  title={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
                  style={{ filter: isFavorited ? 'none' : 'grayscale(100%) opacity(0.4)' }}
                >
                  🏆
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-3 mb-3">
                <span className="bg-blue-50 text-blue-700 border border-blue-200 text-sm font-semibold px-4 py-1.5 rounded-full">
                  {business.industry}
                </span>
              </div>
              {business.tagline && (
                <p className="text-xl text-gray-600 mt-2">{business.tagline}</p>
              )}
            </div>

            <div className="flex flex-wrap gap-3">
              {business.owner_user_id !== user?.id && (
                <>
                  {connectionStatus === 'none' && (
                    <button
                      onClick={handleConnect}
                      disabled={connectionLoading}
                      className="px-6 py-3 bg-gradient-to-r from-[#FF1493] to-[#FF69FF] text-white rounded-lg font-semibold transition-all hover:shadow-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <UserPlus className="w-5 h-5" />
                      {connectionLoading ? 'Connecting...' : 'Connect'}
                    </button>
                  )}

                  {connectionStatus === 'pending_sent' && (
                    <button
                      disabled
                      className="px-6 py-3 bg-gradient-to-r from-[#FF1493] to-[#FF69FF] text-white rounded-lg font-semibold opacity-60 cursor-not-allowed flex items-center gap-2"
                    >
                      <Clock className="w-5 h-5" />
                      Request Pending
                    </button>
                  )}

                  {connectionStatus === 'pending_received' && (
                    <button
                      onClick={handleAcceptConnection}
                      disabled={connectionLoading}
                      className="px-6 py-3 bg-gradient-to-r from-[#FF1493] to-[#FF69FF] text-white rounded-lg font-semibold transition-all hover:shadow-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <UserPlus className="w-5 h-5" />
                      {connectionLoading ? 'Accepting...' : 'Accept Connection'}
                    </button>
                  )}

                  {connectionStatus === 'accepted' && (
                    <>
                      <button
                        disabled
                        className="px-6 py-3 bg-gradient-to-r from-[#FF1493] to-[#FF69FF] text-white rounded-lg font-semibold opacity-60 cursor-not-allowed flex items-center gap-2"
                      >
                        <Check className="w-5 h-5" />
                        Connected
                      </button>
                      <button className="relative px-6 py-3 bg-gradient-to-r from-[#FF1493] to-[#FF69FF] rounded-lg font-semibold transition-all hover:shadow-lg group flex items-center gap-2">
                        <span className="absolute inset-[2px] bg-white rounded-[6px] group-hover:bg-transparent transition-all"></span>
                        <MessageCircle className="w-5 h-5 relative z-10 text-[#FF1493] group-hover:text-white transition-colors" />
                        <span className="relative z-10 bg-gradient-to-r from-[#FF1493] to-[#FF69FF] bg-clip-text text-transparent group-hover:text-white transition-colors">
                          Message Business
                        </span>
                      </button>
                    </>
                  )}
                </>
              )}

              <a
                href={business.website}
                target="_blank"
                rel="noopener noreferrer"
                className="border-2 border-[#6666FF] text-[#6666FF] hover:bg-[#6666FF] hover:text-white px-6 py-3 rounded-lg font-semibold transition-all flex items-center gap-2"
              >
                <Globe className="w-5 h-5" />
                Visit Website
              </a>
              {connectionStatus === 'accepted' && business.calendar_link && (
                <a
                  href={business.calendar_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="relative px-6 py-3 bg-gradient-to-r from-[#6666FF] to-[#66FFFF] rounded-lg font-semibold transition-all hover:shadow-lg flex items-center gap-2 text-white"
                >
                  <Calendar className="w-5 h-5" />
                  <span>Book a call</span>
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {business.video_url && (
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                  <h2 className="text-2xl font-bold text-[#001134]">Business Introduction Video</h2>
                </div>
                <div className="aspect-video">
                  <iframe
                    src={getEmbedUrl(business.video_url)}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    title="Business intro video"
                  ></iframe>
                </div>
              </div>
            )}

            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
              <h2 className="text-2xl font-bold text-[#001134] mb-4">About This Business</h2>
              <div className="space-y-4 text-gray-700 leading-relaxed">
                <p>{business.description}</p>

                {business.problem_solved && (
                  <div>
                    <h3 className="font-bold text-[#001134] mb-2">Problem We Solve:</h3>
                    <p>{business.problem_solved}</p>
                  </div>
                )}

                {business.target_audience && (
                  <div>
                    <h3 className="font-bold text-[#001134] mb-2">Who We Serve:</h3>
                    <p>{business.target_audience}</p>
                  </div>
                )}

                {business.main_offer_type && (
                  <div>
                    <h3 className="font-bold text-[#001134] mb-2">Main Offer Type:</h3>
                    <p>{business.main_offer_type}</p>
                  </div>
                )}

                {business.unique_value && (
                  <div>
                    <h3 className="font-bold text-[#001134] mb-2">What Makes Us Unique:</h3>
                    <p>{business.unique_value}</p>
                  </div>
                )}
              </div>
            </div>

            {business.founder_name && (
              <div className="bg-gradient-to-br from-[#F8F9FF] to-white rounded-2xl shadow-lg border border-gray-100 p-6">
                <h2 className="text-2xl font-bold text-[#001134] mb-6">Meet the Founder</h2>
                <div className="flex flex-col md:flex-row gap-6">
                  <div className="flex-shrink-0">
                    {business.founder_headshot_url ? (
                      <img
                        src={business.founder_headshot_url}
                        alt={business.founder_name}
                        className="w-40 h-40 rounded-2xl object-cover shadow-md"
                      />
                    ) : (
                      <div className="w-40 h-40 rounded-2xl bg-gradient-to-br from-[#6666FF]/10 to-[#66FFFF]/10 border-2 border-dashed border-gray-300 flex items-center justify-center">
                        <div className="text-center">
                          <Users className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                          <p className="text-xs text-gray-500">Headshot</p>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 space-y-4">
                    <h3 className="text-xl font-bold text-[#001134]">{business.founder_name}</h3>

                    {business.founder_bio && (
                      <p className="text-gray-700 leading-relaxed">{business.founder_bio}</p>
                    )}

                    {business.founder_background && (
                      <div>
                        <h4 className="font-bold text-[#001134] mb-2">Background & Expertise:</h4>
                        <p className="text-gray-700 leading-relaxed">
                          {business.founder_background}
                        </p>
                      </div>
                    )}

                    {business.founder_why_started && (
                      <div>
                        <h4 className="font-bold text-[#001134] mb-2">
                          Why I Started This Business:
                        </h4>
                        <p className="text-gray-700 leading-relaxed">
                          {business.founder_why_started}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {business.partnership_opportunities && (
                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                  <h2 className="text-2xl font-bold text-[#001134] mb-4">Looking For</h2>
                  <p className="text-gray-600 whitespace-pre-wrap">
                    {business.partnership_opportunities}
                  </p>
                </div>
              )}

            {offers && offers.length > 0 && (
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                <h2 className="text-2xl font-bold text-[#001134] mb-6">Offers</h2>
                <div className="space-y-3">
                  {offers.map((offer, index) => (
                    <div
                      key={offer.id}
                      className="border border-gray-200 rounded-xl overflow-hidden hover:border-[#6666FF] transition-colors"
                    >
                      <button
                        onClick={() =>
                          setExpandedOffer(expandedOffer === index ? null : index)
                        }
                        className="w-full text-left p-5 flex items-center justify-between hover:bg-gray-50 transition-colors"
                      >
                        <h3 className="text-xl font-bold text-[#001134]">{offer.offer_name}</h3>
                        <span className="text-[#6666FF] font-bold text-2xl">
                          {expandedOffer === index ? '−' : '+'}
                        </span>
                      </button>
                      {expandedOffer === index && (
                        <div className="px-5 pb-5 pt-2 border-t border-gray-100">
                          <p className="text-gray-600 mb-4">{offer.description}</p>
                          <div className="grid grid-cols-2 gap-3 mb-4">
                            {offer.price_point && (
                              <div>
                                <span className="text-sm font-semibold text-gray-600">
                                  Price:
                                </span>
                                <p className="text-[#001134] font-bold text-lg">{displayPrice(offer.price_point)}</p>
                              </div>
                            )}
                            <div>
                              <span className="text-sm font-semibold text-gray-600">
                                Offer Type:
                              </span>
                              <p className="text-[#001134] font-bold">{offer.offer_type}</p>
                            </div>
                            <div>
                              <span className="text-sm font-semibold text-gray-600">
                                Commission:
                              </span>
                              <p className="text-[#001134] font-bold">
                                {offer.commission_percent}% commission
                              </p>
                            </div>
                            {offer.commission_type && (
                              <div>
                                <span className="text-sm font-semibold text-gray-600">
                                  Commission Type:
                                </span>
                                <p className="text-[#001134] font-bold capitalize">
                                  {offer.commission_type}
                                </p>
                              </div>
                            )}
                            {offer.commission_duration && (
                              <div>
                                <span className="text-sm font-semibold text-gray-600">
                                  Duration:
                                </span>
                                <p className="text-[#001134] font-bold capitalize">
                                  {offer.commission_duration}
                                </p>
                              </div>
                            )}
                            {business?.target_audience && (
                              <div className="col-span-2">
                                <span className="text-sm font-semibold text-gray-600">
                                  Target Audience:
                                </span>
                                <p className="text-[#001134] font-bold">
                                  {business.target_audience}
                                </p>
                              </div>
                            )}
                            {offer.offer_notes && (
                              <div className="col-span-2">
                                <span className="text-sm font-semibold text-gray-600">
                                  Notes:
                                </span>
                                <p className="text-[#001134]">
                                  {offer.offer_notes}
                                </p>
                              </div>
                            )}
                          </div>
                          <div className="mt-4 pt-4 border-t border-gray-100">
                            <button
                              onClick={() => handleAddToVault(offer, index)}
                              disabled={!user || addingToVault === index}
                              className="w-full px-4 py-2 bg-gradient-to-r from-[#6666FF] to-[#66FFFF] text-white rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                              <Bookmark className="w-4 h-4" />
                              {addingToVault === index ? 'Adding...' : 'Add to Offer Vault'}
                            </button>
                            {vaultMessage && (
                              <p className={`mt-2 text-sm text-center ${
                                vaultMessage.type === 'success' ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {vaultMessage.text}
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="relative p-[3px] rounded-2xl bg-gradient-to-br from-[#6666FF] to-[#66FFFF] shadow-lg">
              <div className="bg-white rounded-[14px] p-6">
                <h2 className="text-xl font-bold text-[#001134] mb-4">Overview</h2>

                <div className="flex flex-col items-center mb-6">
                  <div className="w-24 h-24 bg-gradient-to-br from-[#6666FF]/10 to-[#66FFFF]/10 rounded-2xl flex items-center justify-center border border-gray-200 mb-3">
                    <Megaphone className="w-12 h-12 text-[#6666FF]" />
                  </div>
                  <h3 className="text-lg font-bold text-[#001134] text-center">
                    {business.company_name}
                  </h3>
                  {business.tagline && (
                    <p className="text-sm text-gray-600 text-center mt-1">
                      {business.tagline}
                    </p>
                  )}
                </div>

                {business.commission_rate && (
                  <div className="bg-gradient-to-r from-[#6666FF]/10 to-[#66FFFF]/10 rounded-xl p-4 mb-4">
                    <div className="flex items-center gap-2 mb-1">
                      <TrendingUp className="w-5 h-5 text-[#6666FF]" />
                      <span className="text-sm font-semibold text-gray-600">
                        Commission Range
                      </span>
                    </div>
                    <p className="text-lg font-bold text-[#001134]">
                      {business.commission_rate}
                    </p>
                  </div>
                )}

                {business.looking_for && business.looking_for.length > 0 && (
                  <div className="mb-4">
                    <p className="text-sm font-semibold text-gray-600 mb-2">Partnership Opportunities:</p>
                    <div className="flex flex-wrap gap-2">
                      {business.looking_for.map((item, index) => (
                        <span
                          key={index}
                          className="bg-blue-50 text-blue-700 border border-blue-200 text-xs font-semibold px-3 py-1 rounded-full"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {business.interested_offer_types && business.interested_offer_types.length > 0 && (
                  <div className="mb-4">
                    <p className="text-sm font-semibold text-gray-600 mb-2">Interested In Promoting:</p>
                    <div className="flex flex-wrap gap-2">
                      {business.interested_offer_types.map((item, index) => (
                        <span
                          key={index}
                          className="bg-green-50 text-green-700 border border-green-200 text-xs font-semibold px-3 py-1 rounded-full"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {business.monetization_type && (
                  <div className="pt-4 border-t border-gray-100">
                    <p className="text-sm font-semibold text-gray-600 mb-1">Monetization:</p>
                    <p className="text-[#001134] font-bold">
                      {business.monetization_type}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
              <h2 className="text-xl font-bold text-[#001134] mb-4">Metrics</h2>
              <div className="grid grid-cols-1 gap-3">
                {business.cross_promotion_preference && (
                  <div className="bg-gray-50 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Megaphone className="w-5 h-5 text-[#6666FF]" />
                      <span className="text-sm font-semibold text-gray-600">
                        Cross-Promo
                      </span>
                    </div>
                    <p className="text-[#001134] font-bold">
                      {business.cross_promotion_preference}
                    </p>
                  </div>
                )}

                {business.social_audience_size && (
                  <div className="bg-gray-50 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="w-5 h-5 text-[#66FFFF]" />
                      <span className="text-sm font-semibold text-gray-600">
                        Social Audience
                      </span>
                    </div>
                    <p className="text-[#001134] font-bold">
                      {business.social_audience_size}
                    </p>
                  </div>
                )}

                {business.email_list_size && (
                  <div className="bg-gray-50 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Mail className="w-5 h-5 text-[#6666FF]" />
                      <span className="text-sm font-semibold text-gray-600">
                        Email List
                      </span>
                    </div>
                    <p className="text-[#001134] font-bold">
                      {business.email_list_size}
                    </p>
                  </div>
                )}

                {business.email_open_rate && (
                  <div className="bg-gray-50 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <BarChart3 className="w-5 h-5 text-[#66FFFF]" />
                      <span className="text-sm font-semibold text-gray-600">
                        Open Rate
                      </span>
                    </div>
                    <p className="text-[#001134] font-bold">
                      {business.email_open_rate}
                    </p>
                  </div>
                )}

                {business.number_of_offers && (
                  <div className="bg-gray-50 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Package className="w-5 h-5 text-[#6666FF]" />
                      <span className="text-sm font-semibold text-gray-600">
                        Offers
                      </span>
                    </div>
                    <p className="text-[#001134] font-bold">
                      {business.number_of_offers}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {connectionStatus === 'accepted' && business.owner_user_id !== user?.id && (
              <button className="relative w-full px-6 py-4 bg-gradient-to-r from-[#FF1493] to-[#FF69FF] rounded-xl font-bold transition-all hover:shadow-xl group flex items-center justify-center gap-2">
                <span className="absolute inset-[2px] bg-white rounded-[10px] group-hover:bg-transparent transition-all"></span>
                <MessageCircle className="w-5 h-5 relative z-10 text-[#FF1493] group-hover:text-white transition-colors" />
                <span className="relative z-10 bg-gradient-to-r from-[#FF1493] to-[#FF69FF] bg-clip-text text-transparent group-hover:text-white transition-colors">
                  Message Business
                </span>
              </button>
            )}
          </div>
        </div>
    </>
  );
}
