import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { AuthProvider } from './contexts/AuthContext';
import { useAuth } from './contexts/AuthContext';
import { supabase } from './lib/supabase';
import { MouseTrail } from './components/MouseTrail';
import { AppLayout } from './components/layout/AppLayout';
import { Landing } from './pages/Landing';
import { SignUp } from './pages/auth/SignUp';
import { SignIn } from './pages/auth/SignIn';
import { VerifyEmailPending } from './pages/auth/VerifyEmailPending';
import { VerifyEmail } from './pages/auth/VerifyEmail';
import { ForgotPassword } from './pages/auth/ForgotPassword';
import { ResetPassword } from './pages/auth/ResetPassword';
import { Onboarding } from './pages/Onboarding';
import { Pricing } from './pages/Pricing';
import { Dashboard } from './pages/Dashboard';
import { PartnershipDirectory } from './pages/PartnershipDirectory';
import BusinessProfile from './pages/BusinessProfile';
import { OfferMarketplace } from './pages/OfferMarketplace';
import { OfferVault } from './pages/OfferVault';
import { OfferVaultPage } from './pages/OfferVaultPage';
import { PartnerCRM } from './pages/PartnerCRM';
import { Success } from './pages/Success';
import { FollowUpList } from './pages/FollowUpList';
import { Connections } from './pages/Connections';
import { Settings } from './pages/Settings';
import { TermsOfService } from './pages/TermsOfService';
import { PrivacyPolicy } from './pages/PrivacyPolicy';
import { MyLeads } from './pages/MyLeads';
import { Messages } from './pages/Messages';

function ProtectedRoute({ children, requireOnboarding = false, requireSubscription = false }: {
  children: React.ReactNode;
  requireOnboarding?: boolean;
  requireSubscription?: boolean;
}) {
  const { user, loading } = useAuth();
  const [checking, setChecking] = useState(true);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);

  // BYPASS: Skip subscription checks for development
  const BYPASS_SUBSCRIPTION = true;

  useEffect(() => {
    async function checkUserStatus() {
      if (!user) {
        setChecking(false);
        return;
      }

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
        setHasCompletedOnboarding(onboardingComplete);
      } catch (error) {
        console.error('Error checking user status:', error);
      } finally {
        setChecking(false);
      }
    }

    if (!loading) {
      checkUserStatus();
    }
  }, [user, loading]);

  if (loading || checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // BYPASS: Skip subscription requirement for development
  if (requireSubscription && !BYPASS_SUBSCRIPTION) {
    // Subscription check disabled
    return <Navigate to="/pricing" replace />;
  }

  if (requireOnboarding && !hasCompletedOnboarding) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const [checking, setChecking] = useState(true);
  const [redirectTo, setRedirectTo] = useState<string | null>(null);

  // BYPASS: Skip subscription checks for development
  const BYPASS_SUBSCRIPTION = true;

  useEffect(() => {
    async function checkUserStatus() {
      if (!user) {
        setChecking(false);
        return;
      }

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

        if (!onboardingComplete) {
          setRedirectTo('/onboarding');
        } else if (BYPASS_SUBSCRIPTION) {
          // BYPASS: Go straight to dashboard
          setRedirectTo('/dashboard');
        } else {
          const { data: stripeCustomer } = await supabase
            .from('stripe_customers')
            .select('customer_id')
            .eq('user_id', user.id)
            .is('deleted_at', null)
            .maybeSingle();

          let hasActiveSubscription = false;
          if (stripeCustomer?.customer_id) {
            const { data: subscription } = await supabase
              .from('stripe_subscriptions')
              .select('status')
              .eq('customer_id', stripeCustomer.customer_id)
              .eq('status', 'active')
              .maybeSingle();

            hasActiveSubscription = !!subscription;
          }

          if (hasActiveSubscription) {
            setRedirectTo('/dashboard');
          } else {
            setRedirectTo('/pricing');
          }
        }
      } catch (error) {
        console.error('Error checking user status:', error);
        setRedirectTo('/onboarding');
      } finally {
        setChecking(false);
      }
    }

    if (!loading) {
      checkUserStatus();
    }
  }, [user, loading]);

  if (loading || (user && checking)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full"></div>
      </div>
    );
  }

  if (user && redirectTo) {
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <MouseTrail />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={
            <PublicRoute>
              <SignIn />
            </PublicRoute>
          } />
          <Route path="/signup" element={
            <PublicRoute>
              <SignUp />
            </PublicRoute>
          } />
          <Route path="/verify-email/pending" element={<VerifyEmailPending />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/onboarding" element={
            <ProtectedRoute>
              <Onboarding />
            </ProtectedRoute>
          } />
          <Route path="/pricing" element={
            <ProtectedRoute>
              <Pricing />
            </ProtectedRoute>
          } />
          <Route path="/success" element={<Success />} />
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />

          <Route element={
            <ProtectedRoute requireOnboarding={true} requireSubscription={true}>
              <AppLayout />
            </ProtectedRoute>
          }>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/leads" element={<MyLeads />} />
            <Route path="/messages" element={<Messages />} />
            <Route path="/directory" element={<PartnershipDirectory />} />
            <Route path="/business/:id" element={<BusinessProfile />} />
            <Route path="/marketplace" element={<OfferMarketplace />} />
            <Route path="/offers" element={<OfferMarketplace />} />
            <Route path="/vault" element={<OfferVault />} />
            <Route path="/offer-vault" element={<OfferVaultPage />} />
            <Route path="/crm" element={<PartnerCRM />} />
            <Route path="/follow-up" element={<FollowUpList />} />
            <Route path="/connections" element={<Connections />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
