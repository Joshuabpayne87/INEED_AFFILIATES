import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import PartnershipsGrid, { Partnership } from '../components/PartnershipsGrid';
import { Search, Filter } from 'lucide-react';

const INDUSTRIES = [
  'All Industries',
  'Coaching & Consulting',
  'Online Education & Course Creators',
  'Real Estate Services & Platforms',
  'Marketing Agencies',
  'SaaS Companies',
  'FinTech & Financial Services',
  'Health, Wellness & Fitness Providers (Online)',
  'E-commerce & DTC Brands',
  'Legal & Professional Services (Online)',
  'AI & Automation Companies',
  'B2B Service Providers',
  'IT & Technology Services',
  'Digital Creators & Influencers',
  'Communities & Membership Platforms',
  'High-Ticket Online Service Providers',
  'Staffing & Virtual Talent Agencies',
  'InsurTech & Online Insurance Providers',
  'Event Production & Masterminds',
  'Business Brokerage & M&A Advisory Firms',
  'Cybersecurity & Compliance Services',
  'Education & EdTech Platforms',
];

const PARTNERSHIP_TYPES = [
  'All Types',
  'Affiliate',
  'JV',
  'Reseller',
  'Strategic Partner',
  'Referral Partner',
  'Webinar Partner',
  'Co-Marketing Partner',
  'Influencer Partner',
];


export function PartnershipDirectory() {
  const { user } = useAuth();
  const [partnerships, setPartnerships] = useState<Partnership[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndustry, setSelectedIndustry] = useState('All Industries');
  const [selectedPartnershipType, setSelectedPartnershipType] = useState('All Types');

  useEffect(() => {
    loadPartnerships();
  }, [user]);

  const loadPartnerships = async () => {
    try {
      const { data, error } = await supabase
        .from('businesses')
        .select('*')
        .eq('profile_state', 'live');

      if (error) throw error;

      const liveBusinesses = (data || []).filter((biz: any) =>
        !user || biz.owner_user_id !== user.id
      );

      const transformedData: Partnership[] = liveBusinesses.map((biz: any) => ({
        id: biz.id,
        company_name: biz.company_name,
        contact_name: biz.contact_name || '',
        email: biz.email || '',
        website: biz.website || '',
        description: biz.description || biz.niche || 'No description available',
        partnership_type: biz.partnership_type || 'affiliate',
        industry: biz.industry,
        commission_rate: biz.commission_rate || '',
        requirements: biz.requirements || '',
        logo_url: biz.logo_url,
        featured: biz.featured || false,
      }));

      setPartnerships(transformedData);
    } catch (error) {
      console.error('Error loading partnerships:', error);
      setPartnerships([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredPartnerships = partnerships.filter(partnership => {
    const matchesSearch = searchQuery === '' ||
      partnership.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      partnership.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      partnership.industry?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesIndustry = selectedIndustry === 'All Industries' ||
      partnership.industry === selectedIndustry;

    const partnershipTypeString = partnership.partnership_type || '';
    const matchesPartnershipType = selectedPartnershipType === 'All Types' ||
      partnershipTypeString.toLowerCase().includes(selectedPartnershipType.toLowerCase());

    return matchesSearch && matchesIndustry && matchesPartnershipType;
  });

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search partnerships by name, description, or industry..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#6666FF] focus:border-[#6666FF] transition-all duration-200 outline-none"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-4 lg:w-auto w-full">
            <div className="flex-1 sm:flex-none sm:min-w-[200px]">
              <select
                value={selectedIndustry}
                onChange={(e) => setSelectedIndustry(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#6666FF] focus:border-[#6666FF] transition-all duration-200 outline-none bg-white"
              >
                {INDUSTRIES.map(industry => (
                  <option key={industry} value={industry}>{industry}</option>
                ))}
              </select>
            </div>

            <div className="flex-1 sm:flex-none sm:min-w-[200px]">
              <select
                value={selectedPartnershipType}
                onChange={(e) => setSelectedPartnershipType(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#6666FF] focus:border-[#6666FF] transition-all duration-200 outline-none bg-white"
              >
                {PARTNERSHIP_TYPES.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {(searchQuery || selectedIndustry !== 'All Industries' || selectedPartnershipType !== 'All Types') && (
          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Showing {filteredPartnerships.length} of {partnerships.length} partnerships
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedIndustry('All Industries');
                setSelectedPartnershipType('All Types');
              }}
              className="text-sm text-[#6666FF] hover:text-[#5555EE] font-medium transition-colors"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>

      <PartnershipsGrid partnerships={filteredPartnerships} isLoading={loading} />
    </div>
  );
}
