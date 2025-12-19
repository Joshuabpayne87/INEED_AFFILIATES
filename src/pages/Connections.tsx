import { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { MessagingModal } from '../components/MessagingModal';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { CheckCircle, XCircle, Clock, User, Calendar, MessageCircle, Trophy } from 'lucide-react';

interface Connection {
  id: string;
  requester_user_id: string;
  recipient_user_id: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
  accepted_at: string | null;
  requester?: {
    first_name: string;
    last_name: string;
    email: string;
    headshot_url: string | null;
  };
  recipient?: {
    first_name: string;
    last_name: string;
    email: string;
    headshot_url: string | null;
  };
  business?: {
    business_name: string;
    company_name: string | null;
    industry: string;
    website_url: string | null;
    offer_summary: string | null;
  };
  otherUserProfile?: {
    headshot_url: string | null;
  };
}

type TabType = 'incoming' | 'outgoing' | 'accepted' | 'winners';

interface Favorite {
  id: string;
  partnership_id: string;
  created_at: string;
  business?: {
    id: string;
    business_name: string;
    company_name: string | null;
    industry: string;
    website_url: string | null;
    offer_summary: string | null;
    owner_user_id: string;
  };
  owner?: {
    first_name: string;
    last_name: string;
    email: string;
    headshot_url: string | null;
  };
}

export function Connections() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('incoming');
  const [connections, setConnections] = useState<Connection[]>([]);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [messagingConnection, setMessagingConnection] = useState<{
    id: string;
    recipientId: string;
    recipientName: string;
  } | null>(null);

  useEffect(() => {
    if (user) {
      if (activeTab === 'winners') {
        loadFavorites();
      } else {
        loadConnections();
      }
    }
  }, [user, activeTab]);

  async function loadFavorites() {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('favorites')
        .select(`
          id,
          partnership_id,
          created_at,
          business:businesses!partnership_id(
            id,
            business_name,
            company_name,
            industry,
            website_url,
            offer_summary,
            owner_user_id,
            owner:users!owner_user_id(
              first_name,
              last_name,
              email,
              headshot_url
            )
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedFavorites = (data || []).map((fav) => ({
        ...fav,
        owner: fav.business?.owner || null,
      }));

      setFavorites(formattedFavorites);
    } catch (error) {
      console.error('Error loading favorites:', error);
    } finally {
      setLoading(false);
    }
  }

  async function removeFavorite(favoriteId: string) {
    try {
      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('id', favoriteId);

      if (error) throw error;
      loadFavorites();
    } catch (error) {
      console.error('Error removing favorite:', error);
    }
  }

  async function loadConnections() {
    if (!user) return;

    setLoading(true);
    try {
      let query = supabase
        .from('connections')
        .select(`
          *,
          requester:users!requester_user_id(first_name, last_name, email, headshot_url),
          recipient:users!recipient_user_id(first_name, last_name, email, headshot_url)
        `);

      if (activeTab === 'incoming') {
        query = query.eq('recipient_user_id', user.id).eq('status', 'pending');
      } else if (activeTab === 'outgoing') {
        query = query.eq('requester_user_id', user.id).eq('status', 'pending');
      } else if (activeTab === 'accepted') {
        query = query
          .or(`requester_user_id.eq.${user.id},recipient_user_id.eq.${user.id}`)
          .eq('status', 'accepted');
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading connections:', error);
        throw error;
      }

      const connectionsWithBusinesses = await Promise.all(
        (data || []).map(async (conn) => {
          const otherUserId = conn.requester_user_id === user.id
            ? conn.recipient_user_id
            : conn.requester_user_id;

          const { data: businessData } = await supabase
            .from('businesses')
            .select('business_name, company_name, industry, website_url, offer_summary')
            .eq('owner_user_id', otherUserId)
            .maybeSingle();

          return {
            ...conn,
            business: businessData,
          };
        })
      );

      setConnections(connectionsWithBusinesses);
    } catch (error) {
      console.error('Error loading connections:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove(connectionId: string, businessId: string) {
    if (!user) return;

    setProcessingId(connectionId);
    try {
      const { error: updateError } = await supabase
        .from('connections')
        .update({
          status: 'accepted',
          accepted_at: new Date().toISOString()
        })
        .eq('id', connectionId);

      if (updateError) throw updateError;

      await supabase
        .from('offer_vault')
        .update({ status: 'approved' })
        .eq('user_id', businessId)
        .eq('business_id', user.id);

      const { data: connection } = await supabase
        .from('connections')
        .select('requester_user_id')
        .eq('id', connectionId)
        .single();

      if (connection) {
        await supabase
          .from('notifications')
          .insert({
            user_id: connection.requester_user_id,
            type: 'connection_accepted',
            title: 'Connection Accepted!',
            message: 'Your connection request has been accepted.',
            link: '/connections',
          });
      }

      loadConnections();
    } catch (error) {
      console.error('Error approving connection:', error);
      alert('Failed to approve connection. Please try again.');
    } finally {
      setProcessingId(null);
    }
  }

  async function handleDecline(connectionId: string) {
    setProcessingId(connectionId);
    try {
      const { error } = await supabase
        .from('connections')
        .update({ status: 'declined' })
        .eq('id', connectionId);

      if (error) throw error;

      loadConnections();
    } catch (error) {
      console.error('Error declining connection:', error);
      alert('Failed to decline connection. Please try again.');
    } finally {
      setProcessingId(null);
    }
  }

  function getOtherUser(connection: Connection) {
    if (!user) return null;
    return connection.requester_user_id === user.id
      ? connection.recipient
      : connection.requester;
  }

  function getOtherUserId(connection: Connection) {
    if (!user) return null;
    return connection.requester_user_id === user.id
      ? connection.recipient_user_id
      : connection.requester_user_id;
  }

  function convertGoogleDriveUrl(url: string | null): string | null {
    if (!url) return null;
    // Convert Google Drive share link to direct image URL
    const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (match) {
      return `https://drive.google.com/uc?export=view&id=${match[1]}`;
    }
    return url;
  }

  const tabs = [
    { id: 'incoming' as TabType, label: 'Incoming Requests', icon: null },
    { id: 'outgoing' as TabType, label: 'Sent Requests', icon: null },
    { id: 'accepted' as TabType, label: 'Connected', icon: null },
    { id: 'winners' as TabType, label: 'Winners', icon: Trophy },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Connections
        </h1>
        <p className="text-gray-600">Manage your partnership connections</p>
      </div>

      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                py-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-1.5
                ${activeTab === tab.id
                  ? tab.id === 'winners' ? 'border-amber-500 text-amber-600' : 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              {tab.icon && <tab.icon className="w-4 h-4" />}
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-500">Loading {activeTab === 'winners' ? 'winners' : 'connections'}...</p>
        </div>
      ) : activeTab === 'winners' ? (
        favorites.length === 0 ? (
          <Card className="text-center py-12">
            <Trophy className="w-12 h-12 text-amber-400 mx-auto mb-3" />
            <p className="text-gray-500">No winners yet</p>
            <p className="text-sm text-gray-400 mt-1">Mark businesses as favorites to see them here</p>
          </Card>
        ) : (
          <div className="grid gap-4">
            {favorites.map((favorite) => (
              <Card key={favorite.id} className="p-6 border-amber-200 bg-amber-50/30">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#FF1493] to-[#FF69FF] flex items-center justify-center flex-shrink-0">
                      {convertGoogleDriveUrl(favorite.owner?.headshot_url) ? (
                        <img
                          src={convertGoogleDriveUrl(favorite.owner.headshot_url)!}
                          alt={`${favorite.owner?.first_name} ${favorite.owner?.last_name}`}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        <User className="w-6 h-6 text-white" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {(favorite.business?.company_name?.trim() || favorite.business?.business_name?.trim()) ||
                           `${favorite.owner?.first_name || ''} ${favorite.owner?.last_name || ''}`.trim() || 'Unknown'}
                        </h3>
                        <Trophy className="w-4 h-4 text-amber-500 flex-shrink-0" />
                      </div>
                      <p className="text-sm text-gray-600">
                        {favorite.owner?.first_name || favorite.owner?.last_name
                          ? `${favorite.owner.first_name || ''} ${favorite.owner.last_name || ''}`.trim()
                          : 'Owner name not available'}
                      </p>
                      {favorite.business?.industry && (
                        <p className="text-sm text-gray-600 mt-1">
                          {favorite.business.industry}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 ml-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="w-4 h-4" />
                      <span>Added {new Date(favorite.created_at).toLocaleDateString()}</span>
                    </div>
                    <Button
                      onClick={() => removeFavorite(favorite.id)}
                      variant="secondary"
                      size="sm"
                    >
                      <XCircle className="w-4 h-4 mr-1" />
                      Remove
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )
      ) : connections.length === 0 ? (
        <Card className="text-center py-12">
          <Clock className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500">
            {activeTab === 'incoming' && 'No incoming connection requests'}
            {activeTab === 'outgoing' && 'No pending outgoing requests'}
            {activeTab === 'accepted' && 'No accepted connections yet'}
          </p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {connections.map((connection) => {
            const otherUser = getOtherUser(connection);
            const otherUserId = getOtherUserId(connection);
            const business = connection.business;

            return (
              <Card key={connection.id} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#FF1493] to-[#FF69FF] flex items-center justify-center flex-shrink-0">
                        {convertGoogleDriveUrl(otherUser?.headshot_url) ? (
                          <img
                            src={convertGoogleDriveUrl(otherUser.headshot_url)!}
                            alt={`${otherUser?.first_name} ${otherUser?.last_name}`}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          <User className="w-6 h-6 text-white" />
                        )}
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {(business?.company_name?.trim() || business?.business_name?.trim()) ||
                           `${otherUser?.first_name || ''} ${otherUser?.last_name || ''}`.trim() || 'Unknown Partner'}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {otherUser?.first_name || otherUser?.last_name
                            ? `${otherUser.first_name || ''} ${otherUser.last_name || ''}`.trim()
                            : 'Owner name not available'}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                      {business?.industry && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Badge variant="secondary">{business.industry}</Badge>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="w-4 h-4" />
                        <span>Requested {new Date(connection.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>

                    {business?.offer_summary && (
                      <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                        {business.offer_summary}
                      </p>
                    )}
                  </div>

                  {activeTab === 'incoming' && (
                    <div className="flex gap-2 ml-4">
                      <Button
                        onClick={() => handleApprove(connection.id, otherUserId!)}
                        disabled={processingId === connection.id}
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Accept
                      </Button>
                      <Button
                        onClick={() => handleDecline(connection.id)}
                        disabled={processingId === connection.id}
                        variant="secondary"
                        size="sm"
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        Decline
                      </Button>
                    </div>
                  )}

                  {activeTab === 'outgoing' && (
                    <Badge variant="secondary">
                      <Clock className="w-3 h-3 mr-1" />
                      Pending
                    </Badge>
                  )}

                  {activeTab === 'accepted' && connection.accepted_at && (
                    <div className="flex flex-col gap-2">
                      <Badge variant="success">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Connected {new Date(connection.accepted_at).toLocaleDateString()}
                      </Badge>
                      <Button
                        size="sm"
                        onClick={() => setMessagingConnection({
                          id: connection.id,
                          recipientId: otherUserId!,
                          recipientName: `${otherUser?.first_name} ${otherUser?.last_name}`,
                        })}
                      >
                        <MessageCircle className="w-4 h-4 mr-1" />
                        Message
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {messagingConnection && (
        <MessagingModal
          isOpen={!!messagingConnection}
          onClose={() => setMessagingConnection(null)}
          recipientId={messagingConnection.recipientId}
          recipientName={messagingConnection.recipientName}
          connectionId={messagingConnection.id}
        />
      )}
    </div>
  );
}
