import { Outlet } from 'react-router-dom';
import { useState, createContext, useContext } from 'react';
import { CRMSidebar } from './CRMSidebar';
import { CRMHeader } from './CRMHeader';

interface SidebarContextType {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}

const SidebarContext = createContext<SidebarContextType>({
  collapsed: false,
  setCollapsed: () => {},
});

export const useSidebar = () => useContext(SidebarContext);

export function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <SidebarContext.Provider value={{ collapsed, setCollapsed }}>
      <div className="min-h-screen bg-background">
        <CRMSidebar />
        <div
          className={`transition-all duration-300 ${
            collapsed ? 'pl-20' : 'pl-64'
          }`}
        >
          <CRMHeader />
          <main className="p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarContext.Provider>
  );
}
