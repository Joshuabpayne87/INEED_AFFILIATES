import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Card } from '../components/ui/Card';
import { Users, Package, Briefcase, ListTodo, ArrowRight, Calendar, AlertCircle } from 'lucide-react';
import { ProfileCheckModal } from '../components/ProfileCheckModal';
import { OnboardingWizard } from '../components/OnboardingWizard';
import { CreateOfferPrompt } from '../components/CreateOfferPrompt';
import { BookingModal } from '../components/BookingModal';
import { BusinessProfile, isProfileComplete } from '../types/business';

interface Stats {
  connections: number;
  offersInMarketplace: number;
  offersInVault: number;
  openTasks: number;
}

interface UpcomingTask {
  id: string;
  title: string;
  due_at: string;
  connection: {
    business_name: string;
  };
}

export function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats>({
    connections: 0,
    offersInMarketplace: 0,
    offersInVault: 0,
    openTasks: 0,
  });
  const [upcomingTasks, setUpcomingTasks] = useState<UpcomingTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [showProfileCheck, setShowProfileCheck] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [userProfile, setUserProfile] = useState<BusinessProfile | null>(null);
  const [profileIncomplete, setProfileIncomplete] = useState(false);
  const [showCreateOfferPrompt, setShowCreateOfferPrompt] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [userBusinessId, setUserBusinessId] = useState<string | null>(null);
  const [firstName, setFirstName] = useState<string>('');

  useEffect(() => {
    loadDashboardData();
    checkProfileStatus();
    loadUserName();
    checkIfShouldShowBookingModal();
  }, [user]);

  const checkIfShouldShowBookingModal = async () => {
    if (!user) return;
    
    // Check if they've already booked the call
    const hasBooked = localStorage.getItem('onboarding_call_booked');
    if (hasBooked === 'true') return;

    // Check if they've completed onboarding
    try {
      const { data: business } = await supabase
        .from('businesses')
        .select('company_name, website, industry, niche')
        .eq('owner_user_id', user.id)
        .maybeSingle();

      const onboardingComplete = !!(
        business?.company_name &&
        business?.website &&
        business?.industry &&
        business?.niche
      );

      // Show booking modal if onboarding is complete but call not booked
      // Add a small delay to ensure dashboard is fully loaded and visible
      if (onboardingComplete) {
        // Wait 500ms so user can see the dashboard behind the modal
        setTimeout(() => {
          setShowBookingModal(true);
        }, 500);
      }
    } catch (error) {
      console.error('Error checking booking status:', error);
    }
  };

  const loadUserName = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('users')
      .select('first_name')
      .eq('id', user.id)
      .maybeSingle();
    if (data?.first_name) {
      setFirstName(data.first_name);
    }
  };

  useEffect(() => {
    if (userProfile && userBusinessId && !loading) {
      checkIfShouldShowOfferPrompt();
    }
  }, [userProfile, userBusinessId, loading]);

  const checkProfileStatus = async () => {
    if (!user) return;

    try {
      const { data: profile } = await supabase
        .from('businesses')
        .select('*')
        .eq('owner_user_id', user.id)
        .maybeSingle();

      setUserProfile(profile);
      if (profile) {
        setUserBusinessId(profile.id);
      }

      if (profile) {
        const incomplete = !isProfileComplete(profile) || profile.profile_state !== 'live';
        setProfileIncomplete(incomplete);

        if (incomplete && !localStorage.getItem('profile_check_dismissed')) {
          setShowProfileCheck(true);
        }
      }
    } catch (error) {
      console.error('Error checking profile status:', error);
    }
  };

  const checkIfShouldShowOfferPrompt = async () => {
    if (!userBusinessId || !userProfile) return;

    if (userProfile.profile_state !== 'live') return;

    try {
      const { count } = await supabase
        .from('offers')
        .select('id', { count: 'exact', head: true })
        .eq('business_id', userBusinessId);

      if (count === 0) {
        setShowCreateOfferPrompt(true);
      }
    } catch (error) {
      console.error('Error checking offers:', error);
    }
  };

  const handleDismissOfferPrompt = () => {
    setShowCreateOfferPrompt(false);
  };

  const loadDashboardData = async () => {
    if (!user) return;

    try {
      const [connectionsResult, offersResult, vaultResult, tasksResult, upcomingTasksResult] = await Promise.all([
        supabase
          .from('connections')
          .select('id', { count: 'exact', head: true })
          .or(`requester_user_id.eq.${user.id},recipient_user_id.eq.${user.id}`)
          .eq('status', 'accepted'),

        supabase
          .from('offers')
          .select('id', { count: 'exact', head: true })
          .eq('is_active', true),

        supabase
          .from('user_offers')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id),

        supabase
          .from('partner_tasks')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('status', 'open'),

        supabase
          .from('partner_tasks')
          .select(`
            id,
            title,
            due_at,
            connection_id
          `)
          .eq('user_id', user.id)
          .eq('status', 'open')
          .order('due_at', { ascending: true })
          .limit(3),
      ]);

      setStats({
        connections: connectionsResult.count || 0,
        offersInMarketplace: offersResult.count || 0,
        offersInVault: vaultResult.count || 0,
        openTasks: tasksResult.count || 0,
      });

      if (upcomingTasksResult.data) {
        const tasksWithConnections = await Promise.all(
          upcomingTasksResult.data.map(async (task) => {
            const { data: connection } = await supabase
              .from('connections')
              .select('requester_user_id, recipient_user_id')
              .eq('id', task.connection_id)
              .single();

            const partnerId = connection?.requester_user_id === user.id
              ? connection?.recipient_user_id
              : connection?.requester_user_id;

            const { data: business } = await supabase
              .from('businesses')
              .select('business_name')
              .eq('owner_user_id', partnerId)
              .single();

            return {
              ...task,
              connection: {
                business_name: business?.business_name || 'Unknown',
              },
            };
          })
        );

        setUpcomingTasks(tasksWithConnections);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="h-32 animate-pulse bg-gray-100" />
          ))}
        </div>
      </div>
    );
  }

  const handleCallBooked = () => {
    // User has booked the call, grant them full access
    localStorage.setItem('onboarding_call_booked', 'true');
    setShowBookingModal(false);
  };

  return (
    <div className="space-y-8">
      {showBookingModal && (
        <BookingModal
          isOpen={showBookingModal}
          onClose={() => setShowBookingModal(false)}
          onBooked={handleCallBooked}
        />
      )}

      {showProfileCheck && (
        <ProfileCheckModal
          onComplete={async () => {
            setShowProfileCheck(false);
            await checkProfileStatus();
            setShowOnboarding(true);
          }}
          onSkip={() => {
            setShowProfileCheck(false);
            localStorage.setItem('profile_check_dismissed', 'true');
          }}
        />
      )}

      {showOnboarding && (
        <OnboardingWizard
          onClose={() => setShowOnboarding(false)}
          onComplete={() => {
            setShowOnboarding(false);
            checkProfileStatus();
          }}
          initialData={userProfile || undefined}
        />
      )}

      {showCreateOfferPrompt && (
        <CreateOfferPrompt onDismiss={handleDismissOfferPrompt} />
      )}

      {profileIncomplete && !showProfileCheck && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="font-semibold text-yellow-800 mb-1">
              Your profile is currently hidden
            </h3>
            <p className="text-yellow-700 text-sm mb-3">
              Complete your profile to start appearing in the marketplace.
            </p>
            <button
              onClick={async () => {
                await checkProfileStatus();
                setShowOnboarding(true);
              }}
              className="text-sm font-semibold text-yellow-800 hover:text-yellow-900 underline"
            >
              Complete my profile
            </button>
          </div>
        </div>
      )}

      <div>
        <h1 className="text-3xl font-heading font-bold text-gray-900 mb-2">
          Welcome Back{firstName ? ` ${firstName}` : ''}!
        </h1>
        <p className="text-gray-600">Here's what's happening with your partnerships</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card hover className="gradient-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Connections</p>
              <p className="text-3xl font-heading font-bold text-gray-900">{stats.connections}</p>
            </div>
            <div className="w-12 h-12 rounded-lg gradient-bg-primary flex items-center justify-center">
              <Users className="w-6 h-6 text-white" />
            </div>
          </div>
        </Card>

        <Card hover className="gradient-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Marketplace Offers</p>
              <p className="text-3xl font-heading font-bold text-gray-900">{stats.offersInMarketplace}</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-cyan flex items-center justify-center">
              <Package className="w-6 h-6 text-white" />
            </div>
          </div>
        </Card>

        <Card hover className="gradient-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">My Offer Vault</p>
              <p className="text-3xl font-heading font-bold text-gray-900">{stats.offersInVault}</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-navy flex items-center justify-center">
              <Briefcase className="w-6 h-6 text-white" />
            </div>
          </div>
        </Card>

        <Card hover className="gradient-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Open Follow-Ups</p>
              <p className="text-3xl font-heading font-bold text-gray-900">{stats.openTasks}</p>
            </div>
            <div className="w-12 h-12 rounded-lg gradient-bg-pink flex items-center justify-center">
              <ListTodo className="w-6 h-6 text-white" />
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-heading font-bold text-gray-900">
              Next Follow-Ups
            </h2>
            <Link
              to="/follow-up"
              className="text-primary hover:text-primary-600 text-sm font-medium flex items-center gap-1"
            >
              View All
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {upcomingTasks.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No upcoming follow-ups</p>
              <Link to="/follow-up" className="text-primary hover:text-primary-600 text-sm font-medium mt-2 inline-block">
                Create your first follow-up
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingTasks.map(task => (
                <div
                  key={task.id}
                  className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors duration-200"
                >
                  <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{task.title}</p>
                    <p className="text-sm text-gray-600 mt-0.5">
                      {task.connection.business_name}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Due: {new Date(task.due_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-heading font-bold text-gray-900">
              Quick Actions
            </h2>
          </div>

          <div className="space-y-3">
            <Link
              to="/directory"
              className="flex items-center justify-between p-4 rounded-lg border-2 border-gray-200 hover:border-primary hover:bg-primary-50 transition-all duration-200"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <span className="font-medium text-gray-900">Find Partners</span>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-400" />
            </Link>

            <Link
              to="/marketplace"
              className="flex items-center justify-between p-4 rounded-lg border-2 border-gray-200 hover:border-primary hover:bg-primary-50 transition-all duration-200"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-cyan-100 flex items-center justify-center">
                  <Package className="w-5 h-5 text-cyan-700" />
                </div>
                <span className="font-medium text-gray-900">Browse Offers</span>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-400" />
            </Link>

            <Link
              to="/crm"
              className="flex items-center justify-between p-4 rounded-lg border-2 border-gray-200 hover:border-primary hover:bg-primary-50 transition-all duration-200"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-navy-100 flex items-center justify-center">
                  <Briefcase className="w-5 h-5 text-navy" />
                </div>
                <span className="font-medium text-gray-900">Manage Partners</span>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-400" />
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
