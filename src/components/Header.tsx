import { Bell, Search, User, Crown, LogOut } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Badge } from './ui/Badge';
import { STRIPE_PRODUCTS } from '../stripe-config';

interface SubscriptionData {
  subscription_status: string;
  price_id: string;
}

interface HeaderProps {
  subscription: SubscriptionData | null;
}

export function Header({ subscription }: HeaderProps) {
  const { signOut } = useAuth();

  const getSubscriptionPlan = () => {
    if (!subscription?.price_id) return 'Free';
    
    const product = STRIPE_PRODUCTS.find(p => p.priceId === subscription.price_id);
    return product?.name || 'Pro';
  };

  const getSubscriptionStatus = () => {
    if (!subscription) return 'free';
    return subscription.subscription_status;
  };

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
        </div>

        <div className="flex-1 max-w-md mx-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            {getSubscriptionStatus() === 'active' ? (
              <Badge variant="success" className="flex items-center gap-1">
                <Crown className="w-3 h-3" />
                {getSubscriptionPlan()}
              </Badge>
            ) : (
              <Link to="/pricing">
                <Badge variant="secondary" className="hover:bg-gray-200 cursor-pointer">
                  {getSubscriptionPlan()}
                </Badge>
              </Link>
            )}
          </div>
          
          <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors relative">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>
          
          <div className="relative group">
            <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
              <User className="w-5 h-5" />
            </button>
            <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
              <div className="p-2">
                <Link
                  to="/settings"
                  className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                >
                  Settings
                </Link>
                <button
                  onClick={signOut}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}