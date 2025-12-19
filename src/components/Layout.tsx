import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useAuth } from '../contexts/AuthContext';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface SubscriptionData {
  subscription_status: string;
  price_id: string;
}

export function Layout() {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);

  useEffect(() => {
    if (user) {
      loadSubscription();
    }
  }, [user]);

  async function loadSubscription() {
    try {
      const { data, error } = await supabase
        .from('stripe_user_subscriptions')
        .select('subscription_status, price_id')
        .maybeSingle();

      if (error) {
        console.error('Error loading subscription:', error);
        return;
      }

      setSubscription(data);
    } catch (error) {
      console.error('Error loading subscription:', error);
    }
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header subscription={subscription} />
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}