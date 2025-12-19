import { LayoutDashboard } from 'lucide-react';
import { CRMKanban } from '../components/CRMKanban';

export function PartnerCRM() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#FF1493] to-[#FF69FF] flex items-center justify-center">
          <LayoutDashboard className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Partner CRM</h1>
          <p className="text-gray-600">Manage your partnership pipeline</p>
        </div>
      </div>

      <div className="bg-white rounded-lg border-2 border-gray-200 p-6">
        <CRMKanban />
      </div>
    </div>
  );
}
