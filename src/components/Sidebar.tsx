@@ .. @@
 import { NavLink } from 'react-router-dom';
-import { Home, Users, ShoppingBag, UserCheck, Package, Settings, Building2 } from 'lucide-react';
+import { Home, Users, ShoppingBag, UserCheck, Package, Settings, Building2, CreditCard } from 'lucide-react';
 
 const navigation = [
   { name: 'Dashboard', href: '/', icon: Home },
@@ .. @@
   { name: 'Partner CRM', href: '/crm', icon: UserCheck },
   { name: 'My Offer Vault', href: '/vault', icon: Package },
   { name: 'Settings', hr
}ef: '/settings', icon: Settings },
+  { name: 'Pricing', href: '/pricing', icon: CreditCard },
 ];
 
 export function Sidebar() {