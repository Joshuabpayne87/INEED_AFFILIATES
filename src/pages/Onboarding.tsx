import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { MultiSelectChips } from '../components/ui/MultiSelectChips';
import { AlertCircle } from 'lucide-react';
import { BookingModal } from '../components/BookingModal';

const INDUSTRIES = [
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
  'Other',
];

const PARTNERSHIP_TYPES = [
  'Affiliate',
  'JV Manager',
  'JV Partner',
  'Reseller',
  'Strategic Partner',
  'Referral Partner',
  'Webinar Collaboration',
  'Co-Marketing Partner',
  'Influencer Marketing',
  'Super Connector',
  'Sponsor',
  'Podcast Host',
  'Podcast Guest',
  'Looking for Event Sponsors',
  'Other',
  'None',
];

const MAIN_OFFER_TYPES = [
  'Coaching',
  'Consulting',
  'Done-For-You',
  'SaaS',
  'Digital Course',
  'Membership',
  'Mastermind',
  'Agency Service',
  'Lead Generation',
  'Software Tool',
  'Info Product',
  'Event / Workshop',
  'Other',
];

const MONETIZATION_TYPES = [
  'Subscription',
  'High-Ticket Coaching',
  'Retainer',
  'One-Time Fee',
  'Recurring Revenue',
  'Performance Based',
  'Licensing',
  'Bundle Deal',
];

const LOOKING_FOR = [
  'Affiliates',
  'JV Deals',
  'Strategic Partners',
  'Referral Partners',
  'Resellers/White-Label Partners',
  'Cross-Promotion Partners',
  'Email List Owners',
  'Webinar Collaborations',
  'Real Estate JV Partners',
  'Podcast Hosts',
  'Podcast Guests',
  'Influencers',
  'Event Sponsors',
  'Sponsorship Opportunities',
  'Equity Partners',
];

const INTERESTED_OFFER_TYPES = [
  'SaaS Subscription',
  'Software Tool',
  'Coaching Program',
  'Consulting Service',
  'Done-For-You Service',
  'Monthly Retainer',
  'One-Time Implementation',
  'Strategy Session',
  'Digital Product',
  'Membership',
  'Mastermind',
  'Info Product',
  'Templates & Toolkits',
  'Event / Workshop',
  'Lead Generation Service',
  'Recruiting',
  'Data',
  'White Label Offer',
  'Bundle Offer',
  'Physical Product',
  'Sponsorship',
  'Connections',
  'Financial Services',
  'Equity / Investment',
  'Other',
];

const COLLABORATION_TYPES = [
  'JVs',
  'Referrals',
  'Co-Webinars',
  'Email Swaps',
  'Podcast Guesting',
  'Lead Sharing',
  'Cross-Promotion',
  'Co-Marketing',
  'Reseller Partnerships',
];

export function Onboarding() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showBookingModal, setShowBookingModal] = useState(false);

  const [formData, setFormData] = useState({
    business_name: '',
    tagline: '',
    website_url: '',
    industry: '',
    niche: '',
    main_offer_type: '',
    monetization_type: '',
  });

  const [partnershipTypes, setPartnershipTypes] = useState<string[]>([]);
  const [lookingFor, setLookingFor] = useState<string[]>([]);
  const [interestedOfferTypes, setInterestedOfferTypes] = useState<string[]>([]);
  const [selectedCollabTypes, setSelectedCollabTypes] = useState<string[]>([]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    console.log('Form submitted, user:', user?.id);

    if (!user?.id) {
      setError('You must be logged in to continue. Please refresh the page and try again.');
      setLoading(false);
      return;
    }

    try {
      const businessData = {
        company_name: formData.business_name,
        business_name: formData.business_name,
        tagline: formData.tagline || null,
        website: formData.website_url || null,
        industry: formData.industry || '',
        niche: formData.niche || '',
        target_audience: '',
        partnership_type: partnershipTypes.length > 0 ? partnershipTypes.join(', ') : null,
        main_offer_type: formData.main_offer_type || null,
        monetization_type: formData.monetization_type || null,
        looking_for: lookingFor.length > 0 ? lookingFor : null,
        interested_offer_types: interestedOfferTypes.length > 0 ? interestedOfferTypes : null,
        collaboration_types: selectedCollabTypes.length > 0 ? selectedCollabTypes : null,
        profile_state: 'draft',
      };

      console.log('Checking for existing business...');

      // Check if business exists
      const { data: existingBusiness, error: checkError } = await supabase
        .from('businesses')
        .select('id')
        .eq('owner_user_id', user.id)
        .maybeSingle();

      if (checkError) {
        console.error('Error checking for business:', checkError);
        throw checkError;
      }

      if (existingBusiness) {
        console.log('Updating existing business:', existingBusiness.id);
        const { error: updateError } = await supabase
          .from('businesses')
          .update(businessData)
          .eq('owner_user_id', user.id);

        if (updateError) throw updateError;
      } else {
        console.log('Creating new business');
        const { error: insertError } = await supabase
          .from('businesses')
          .insert({
            owner_user_id: user.id,
            ...businessData,
          });

        if (insertError) throw insertError;
      }

      console.log('Success! Showing booking modal');
      setShowBookingModal(true);
    } catch (err: any) {
      console.error('Error submitting form:', err);
      setError(err.message || 'Failed to save business information');
    } finally {
      setLoading(false);
    }
  };

  const handleCloseBookingModal = () => {
    setShowBookingModal(false);
    navigate('/pricing');
  };

  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <BookingModal
        isOpen={showBookingModal}
        onClose={handleCloseBookingModal}
      />
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <img src="/logonew2.png" alt="ineedaffiliates.com" className="h-16 mx-auto mb-4" />
          <h1 className="text-3xl font-heading font-bold text-[#001134] mb-2">
            Business Setup
          </h1>
          <p className="text-gray-600">
            Tell us about your business
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-200">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border-2 border-red-500 rounded-lg flex items-start gap-3 shadow-md">
              <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-red-900 mb-1">Error</p>
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm text-gray-700 mb-2" style={{ fontFamily: 'Sora, sans-serif', fontWeight: 600 }}>
                Business Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="business_name"
                value={formData.business_name}
                onChange={handleChange}
                required
                placeholder="Your Company Inc."
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#6666FF] focus:border-[#6666FF] transition-all duration-200 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-700 mb-2" style={{ fontFamily: 'Sora, sans-serif', fontWeight: 600 }}>
                Tagline
              </label>
              <input
                type="text"
                name="tagline"
                value={formData.tagline}
                onChange={handleChange}
                placeholder="Short one-sentence description (optional)"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#6666FF] focus:border-[#6666FF] transition-all duration-200 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-700 mb-2" style={{ fontFamily: 'Sora, sans-serif', fontWeight: 600 }}>
                Business Website <span className="text-red-500">*</span>
              </label>
              <input
                type="url"
                name="website_url"
                value={formData.website_url}
                onChange={handleChange}
                required
                placeholder="https://yourwebsite.com"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#6666FF] focus:border-[#6666FF] transition-all duration-200 outline-none"
              />
            </div>

            <Select
              label="Industry"
              options={INDUSTRIES}
              value={formData.industry}
              onChange={(value) => setFormData({ ...formData, industry: value })}
              required
              placeholder="Select an industry"
              allowOther
            />

            <div>
              <label className="block text-sm text-gray-700 mb-2" style={{ fontFamily: 'Sora, sans-serif', fontWeight: 600 }}>
                Niche <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="niche"
                value={formData.niche}
                onChange={handleChange}
                required
                placeholder="Describe your niche (free text)"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#6666FF] focus:border-[#6666FF] transition-all duration-200 outline-none"
              />
            </div>

            <div className="bg-gradient-to-br from-gray-50 to-white border-2 border-gray-200 rounded-xl p-5">
              <MultiSelectChips
                label="Partner Types that best describe you"
                options={PARTNERSHIP_TYPES}
                value={partnershipTypes}
                onChange={setPartnershipTypes}
              />
            </div>

            <Select
              label="Main Offer Type"
              options={MAIN_OFFER_TYPES}
              value={formData.main_offer_type}
              onChange={(value) => setFormData({ ...formData, main_offer_type: value })}
              placeholder="Select your main offer type"
              allowOther
            />

            <Select
              label="Your Main Offer's Monetization"
              options={MONETIZATION_TYPES}
              value={formData.monetization_type}
              onChange={(value) => setFormData({ ...formData, monetization_type: value })}
              placeholder="How do you monetize?"
            />

            <div className="bg-gradient-to-br from-blue-50 to-white border-2 border-blue-200 rounded-xl p-5">
              <MultiSelectChips
                label="Types of Partners You're Looking For"
                options={LOOKING_FOR}
                value={lookingFor}
                onChange={setLookingFor}
              />
            </div>

            <div className="bg-gradient-to-br from-green-50 to-white border-2 border-green-200 rounded-xl p-5">
              <MultiSelectChips
                label="What Type of Offers Are You Interested In Promoting?"
                options={INTERESTED_OFFER_TYPES}
                value={interestedOfferTypes}
                onChange={setInterestedOfferTypes}
              />
            </div>

            <div className="bg-gradient-to-br from-yellow-50 to-white border-2 border-yellow-200 rounded-xl p-5">
              <MultiSelectChips
                label="Preferred Collaboration Methods"
                options={COLLABORATION_TYPES}
                value={selectedCollabTypes}
                onChange={setSelectedCollabTypes}
              />
            </div>

            <Button
              type="submit"
              variant="gradient"
              className="w-full mt-8"
              loading={loading}
              size="lg"
            >
              Continue to Pricing
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
