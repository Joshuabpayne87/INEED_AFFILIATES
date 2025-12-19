import { useLocation } from 'react-router-dom';
import { Bell, Search } from 'lucide-react';
import { useState } from 'react';

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/directory': 'Partnership Directory',
  '/offers': 'Offer Marketplace',
  '/offer-vault': 'My Offer Vault',
  '/crm': 'Partner CRM',
  '/follow-up': 'Follow Up List',
  '/connections': 'Connections',
  '/settings': 'Settings',
};

export function CRMHeader() {
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');

  const getPageTitle = () => {
    if (location.pathname.startsWith('/business/')) {
      return 'Business Profile';
    }
    return PAGE_TITLES[location.pathname] || 'Dashboard';
  };

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-gray-200">
      <div className="flex items-center justify-between h-16 px-6">
        <h1 className="text-xl font-heading font-semibold text-gray-900">
          {getPageTitle()}
        </h1>

        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-64 pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>

          <button className="relative p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
          </button>
        </div>
      </div>
    </header>
  );
}
