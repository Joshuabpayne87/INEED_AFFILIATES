import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useSidebar } from './AppLayout';
import { InviteFriendsModal } from '../InviteFriendsModal';
import {
  LayoutDashboard,
  Users,
  ShoppingBag,
  FolderOpen,
  Kanban,
  ClipboardList,
  Link2,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  UserPlus,
  MessageSquare,
  Target,
} from 'lucide-react';

// Main Section
const MAIN_NAV_ITEMS = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/leads', label: 'My Leads', icon: Target },
];

// Partnerships Section
const PARTNERSHIPS_NAV_ITEMS = [
  { path: '/connections', label: 'Connections', icon: Link2 },
  { path: '/messages', label: 'Messages', icon: MessageSquare },
  { path: '/directory', label: 'Partner Directory', icon: Users },
  { path: '/offers', label: 'Offers Marketplace', icon: ShoppingBag },
  { path: '/offer-vault', label: 'Offer Vault', icon: FolderOpen },
  { path: '/crm', label: 'Partner CRM', icon: Kanban },
  { path: '/follow-up', label: 'Tasks', icon: ClipboardList },
];

// Account Section
const ACCOUNT_NAV_ITEMS = [
  { path: '/settings', label: 'Settings', icon: Settings },
];

export function CRMSidebar() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { collapsed, setCollapsed } = useSidebar();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);

  useEffect(() => {
    const loadUserProfile = async () => {
      if (user) {
        const { data } = await supabase
          .from('users')
          .select('first_name, last_name')
          .eq('id', user.id)
          .maybeSingle();

        if (data) {
          setFirstName(data.first_name || '');
          setLastName(data.last_name || '');
        }
      }
    };

    loadUserProfile();
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const getInitials = () => {
    if (firstName && lastName) {
      return `${firstName[0]}${lastName[0]}`.toUpperCase();
    }
    if (firstName) {
      return firstName[0].toUpperCase();
    }
    return user?.email?.[0]?.toUpperCase() || 'U';
  };

  return (
    <aside
      className={`fixed left-0 top-0 h-screen bg-navy flex flex-col z-50 transition-all duration-300 ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      <div className="flex items-center justify-between h-16 px-4 border-b border-white/10">
        <NavLink to="/dashboard" className="flex items-center gap-3 overflow-hidden">
          {collapsed ? (
            <img src="/logonew2.png" alt="Logo" className="h-8 w-8 object-contain" />
          ) : (
            <img src="/white.png" alt="ineedaffiliates.com" className="h-8" />
          )}
        </NavLink>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        {/* Main Section */}
        <div className="mb-4">
          {!collapsed && (
            <p className="px-3 mb-2 text-xs font-semibold text-white/40 uppercase tracking-wider">Main</p>
          )}
          <ul className="space-y-1">
            {MAIN_NAV_ITEMS.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${
                      isActive
                        ? 'bg-gradient-to-r from-primary/20 to-cyan/10 text-white'
                        : 'text-white/60 hover:bg-white/5 hover:text-white'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <item.icon
                        className={`w-5 h-5 flex-shrink-0 ${
                          isActive ? 'text-cyan' : 'text-white/60 group-hover:text-white'
                        }`}
                      />
                      {!collapsed && (
                        <span className="font-medium text-sm truncate">{item.label}</span>
                      )}
                      {isActive && !collapsed && (
                        <div className="ml-auto w-1.5 h-1.5 rounded-full bg-cyan" />
                      )}
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>

        {/* Partnerships Section */}
        <div className="mb-4">
          {!collapsed && (
            <p className="px-3 mb-2 text-xs font-semibold text-white/40 uppercase tracking-wider">Partnerships</p>
          )}
          <ul className="space-y-1">
            {PARTNERSHIPS_NAV_ITEMS.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${
                      isActive
                        ? 'bg-gradient-to-r from-primary/20 to-cyan/10 text-white'
                        : 'text-white/60 hover:bg-white/5 hover:text-white'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <item.icon
                        className={`w-5 h-5 flex-shrink-0 ${
                          isActive ? 'text-cyan' : 'text-white/60 group-hover:text-white'
                        }`}
                      />
                      {!collapsed && (
                        <span className="font-medium text-sm truncate">{item.label}</span>
                      )}
                      {isActive && !collapsed && (
                        <div className="ml-auto w-1.5 h-1.5 rounded-full bg-cyan" />
                      )}
                    </>
                  )}
                </NavLink>
              </li>
            ))}
            {/* Invite Friends Button */}
            <li>
              <button
                onClick={() => setShowInviteModal(true)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group text-white/60 hover:bg-white/5 hover:text-white"
              >
                <UserPlus className="w-5 h-5 flex-shrink-0 text-white/60 group-hover:text-white" />
                {!collapsed && (
                  <span className="font-medium text-sm truncate">Invite Friends</span>
                )}
              </button>
            </li>
          </ul>
        </div>
      </nav>

      <div className="px-3 pb-3 border-t border-white/10 pt-3">
        {/* Account Section */}
        {!collapsed && (
          <p className="px-3 mb-2 text-xs font-semibold text-white/40 uppercase tracking-wider">Account</p>
        )}
        <ul className="space-y-1 mb-3">
          {ACCOUNT_NAV_ITEMS.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${
                    isActive
                      ? 'bg-gradient-to-r from-primary/20 to-cyan/10 text-white'
                      : 'text-white/60 hover:bg-white/5 hover:text-white'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <item.icon
                      className={`w-5 h-5 flex-shrink-0 ${
                        isActive ? 'text-cyan' : 'text-white/60 group-hover:text-white'
                      }`}
                    />
                    {!collapsed && (
                      <span className="font-medium text-sm truncate">{item.label}</span>
                    )}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>

        <div className="border-t border-white/10 pt-3">
          <div
            className={`flex items-center gap-3 p-2 rounded-lg bg-white/5 ${
              collapsed ? 'justify-center' : ''
            }`}
          >
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-cyan flex items-center justify-center text-white font-heading font-semibold text-sm flex-shrink-0">
              {getInitials()}
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {firstName} {lastName}
                </p>
                <p className="text-xs text-white/50 truncate">{user?.email}</p>
              </div>
            )}
            {!collapsed && (
              <button
                onClick={handleSignOut}
                className="p-1.5 rounded-lg hover:bg-white/10 text-white/60 hover:text-red-400 transition-colors"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
          {collapsed && (
            <button
              onClick={handleSignOut}
              className="w-full mt-2 p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-red-400 transition-colors flex items-center justify-center"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <InviteFriendsModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
      />
    </aside>
  );
}
