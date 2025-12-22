import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { TagInput } from '../components/ui/TagInput';
import { Select } from '../components/ui/Select';
import { MultiSelectChips } from '../components/ui/MultiSelectChips';
import { FileUpload } from '../components/ui/FileUpload';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrencyInput } from '../lib/currencyUtils';
import { OfferPriceOption } from '../types/offerPriceOption';
import { loadOfferPriceOptions, saveOfferPriceOptions } from '../lib/offerPriceOptionsUtils';
import { User, Building2, CreditCard, Bell, Save, Crown, Check, Package, Plus, CreditCard as Edit2, Trash2, X, Lock, AlertCircle, CheckCircle } from 'lucide-react';

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
  'JV',
  'Reseller',
  'Strategic Partner',
  'Referral Partner',
  'Webinar Partner',
  'Co-Marketing Partner',
  'Influencer Partner',
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
  'Commission-Based',
  'Licensing',
  'Hybrid Model',
];

const LOOKING_FOR = [
  'Affiliates',
  'JV',
  'Referral Partners',
  'Webinar Collaboration',
  'Email Marketing',
  'Resellers',
  'White-Label Partners',
  'Cross-Promo Partners',
  'Event Sponsors',
  'Sponsorship Opportunities',
  'Speaking Engagements',
  'Real Estate JV',
  'Strategic Partners',
  'Need Podcast Guests',
  'Be on Podcasts',
  'Need Speakers',
];

const INTERESTED_OFFER_TYPES = [
  'High-Ticket Offers',
  'Recurring Revenue Offers',
  'SaaS Offers',
  'Affiliate Programs',
  'Webinar Collaborations',
  'Email Swaps',
  'Co-Marketing Deals',
  'Reseller Opportunities',
  'Partner Programs',
];


const OFFER_TYPES = [
  'SaaS Subscription',
  'Coaching Program',
  'Consulting Service',
  'Done-for-You Service',
  'Digital Course',
  'Membership',
  'Mastermind',
  'Agency Service',
  'Strategy Session',
  'Info Product',
  'Event / Workshop',
  'Software Tool',
  'Lead Generation Service',
  'Other',
];

const PROMO_METHODS = [
  'Email',
  'Webinar',
  'Social Media',
  'Blog Post',
  'Podcast',
  'YouTube',
  'Paid Ads',
  'Direct Outreach',
  'Referral',
  'White-Label',
  'Website Traffic',
  'Other',
];

type TabType = 'account' | 'business' | 'offers' | 'billing' | 'notifications';

interface Offer {
  id: string;
  business_id: string;
  offer_name: string;
  description: string;
  price_point: string;
  commission_percent: number;
  offer_type: string;
  promo_methods: string[];
  resources_link: string | null;
  affiliate_signup_link: string | null;
  purchase_affiliate_link: string | null;
  commission_type: string | null;
  commission_duration: string | null;
  offer_notes: string | null;
  is_active: boolean;
  created_at: string;
}

interface UserProfile {
  first_name: string;
  last_name: string;
  email: string;
  title: string;
  headshot_url: string;
  residential_zipcode: string;
  subscription_tier: string;
  subscription_status: string;
  trial_ends_at: string | null;
  sms_country_iso: string;
  sms_country_code: string;
  sms_phone_national: string;
  sms_phone_e164: string;
}

interface BusinessProfile {
  business_name: string;
  tagline: string;
  logo_url: string;
  industry: string;
  niche: string;
  website_url: string;
  main_offer_type: string;
  monetization_type: string;
  description: string;
  problem_solved: string;
  target_audience: string;
  unique_value: string;
  video_url: string;
  contact_name: string;
  email: string;
  calendar_link: string;
  founder_name: string;
  founder_bio: string;
  founder_background: string;
  founder_why_started: string;
  founder_headshot_url: string;
  social_audience_size: string;
  email_list_size: string;
  email_open_rate: string;
  number_of_offers: string;
  commission_rate: string;
  requirements: string;
  cross_promotion_preference: string;
  partnership_opportunities: string;
  business_street_address: string;
  business_city: string;
  business_state: string;
  business_zipcode: string;
  business_phone: string;
  linkedin_url: string;
  twitter_url: string;
  facebook_url: string;
  instagram_url: string;
  years_in_business: string;
  detailed_services: string;
  average_sale_size: string;
  approximate_annual_revenue: string;
}

interface BusinessProfileArrays {
  partnership_types: string[];
  looking_for: string[];
  interested_offer_types: string[];
  payment_methods: string[];
}

export function Settings() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabType>('account');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [userProfile, setUserProfile] = useState<UserProfile>({
    first_name: '',
    last_name: '',
    email: '',
    title: '',
    headshot_url: '',
    residential_zipcode: '',
    subscription_tier: 'free',
    subscription_status: 'active',
    trial_ends_at: null,
    sms_country_iso: '',
    sms_country_code: '',
    sms_phone_national: '',
    sms_phone_e164: '',
  });

  const [businessProfile, setBusinessProfile] = useState<BusinessProfile>({
    business_name: '',
    tagline: '',
    logo_url: '',
    industry: '',
    niche: '',
    website_url: '',
    main_offer_type: '',
    monetization_type: '',
    description: '',
    problem_solved: '',
    target_audience: '',
    unique_value: '',
    video_url: '',
    contact_name: '',
    email: '',
    calendar_link: '',
    founder_name: '',
    founder_bio: '',
    founder_background: '',
    founder_why_started: '',
    founder_headshot_url: '',
    social_audience_size: '',
    email_list_size: '',
    email_open_rate: '',
    number_of_offers: '',
    commission_rate: '',
    requirements: '',
    cross_promotion_preference: '',
    partnership_opportunities: '',
    business_street_address: '',
    business_city: '',
    business_state: '',
    business_zipcode: '',
    business_phone: '',
    linkedin_url: '',
    twitter_url: '',
    facebook_url: '',
    instagram_url: '',
    years_in_business: '',
    detailed_services: '',
    average_sale_size: '',
    approximate_annual_revenue: '',
  });

  const [businessArrays, setBusinessArrays] = useState<BusinessProfileArrays>({
    partnership_types: [],
    looking_for: [],
    interested_offer_types: [],
    payment_methods: [],
  });

  const [notifications, setNotifications] = useState({
    connection_requests: true,
    new_messages: true,
    offer_matches: true,
    payment_alerts: true,
  });

  const [offers, setOffers] = useState<Offer[]>([]);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null);
  const [offerForm, setOfferForm] = useState({
    offer_name: '',
    description: '',
    price_point: '', // Keep for backward compatibility
    commission_calculation_type: '', // '%' or 'Flat Fee'
    commission_percent: 0,
    offer_type: '',
    promo_methods: [] as string[],
    resources_link: '',
    affiliate_signup_link: '',
    purchase_affiliate_link: '',
    commission_type: '',
    commission_duration: '',
    offer_notes: '',
    is_active: true,
    priceOptions: [] as OfferPriceOption[],
  });

  const [passwordForm, setPasswordForm] = useState({
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  useEffect(() => {
    if (user) {
      loadSettings();
    }
  }, [user]);

  useEffect(() => {
    const tab = searchParams.get('tab') as TabType;
    if (tab && ['account', 'business', 'offers', 'billing', 'notifications'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  async function loadSettings() {
    if (!user) return;

    setLoading(true);
    try {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('first_name, last_name, email, title, headshot_url, residential_zipcode, subscription_tier, subscription_status, trial_ends_at, sms_country_iso, sms_country_code, sms_phone_national, sms_phone_e164')
        .eq('id', user.id)
        .single();

      if (userError) throw userError;
      if (userData) setUserProfile(userData);

      const { data: businessData, error: businessError } = await supabase
        .from('businesses')
        .select('*')
        .eq('owner_user_id', user.id)
        .limit(1)
        .maybeSingle();

      if (businessError) throw businessError;
      if (businessData) {
        setBusinessId(businessData.id);
        setBusinessProfile({
          business_name: businessData.company_name || '',
          tagline: businessData.tagline || '',
          logo_url: businessData.logo_url || '',
          industry: businessData.industry || '',
          niche: businessData.niche || '',
          website_url: businessData.website || '',
          main_offer_type: businessData.main_offer_type || '',
          monetization_type: businessData.monetization_type || '',
          description: businessData.description || '',
          problem_solved: businessData.problem_solved || '',
          target_audience: businessData.target_audience || '',
          unique_value: businessData.unique_value || '',
          video_url: businessData.video_url || '',
          contact_name: businessData.contact_name || '',
          email: businessData.email || '',
          calendar_link: businessData.calendar_link || '',
          founder_name: businessData.founder_name || '',
          founder_bio: businessData.founder_bio || '',
          founder_background: businessData.founder_background || '',
          founder_why_started: businessData.founder_why_started || '',
          founder_headshot_url: businessData.founder_headshot_url || '',
          social_audience_size: businessData.social_audience_size || '',
          email_list_size: businessData.email_list_size || '',
          email_open_rate: businessData.email_open_rate || '',
          number_of_offers: businessData.number_of_offers || '',
          commission_rate: businessData.commission_rate || '',
          requirements: businessData.requirements || '',
          cross_promotion_preference: businessData.cross_promotion_preference || '',
          partnership_opportunities: businessData.partnership_opportunities || '',
          business_street_address: businessData.business_street_address || '',
          business_city: businessData.business_city || '',
          business_state: businessData.business_state || '',
          business_zipcode: businessData.business_zipcode || '',
          business_phone: businessData.business_phone || '',
          linkedin_url: businessData.linkedin_url || '',
          twitter_url: businessData.twitter_url || '',
          facebook_url: businessData.facebook_url || '',
          instagram_url: businessData.instagram_url || '',
          years_in_business: businessData.years_in_business?.toString() || '',
          detailed_services: businessData.detailed_services || '',
          average_sale_size: businessData.average_sale_size || '',
          approximate_annual_revenue: businessData.approximate_annual_revenue || '',
        });

        const partnershipTypeString = businessData.partnership_type || '';
        const partnershipTypesArray = partnershipTypeString ? partnershipTypeString.split(',').map((s: string) => s.trim()).filter(Boolean) : [];

        setBusinessArrays({
          partnership_types: partnershipTypesArray,
          looking_for: businessData.looking_for || [],
          interested_offer_types: businessData.interested_offer_types || [],
          payment_methods: businessData.payment_methods || [],
        });

        await loadOffers(businessData.id);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadOffers(bizId: string) {
    try {
      const { data, error } = await supabase
        .from('offers')
        .select('*')
        .eq('business_id', bizId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOffers(data || []);
    } catch (error) {
      console.error('Error loading offers:', error);
    }
  }

  async function saveAccountSettings() {
    if (!user) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({
          first_name: userProfile.first_name,
          last_name: userProfile.last_name,
          title: userProfile.title || null,
          headshot_url: userProfile.headshot_url || null,
          residential_zipcode: userProfile.residential_zipcode || null,
        })
        .eq('id', user.id);

      if (error) throw error;

      alert('Account settings saved successfully!');
    } catch (error) {
      console.error('Error saving account settings:', error);
      alert('Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function updatePassword() {
    setPasswordError('');
    setPasswordSuccess('');

    if (!passwordForm.newPassword || !passwordForm.confirmPassword) {
      setPasswordError('Please fill in all password fields');
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters long');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordForm.newPassword
      });

      if (error) throw error;

      setPasswordSuccess('Password updated successfully!');
      setPasswordForm({
        newPassword: '',
        confirmPassword: '',
      });
    } catch (error: any) {
      console.error('Error updating password:', error);
      setPasswordError(error.message || 'Failed to update password. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function saveBusinessSettings() {
    if (!user) return;

    setSaving(true);
    try {
      const { data: existingBusiness } = await supabase
        .from('businesses')
        .select('id')
        .eq('owner_user_id', user.id)
        .limit(1)
        .maybeSingle();

      if (existingBusiness) {
        const { error } = await supabase
          .from('businesses')
          .update({
            company_name: businessProfile.business_name,
            tagline: businessProfile.tagline || null,
            logo_url: businessProfile.logo_url || null,
            industry: businessProfile.industry,
            niche: businessProfile.niche,
            website: businessProfile.website_url,
            partnership_type: businessArrays.partnership_types.join(', ') || null,
            main_offer_type: businessProfile.main_offer_type || null,
            monetization_type: businessProfile.monetization_type || null,
            description: businessProfile.description,
            problem_solved: businessProfile.problem_solved,
            target_audience: businessProfile.target_audience,
            unique_value: businessProfile.unique_value,
            video_url: businessProfile.video_url,
            contact_name: businessProfile.contact_name,
            email: businessProfile.email,
            calendar_link: businessProfile.calendar_link,
            founder_name: businessProfile.founder_name,
            founder_bio: businessProfile.founder_bio,
            founder_background: businessProfile.founder_background,
            founder_why_started: businessProfile.founder_why_started,
            founder_headshot_url: businessProfile.founder_headshot_url,
            social_audience_size: businessProfile.social_audience_size,
            email_list_size: businessProfile.email_list_size,
            email_open_rate: businessProfile.email_open_rate,
            number_of_offers: businessProfile.number_of_offers,
            commission_rate: businessProfile.commission_rate,
            requirements: businessProfile.requirements,
            cross_promotion_preference: businessProfile.cross_promotion_preference,
            partnership_opportunities: businessProfile.partnership_opportunities || null,
            looking_for: businessArrays.looking_for.length > 0 ? businessArrays.looking_for : null,
            interested_offer_types: businessArrays.interested_offer_types.length > 0 ? businessArrays.interested_offer_types : null,
            payment_methods: businessArrays.payment_methods.length > 0 ? businessArrays.payment_methods : null,
            business_street_address: businessProfile.business_street_address || null,
            business_city: businessProfile.business_city || null,
            business_state: businessProfile.business_state || null,
            business_zipcode: businessProfile.business_zipcode || null,
            business_phone: businessProfile.business_phone || null,
            linkedin_url: businessProfile.linkedin_url || null,
            twitter_url: businessProfile.twitter_url || null,
            facebook_url: businessProfile.facebook_url || null,
            instagram_url: businessProfile.instagram_url || null,
            years_in_business: businessProfile.years_in_business ? parseInt(businessProfile.years_in_business) : null,
            detailed_services: businessProfile.detailed_services || null,
            average_sale_size: businessProfile.average_sale_size || null,
            approximate_annual_revenue: businessProfile.approximate_annual_revenue || null,
          })
          .eq('id', existingBusiness.id);

        if (error) throw error;
      }

      alert('Business settings saved successfully!');
    } catch (error) {
      console.error('Error saving business settings:', error);
      alert('Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function openOfferModal(offer?: Offer) {
    if (offer) {
      setEditingOffer(offer);
      // Load price options for this offer
      const priceOptions = await loadOfferPriceOptions(offer.id);
      setOfferForm({
        offer_name: offer.offer_name,
        description: offer.description,
        price_point: offer.price_point,
        commission_calculation_type: '', // Will need to be loaded from database if stored
        commission_percent: offer.commission_percent,
        offer_type: offer.offer_type,
        promo_methods: offer.promo_methods || [],
        resources_link: offer.resources_link || '',
        affiliate_signup_link: offer.affiliate_signup_link || '',
        purchase_affiliate_link: offer.purchase_affiliate_link || '',
        commission_type: offer.commission_type || '',
        commission_duration: offer.commission_duration || '',
        offer_notes: offer.offer_notes || '',
        is_active: offer.is_active,
        priceOptions: priceOptions.length > 0 ? priceOptions : [{ amount: 0, currency: 'USD', frequency: 'per_month', sort_order: 0 }],
      });
    } else {
      setEditingOffer(null);
      setOfferForm({
        offer_name: '',
        description: '',
        price_point: '',
        commission_calculation_type: '',
        commission_percent: 0,
        offer_type: '',
        promo_methods: [],
        resources_link: '',
        affiliate_signup_link: '',
        purchase_affiliate_link: '',
        commission_type: '',
        commission_duration: '',
        offer_notes: '',
        is_active: true,
        priceOptions: [{ amount: 0, currency: 'USD', frequency: 'per_month', sort_order: 0 }],
      });
    }
    setShowOfferModal(true);
  }

  function closeOfferModal() {
    setShowOfferModal(false);
    setEditingOffer(null);
  }

  async function saveOffer() {
    if (!businessId) {
      alert('Please save your business profile first before adding offers.');
      return;
    }

    if (!offerForm.offer_name) {
      alert('Please enter an offer name.');
      return;
    }

    setSaving(true);
    try {
      if (editingOffer) {
        const { error } = await supabase
          .from('offers')
          .update({
            offer_name: offerForm.offer_name,
            description: offerForm.description,
            price_point: offerForm.price_point,
            commission_percent: offerForm.commission_percent,
            offer_type: offerForm.offer_type,
            promo_methods: offerForm.promo_methods,
            resources_link: offerForm.resources_link || null,
            affiliate_signup_link: offerForm.affiliate_signup_link || null,
            purchase_affiliate_link: offerForm.purchase_affiliate_link || null,
            commission_type: offerForm.commission_type || null,
            commission_duration: offerForm.commission_duration || null,
            offer_notes: offerForm.offer_notes || null,
            is_active: offerForm.is_active,
          })
          .eq('id', editingOffer.id);

        if (error) throw error;
        
        // Save price options
        const priceOptionsResult = await saveOfferPriceOptions(editingOffer.id, offerForm.priceOptions);
        if (!priceOptionsResult.success) {
          throw new Error(priceOptionsResult.error || 'Failed to save price options');
        }
        
        alert('Offer updated successfully!');
      } else {
        const { data: newOffer, error } = await supabase
          .from('offers')
          .insert({
            business_id: businessId,
            offer_name: offerForm.offer_name,
            description: offerForm.description,
            price_point: offerForm.price_point,
            commission_percent: offerForm.commission_percent,
            offer_type: offerForm.offer_type,
            promo_methods: offerForm.promo_methods,
            resources_link: offerForm.resources_link || null,
            affiliate_signup_link: offerForm.affiliate_signup_link || null,
            purchase_affiliate_link: offerForm.purchase_affiliate_link || null,
            commission_type: offerForm.commission_type || null,
            commission_duration: offerForm.commission_duration || null,
            offer_notes: offerForm.offer_notes || null,
            is_active: offerForm.is_active,
          })
          .select()
          .single();

        if (error) throw error;
        if (!newOffer) throw new Error('Failed to create offer');
        
        // Save price options for the new offer
        const priceOptionsResult = await saveOfferPriceOptions(newOffer.id, offerForm.priceOptions);
        if (!priceOptionsResult.success) {
          throw new Error(priceOptionsResult.error || 'Failed to save price options');
        }
        
        alert('Offer created successfully!');
      }

      await loadOffers(businessId);
      closeOfferModal();
    } catch (error) {
      console.error('Error saving offer:', error);
      alert('Failed to save offer. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function deleteOffer(offerId: string) {
    if (!confirm('Are you sure you want to delete this offer?')) return;

    try {
      const { error } = await supabase
        .from('offers')
        .delete()
        .eq('id', offerId);

      if (error) throw error;

      if (businessId) {
        await loadOffers(businessId);
      }
      alert('Offer deleted successfully!');
    } catch (error) {
      console.error('Error deleting offer:', error);
      alert('Failed to delete offer. Please try again.');
    }
  }

  async function toggleOfferActive(offerId: string, currentStatus: boolean) {
    try {
      const { error } = await supabase
        .from('offers')
        .update({ is_active: !currentStatus })
        .eq('id', offerId);

      if (error) throw error;

      if (businessId) {
        await loadOffers(businessId);
      }
    } catch (error) {
      console.error('Error toggling offer status:', error);
      alert('Failed to update offer status.');
    }
  }

  const tabs = [
    { id: 'account' as TabType, label: 'Account', icon: User },
    { id: 'business' as TabType, label: 'Business Profile', icon: Building2 },
    { id: 'offers' as TabType, label: 'My Offers', icon: Package },
    { id: 'billing' as TabType, label: 'Billing & Subscription', icon: CreditCard },
    { id: 'notifications' as TabType, label: 'Notifications', icon: Bell },
  ];


  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Settings
        </h1>
        <p className="text-gray-600">Manage your account, business profile, and billing</p>
      </div>

      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                py-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-2
                ${activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {loading ? (
        <Card className="p-6">
          <p className="text-gray-500">Loading settings...</p>
        </Card>
      ) : (
        <>
          {activeTab === 'account' && (
            <div className="space-y-6">
              <Card className="p-6">
                <h2 className="text-xl font-semibold mb-4">Account Information</h2>
                <div className="space-y-4 max-w-xl">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      First Name
                    </label>
                    <Input
                      value={userProfile.first_name}
                      onChange={(e) => setUserProfile({ ...userProfile, first_name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Last Name
                    </label>
                    <Input
                      value={userProfile.last_name}
                      onChange={(e) => setUserProfile({ ...userProfile, last_name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Email
                    </label>
                    <Input
                      value={userProfile.email}
                      disabled
                      className="bg-gray-50"
                    />
                    <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Phone Number
                    </label>
                    <div className="flex gap-2">
                      <Input
                        value={userProfile.sms_country_code}
                        disabled
                        className="bg-gray-50 w-24"
                      />
                      <Input
                        value={userProfile.sms_phone_national}
                        disabled
                        className="bg-gray-50 flex-1"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Phone number cannot be changed</p>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Job Title
                    </label>
                    <Input
                      value={userProfile.title}
                      onChange={(e) => setUserProfile({ ...userProfile, title: e.target.value })}
                      placeholder="e.g., CEO, Founder, Marketing Director"
                    />
                  </div>
                  <div>
                    <FileUpload
                      label="Profile Photo (optional)"
                      value={userProfile.headshot_url}
                      onChange={(url) => setUserProfile({ ...userProfile, headshot_url: url || '' })}
                      folder="profile-photos"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Residential Zip Code
                    </label>
                    <Input
                      value={userProfile.residential_zipcode}
                      onChange={(e) => setUserProfile({ ...userProfile, residential_zipcode: e.target.value })}
                      placeholder="Used for location-based partner matching (private)"
                    />
                    <p className="text-xs text-gray-500 mt-1">This information is private and used only for partner matching</p>
                  </div>
                  <Button onClick={saveAccountSettings} disabled={saving}>
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </Button>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Lock className="w-5 h-5 text-gray-700" />
                  <h2 className="text-xl font-semibold">Password & Security</h2>
                </div>
                <div className="space-y-4 max-w-xl">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      New Password
                    </label>
                    <Input
                      type="password"
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                      placeholder="Enter new password"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Confirm New Password
                    </label>
                    <Input
                      type="password"
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                      placeholder="Confirm new password"
                    />
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-900 font-semibold mb-2">Password Requirements:</p>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <span>At least 8 characters long</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <span>Use a mix of letters, numbers, and symbols for better security</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <span>Use a unique password not used elsewhere</span>
                      </li>
                    </ul>
                  </div>

                  {passwordError && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-2">
                      <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-red-800">{passwordError}</p>
                    </div>
                  )}

                  {passwordSuccess && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-green-800">{passwordSuccess}</p>
                    </div>
                  )}

                  <Button onClick={updatePassword} disabled={saving}>
                    <Lock className="w-4 h-4 mr-2" />
                    {saving ? 'Updating...' : 'Update Password'}
                  </Button>
                </div>
              </Card>
            </div>
          )}

          {activeTab === 'business' && (
            <div className="space-y-6">
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Business Basics</h3>
                <div className="space-y-4 max-w-2xl">
                  <Input
                    label="Business Name"
                    value={businessProfile.business_name}
                    onChange={(e) => setBusinessProfile({ ...businessProfile, business_name: e.target.value })}
                  />
                  <Input
                    label="Tagline"
                    value={businessProfile.tagline}
                    onChange={(e) => setBusinessProfile({ ...businessProfile, tagline: e.target.value })}
                    placeholder="Short one-sentence description (optional)"
                  />
                  <FileUpload
                    label="Business Logo (optional)"
                    value={businessProfile.logo_url}
                    onChange={(url) => setBusinessProfile({ ...businessProfile, logo_url: url || '' })}
                    folder="company-logos"
                  />
                  <Input
                    label="Website URL"
                    value={businessProfile.website_url}
                    onChange={(e) => setBusinessProfile({ ...businessProfile, website_url: e.target.value })}
                    placeholder="https://example.com"
                  />
                  <Select
                    label="Industry"
                    options={INDUSTRIES}
                    value={businessProfile.industry}
                    onChange={(value) => setBusinessProfile({ ...businessProfile, industry: value })}
                    placeholder="Select an industry"
                    allowOther
                  />
                  <div>
                    <label className="block text-sm text-gray-700 mb-2" style={{ fontFamily: 'Sora, sans-serif', fontWeight: 600 }}>
                      Niche
                    </label>
                    <input
                      type="text"
                      value={businessProfile.niche}
                      onChange={(e) => setBusinessProfile({ ...businessProfile, niche: e.target.value })}
                      placeholder="Describe your niche (free text)"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#6666FF] focus:border-[#6666FF] transition-all duration-200 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-2" style={{ fontFamily: 'Sora, sans-serif', fontWeight: 600 }}>Looking For</label>
                    <textarea
                      value={businessProfile.partnership_opportunities}
                      onChange={(e) => setBusinessProfile({ ...businessProfile, partnership_opportunities: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6666FF]"
                      rows={3}
                      placeholder="Describe what types of partners you're looking for. Be specific about their audience, expertise, or resources."
                    />
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">What You Do</h3>
                <div className="space-y-4 max-w-2xl">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                    <textarea
                      value={businessProfile.description}
                      onChange={(e) => setBusinessProfile({ ...businessProfile, description: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6666FF]"
                      rows={4}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Problem You Solve</label>
                    <textarea
                      value={businessProfile.problem_solved}
                      onChange={(e) => setBusinessProfile({ ...businessProfile, problem_solved: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6666FF]"
                      rows={3}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Target Audience</label>
                    <textarea
                      value={businessProfile.target_audience}
                      onChange={(e) => setBusinessProfile({ ...businessProfile, target_audience: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6666FF]"
                      rows={3}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Unique Value</label>
                    <textarea
                      value={businessProfile.unique_value}
                      onChange={(e) => setBusinessProfile({ ...businessProfile, unique_value: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6666FF]"
                      rows={3}
                    />
                  </div>
                  <Input
                    label="Intro Video URL (optional)"
                    value={businessProfile.video_url}
                    onChange={(e) => setBusinessProfile({ ...businessProfile, video_url: e.target.value })}
                  />
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Contact Details</h3>
                <div className="space-y-4 max-w-2xl">
                  <Input
                    label="Primary Contact Name"
                    value={businessProfile.contact_name}
                    onChange={(e) => setBusinessProfile({ ...businessProfile, contact_name: e.target.value })}
                  />
                  <Input
                    label="Contact Title"
                    type="text"
                    value={businessProfile.email}
                    onChange={(e) => setBusinessProfile({ ...businessProfile, email: e.target.value })}
                    placeholder="e.g., CEO, Founder, Marketing Director"
                  />
                  <Input
                    label="Calendar Link"
                    value={businessProfile.calendar_link}
                    onChange={(e) => setBusinessProfile({ ...businessProfile, calendar_link: e.target.value })}
                  />
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Founder Info</h3>
                <div className="space-y-4 max-w-2xl">
                  <Input
                    label="Founder Name"
                    value={businessProfile.founder_name}
                    onChange={(e) => setBusinessProfile({ ...businessProfile, founder_name: e.target.value })}
                  />
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Founder Bio</label>
                    <textarea
                      value={businessProfile.founder_bio}
                      onChange={(e) => setBusinessProfile({ ...businessProfile, founder_bio: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6666FF]"
                      rows={3}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Background & Expertise</label>
                    <textarea
                      value={businessProfile.founder_background}
                      onChange={(e) => setBusinessProfile({ ...businessProfile, founder_background: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6666FF]"
                      rows={3}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Why You Started</label>
                    <textarea
                      value={businessProfile.founder_why_started}
                      onChange={(e) => setBusinessProfile({ ...businessProfile, founder_why_started: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6666FF]"
                      rows={3}
                    />
                  </div>
                  <FileUpload
                    label="Founder Headshot (optional)"
                    value={businessProfile.founder_headshot_url}
                    onChange={(url) => setBusinessProfile({ ...businessProfile, founder_headshot_url: url || '' })}
                    folder="founder-headshots"
                  />
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Audience & Metrics</h3>
                <div className="space-y-4 max-w-2xl">
                  <Input
                    label="Social Audience Size"
                    value={businessProfile.social_audience_size}
                    onChange={(e) => setBusinessProfile({ ...businessProfile, social_audience_size: e.target.value })}
                    placeholder="e.g., 50,000 followers"
                  />
                  <Input
                    label="Email List Size"
                    value={businessProfile.email_list_size}
                    onChange={(e) => setBusinessProfile({ ...businessProfile, email_list_size: e.target.value })}
                    placeholder="e.g., 10,000 subscribers"
                  />
                  <Input
                    label="Email Open Rate"
                    value={businessProfile.email_open_rate}
                    onChange={(e) => setBusinessProfile({ ...businessProfile, email_open_rate: e.target.value })}
                    placeholder="e.g., 35%"
                  />
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Business Metrics</h3>
                <div className="space-y-4 max-w-2xl">
                  <Input
                    label="Years in Business"
                    type="number"
                    value={businessProfile.years_in_business}
                    onChange={(e) => setBusinessProfile({ ...businessProfile, years_in_business: e.target.value })}
                    placeholder="e.g., 5"
                  />
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Detailed Services
                    </label>
                    <textarea
                      value={businessProfile.detailed_services}
                      onChange={(e) => setBusinessProfile({ ...businessProfile, detailed_services: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6666FF]"
                      rows={4}
                      placeholder="Provide a detailed description of your services and products"
                    />
                  </div>
                  <Input
                    label="Average Sale Size"
                    value={businessProfile.average_sale_size}
                    onChange={(e) => setBusinessProfile({ ...businessProfile, average_sale_size: e.target.value })}
                    placeholder="e.g., $5,000"
                  />
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Approximate Annual Revenue
                    </label>
                    <Input
                      value={businessProfile.approximate_annual_revenue}
                      onChange={(e) => setBusinessProfile({ ...businessProfile, approximate_annual_revenue: e.target.value })}
                      placeholder="e.g., $1M-$5M"
                    />
                    <p className="text-xs text-gray-500 mt-1">This information is private and not shared with other users</p>
                  </div>
                  <div className="bg-gradient-to-br from-blue-50 to-white border-2 border-blue-200 rounded-xl p-5">
                    <MultiSelectChips
                      label="Payment Methods Accepted"
                      options={['Credit Card', 'PayPal', 'Stripe', 'Bank Transfer', 'Crypto', 'Financing Available', 'Payment Plans', 'Other']}
                      value={businessArrays.payment_methods}
                      onChange={(selected) => setBusinessArrays({ ...businessArrays, payment_methods: selected })}
                    />
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Offer Details</h3>
                <div className="space-y-4 max-w-2xl">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                    <p className="text-sm text-blue-800">
                      This section helps potential partners understand your offer at a glance. For detailed offer management, go to the "My Offers" tab.
                    </p>
                  </div>
                  <Input
                    label="Number of Offers"
                    value={businessProfile.number_of_offers}
                    onChange={(e) => setBusinessProfile({ ...businessProfile, number_of_offers: e.target.value })}
                    placeholder="e.g., 3 active offers"
                  />
                  <Input
                    label="Commission Rate Range"
                    value={businessProfile.commission_rate}
                    onChange={(e) => setBusinessProfile({ ...businessProfile, commission_rate: e.target.value })}
                    placeholder="e.g., 20-50%"
                  />
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Partner Requirements
                    </label>
                    <textarea
                      value={businessProfile.requirements}
                      onChange={(e) => setBusinessProfile({ ...businessProfile, requirements: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6666FF]"
                      rows={3}
                      placeholder="What do you look for in partners? (e.g., audience size, engagement rate, niche alignment)"
                    />
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Partnership Details</h3>
                <div className="space-y-6 max-w-2xl">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      Cross-Promotion Preference
                    </label>
                    <div className="flex gap-2">
                      {[
                        'Yes we do',
                        'No we don\'t',
                        'Maybe, case by case',
                      ].map((option) => (
                        <button
                          key={option}
                          type="button"
                          onClick={() => setBusinessProfile({ ...businessProfile, cross_promotion_preference: option })}
                          className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all flex-1 ${
                            businessProfile.cross_promotion_preference === option
                              ? 'bg-gradient-to-r from-[#6666FF] to-[#66FFFF] text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-purple-50 to-white border-2 border-purple-200 rounded-xl p-5">
                    <MultiSelectChips
                      label="What Type of Partner Are You?"
                      options={PARTNERSHIP_TYPES}
                      value={businessArrays.partnership_types}
                      onChange={(selected) => setBusinessArrays({ ...businessArrays, partnership_types: selected })}
                    />
                  </div>

                  <div className="bg-gradient-to-br from-blue-50 to-white border-2 border-blue-200 rounded-xl p-5">
                    <MultiSelectChips
                      label="Types of Partners You're Looking For"
                      options={LOOKING_FOR}
                      value={businessArrays.looking_for}
                      onChange={(selected) => setBusinessArrays({ ...businessArrays, looking_for: selected })}
                    />
                  </div>

                  <div className="bg-gradient-to-br from-green-50 to-white border-2 border-green-200 rounded-xl p-5">
                    <MultiSelectChips
                      label="What Type of Offers Are You Interested In Promoting?"
                      options={INTERESTED_OFFER_TYPES}
                      value={businessArrays.interested_offer_types}
                      onChange={(selected) => setBusinessArrays({ ...businessArrays, interested_offer_types: selected })}
                    />
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Business Address</h3>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                  <p className="text-sm text-yellow-800">
                    This information is not visible to other users
                  </p>
                </div>
                <div className="space-y-4 max-w-2xl">
                  <Input
                    label="Street Address"
                    value={businessProfile.business_street_address}
                    onChange={(e) => setBusinessProfile({ ...businessProfile, business_street_address: e.target.value })}
                    placeholder="123 Main St"
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="City"
                      value={businessProfile.business_city}
                      onChange={(e) => setBusinessProfile({ ...businessProfile, business_city: e.target.value })}
                      placeholder="City"
                    />
                    <Input
                      label="State/Province"
                      value={businessProfile.business_state}
                      onChange={(e) => setBusinessProfile({ ...businessProfile, business_state: e.target.value })}
                      placeholder="State"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="Zip/Postal Code"
                      value={businessProfile.business_zipcode}
                      onChange={(e) => setBusinessProfile({ ...businessProfile, business_zipcode: e.target.value })}
                      placeholder="12345"
                    />
                    <Input
                      label="Business Phone"
                      value={businessProfile.business_phone}
                      onChange={(e) => setBusinessProfile({ ...businessProfile, business_phone: e.target.value })}
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Social Media Links</h3>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                  <p className="text-sm text-yellow-800">
                    This information is not visible to other users
                  </p>
                </div>
                <div className="space-y-4 max-w-2xl">
                  <Input
                    label="LinkedIn Profile/Page"
                    value={businessProfile.linkedin_url}
                    onChange={(e) => setBusinessProfile({ ...businessProfile, linkedin_url: e.target.value })}
                    placeholder="https://linkedin.com/company/..."
                  />
                  <Input
                    label="Twitter/X Profile"
                    value={businessProfile.twitter_url}
                    onChange={(e) => setBusinessProfile({ ...businessProfile, twitter_url: e.target.value })}
                    placeholder="https://twitter.com/..."
                  />
                  <Input
                    label="Facebook Page"
                    value={businessProfile.facebook_url}
                    onChange={(e) => setBusinessProfile({ ...businessProfile, facebook_url: e.target.value })}
                    placeholder="https://facebook.com/..."
                  />
                  <Input
                    label="Instagram Profile"
                    value={businessProfile.instagram_url}
                    onChange={(e) => setBusinessProfile({ ...businessProfile, instagram_url: e.target.value })}
                    placeholder="https://instagram.com/..."
                  />
                </div>
              </Card>

              <Card className="p-6 bg-gray-50">
                <Button onClick={saveBusinessSettings} disabled={saving} size="lg">
                  <Save className="w-4 h-4 mr-2" />
                  Save All Changes
                </Button>
              </Card>
            </div>
          )}

          {activeTab === 'offers' && (
            <div className="space-y-6">
              <Card className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-semibold mb-2">My Offers</h2>
                    <p className="text-gray-600">Create and manage your offers for the marketplace</p>
                  </div>
                  <Button onClick={() => openOfferModal()} disabled={!businessId}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Offer
                  </Button>
                </div>

                {!businessId && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                    <p className="text-sm text-yellow-800">
                      Please complete your business profile first before adding offers.
                    </p>
                  </div>
                )}

                {offers.length === 0 ? (
                  <div className="text-center py-12">
                    <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 mb-4">No offers yet</p>
                    <Button onClick={() => openOfferModal()} disabled={!businessId}>
                      <Plus className="w-4 h-4 mr-2" />
                      Create Your First Offer
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {offers.map((offer) => (
                      <Card key={offer.id} className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-lg font-bold text-gray-900">{offer.offer_name}</h3>
                              <Badge variant={offer.is_active ? 'success' : 'secondary'}>
                                {offer.is_active ? 'Active' : 'Inactive'}
                              </Badge>
                              {offer.offer_type && (
                                <Badge variant="secondary">{offer.offer_type}</Badge>
                              )}
                            </div>
                            {offer.description && (
                              <p className="text-gray-600 mb-3">{offer.description}</p>
                            )}
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              {offer.price_point && (
                                <div>
                                  <span className="font-semibold text-gray-700">Price:</span>{' '}
                                  <span className="text-gray-900">{formatCurrencyInput(offer.price_point)}</span>
                                </div>
                              )}
                              {offer.commission_percent > 0 && (
                                <div>
                                  <span className="font-semibold text-gray-700">Commission:</span>{' '}
                                  <span className="text-gray-900">{offer.commission_percent}%</span>
                                </div>
                              )}
                              {offer.commission_type && (
                                <div>
                                  <span className="font-semibold text-gray-700">Commission Recurrence:</span>{' '}
                                  <span className="text-gray-900 capitalize">{offer.commission_type}</span>
                                </div>
                              )}
                              {offer.commission_duration && (
                                <div>
                                  <span className="font-semibold text-gray-700">Duration:</span>{' '}
                                  <span className="text-gray-900 capitalize">{offer.commission_duration}</span>
                                </div>
                              )}
                              {offer.promo_methods && offer.promo_methods.length > 0 && (
                                <div className="col-span-2">
                                  <span className="font-semibold text-gray-700">Promo Methods:</span>{' '}
                                  <span className="text-gray-900">{offer.promo_methods.join(', ')}</span>
                                </div>
                              )}
                              {offer.offer_notes && (
                                <div className="col-span-2">
                                  <span className="font-semibold text-gray-700">Notes:</span>{' '}
                                  <span className="text-gray-900">{offer.offer_notes}</span>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => toggleOfferActive(offer.id, offer.is_active)}
                              className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                              title={offer.is_active ? 'Deactivate' : 'Activate'}
                            >
                              {offer.is_active ? 'Deactivate' : 'Activate'}
                            </button>
                            <button
                              onClick={() => openOfferModal(offer)}
                              className="px-3 py-2 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-1"
                            >
                              <Edit2 className="w-4 h-4" />
                              Edit
                            </button>
                            <button
                              onClick={() => deleteOffer(offer.id)}
                              className="px-3 py-2 text-sm bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors flex items-center gap-1"
                            >
                              <Trash2 className="w-4 h-4" />
                              Delete
                            </button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          )}

          {showOfferModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                  <h3 className="text-xl font-bold">
                    {editingOffer ? 'Edit Offer' : 'Create New Offer'}
                  </h3>
                  <button
                    onClick={closeOfferModal}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-6 space-y-6">
                  {/* Offer Section */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 space-y-4">
                    <h4 className="text-lg font-bold text-gray-900 mb-4">Offer</h4>
                    
                    <Input
                      label="Offer Name *"
                      value={offerForm.offer_name}
                      onChange={(e) => setOfferForm({ ...offerForm, offer_name: e.target.value })}
                      placeholder="e.g., Premium Coaching Program"
                    />

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Description
                      </label>
                      <textarea
                        value={offerForm.description}
                        onChange={(e) => setOfferForm({ ...offerForm, description: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6666FF]"
                        rows={4}
                        placeholder="Describe your offer..."
                      />
                    </div>

                    {/* Pricing Options Section */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Pricing Options
                      </label>
                      <p className="text-xs text-gray-500 mb-3">
                        Add multiple pricing options (e.g., monthly + annual). All pricing options share the same landing page.
                      </p>
                      <p className="text-xs text-gray-500 mb-4">
                        If you need a different landing page for a different plan, create a separate offer.
                      </p>
                      
                      <div className="space-y-3">
                        {offerForm.priceOptions.map((option, index) => (
                          <div key={option.id || `temp-${index}`} className="flex items-start gap-3 p-4 border border-gray-200 rounded-lg bg-white">
                            <div className="flex-1 grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">
                                  Price
                                </label>
                                <div className="relative">
                                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                                  <input
                                    type="number"
                                    min="0"
                                    max="1000000"
                                    step="0.01"
                                    value={option.amount || ''}
                                    onChange={(e) => {
                                      const newOptions = [...offerForm.priceOptions];
                                      newOptions[index] = {
                                        ...newOptions[index],
                                        amount: parseFloat(e.target.value) || 0,
                                      };
                                      setOfferForm({ ...offerForm, priceOptions: newOptions });
                                    }}
                                    className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6666FF]"
                                    placeholder="0.00"
                                  />
                                </div>
                                {option.amount < 0 && (
                                  <p className="text-xs text-red-600 mt-1">Amount must be ≥ 0</p>
                                )}
                                {option.amount > 1000000 && (
                                  <p className="text-xs text-red-600 mt-1">Amount must be ≤ 1,000,000</p>
                                )}
                              </div>
                              
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">
                                  Frequency
                                </label>
                                <select
                                  value={option.frequency}
                                  onChange={(e) => {
                                    const newOptions = [...offerForm.priceOptions];
                                    newOptions[index] = {
                                      ...newOptions[index],
                                      frequency: e.target.value as OfferPriceOption['frequency'],
                                    };
                                    setOfferForm({ ...offerForm, priceOptions: newOptions });
                                  }}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6666FF] text-sm"
                                >
                                  <option value="">Select frequency</option>
                                  <option value="per_month">Per month</option>
                                  <option value="per_year">Per year</option>
                                  <option value="lifetime">Lifetime</option>
                                  <option value="one_time">One-time</option>
                                </select>
                              </div>
                            </div>
                            
                            {offerForm.priceOptions.length > 1 && (
                              <button
                                type="button"
                                onClick={() => {
                                  const newOptions = offerForm.priceOptions.filter((_, i) => i !== index);
                                  setOfferForm({ ...offerForm, priceOptions: newOptions });
                                }}
                                className="mt-6 p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Remove price option"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                      
                      <button
                        type="button"
                        onClick={() => {
                          const newOptions = [...offerForm.priceOptions, {
                            amount: 0,
                            currency: 'USD',
                            frequency: 'per_month' as const,
                            sort_order: offerForm.priceOptions.length,
                          }];
                          setOfferForm({ ...offerForm, priceOptions: newOptions });
                        }}
                        className="mt-3 flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#6666FF] hover:text-[#5555EE] transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        Add price
                      </button>
                    </div>

                    <Select
                      label="Offer Type"
                      options={OFFER_TYPES}
                      value={offerForm.offer_type}
                      onChange={(value) => setOfferForm({ ...offerForm, offer_type: value })}
                      placeholder="Select offer type"
                      allowOther
                    />

                    <MultiSelectChips
                      label="Preferred Promotional Methods"
                      options={PROMO_METHODS}
                      value={offerForm.promo_methods}
                      onChange={(selected) => setOfferForm({ ...offerForm, promo_methods: selected })}
                    />

                    <div>
                      <Input
                        label="Offer Landing Page"
                        value={offerForm.purchase_affiliate_link}
                        onChange={(e) => setOfferForm({ ...offerForm, purchase_affiliate_link: e.target.value })}
                        placeholder="https://..."
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        (this is the link for new clients/ customers that affiliates will promote.)
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Notes
                      </label>
                      <textarea
                        value={offerForm.offer_notes}
                        onChange={(e) => setOfferForm({ ...offerForm, offer_notes: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6666FF]"
                        rows={3}
                        placeholder="Additional notes about this offer..."
                      />
                    </div>

                    <div className="flex items-center gap-3 pt-2">
                      <input
                        type="checkbox"
                        id="is_active"
                        checked={offerForm.is_active}
                        onChange={(e) => setOfferForm({ ...offerForm, is_active: e.target.checked })}
                        className="w-5 h-5 text-blue-600 rounded"
                      />
                      <label htmlFor="is_active" className="text-sm font-semibold text-gray-700">
                        Active (visible in marketplace)
                      </label>
                    </div>
                  </div>

                  {/* Commission Section */}
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-6 space-y-4">
                    <h4 className="text-lg font-bold text-gray-900 mb-4">Commission</h4>
                    
                    <Select
                      label="Commission Type"
                      options={['%', 'Flat Fee']}
                      value={offerForm.commission_calculation_type || ''}
                      onChange={(value) => setOfferForm({ ...offerForm, commission_calculation_type: value })}
                      placeholder="Select commission type"
                    />

                    <Input
                      label="Commission Amount (% or $)"
                      type="number"
                      value={offerForm.commission_percent}
                      onChange={(e) => setOfferForm({ ...offerForm, commission_percent: parseFloat(e.target.value) || 0 })}
                      placeholder={offerForm.commission_calculation_type === 'Flat Fee' ? 'e.g., 50' : 'e.g., 30'}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <Select
                        label="Commission Recurrence"
                        options={['One-time', 'Recurring']}
                        value={offerForm.commission_type}
                        onChange={(value) => setOfferForm({ ...offerForm, commission_type: value })}
                        placeholder="Select commission recurrence"
                      />

                      <Select
                        label="Payout Duration"
                        options={['One-time', 'Up to 1yr', 'As long as customer keeps paying']}
                        value={offerForm.commission_duration}
                        onChange={(value) => setOfferForm({ ...offerForm, commission_duration: value })}
                        placeholder="Select payout duration"
                      />
                    </div>

                    <Input
                      label="Resources Link"
                      value={offerForm.resources_link}
                      onChange={(e) => setOfferForm({ ...offerForm, resources_link: e.target.value })}
                      placeholder="https://..."
                    />
                  </div>
                </div>

                <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex gap-3 justify-end">
                  <Button variant="secondary" onClick={closeOfferModal}>
                    Cancel
                  </Button>
                  <Button onClick={saveOffer} disabled={saving}>
                    <Save className="w-4 h-4 mr-2" />
                    {saving ? 'Saving...' : 'Save Offer'}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'billing' && (
            <div className="space-y-6">
              <Card className="p-6">
                <h2 className="text-xl font-semibold mb-4">Subscription Management</h2>
                <div className="space-y-6">
                  <div>
                    <p className="text-gray-600 mb-2">Current Plan:</p>
                    <div className="flex items-center gap-3">
                      <Badge variant={userProfile.subscription_status === 'active' ? 'success' : 'secondary'}>
                        {userProfile.subscription_tier === 'free' ? 'Free' : 'Annual Membership'}
                      </Badge>
                      <span className="text-sm text-gray-600">
                        {userProfile.subscription_status === 'active' ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>

                  {userProfile.subscription_tier === 'free' && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h3 className="font-semibold text-blue-900 mb-2">Upgrade to Annual Membership</h3>
                      <p className="text-sm text-blue-800 mb-3">
                        Get unlimited access to all features for just $2,364/year
                      </p>
                      <ul className="text-sm text-blue-800 space-y-1 mb-4">
                        <li className="flex items-start gap-2">
                          <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          <span>Unlimited connections</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          <span>Full offer marketplace access</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          <span>Direct messaging & Partner CRM</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          <span>Priority support</span>
                        </li>
                      </ul>
                      <Button asChild>
                        <Link to="/pricing">
                          <Crown className="w-4 h-4 mr-2" />
                          Upgrade Now
                        </Link>
                      </Button>
                    </div>
                  )}

                  {userProfile.subscription_tier !== 'free' && (
                    <div className="space-y-4">
                      <p className="text-sm text-gray-600">
                        Your annual membership gives you full access to all platform features.
                      </p>
                      <Button asChild variant="secondary">
                        <Link to="/pricing">
                          <CreditCard className="w-4 h-4 mr-2" />
                          Manage Subscription
                        </Link>
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            </div>
          )}

          {activeTab === 'notifications' && (
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Email Notifications</h2>
              <div className="space-y-4 max-w-xl">
                <div className="flex items-center justify-between py-3 border-b">
                  <div>
                    <p className="font-semibold">Connection Requests</p>
                    <p className="text-sm text-gray-600">Get notified when someone wants to connect</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifications.connection_requests}
                    onChange={(e) => setNotifications({ ...notifications, connection_requests: e.target.checked })}
                    className="w-5 h-5 text-blue-600 rounded"
                  />
                </div>
                <div className="flex items-center justify-between py-3 border-b">
                  <div>
                    <p className="font-semibold">New Messages</p>
                    <p className="text-sm text-gray-600">Get notified when you receive a new message</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifications.new_messages}
                    onChange={(e) => setNotifications({ ...notifications, new_messages: e.target.checked })}
                    className="w-5 h-5 text-blue-600 rounded"
                  />
                </div>
                <div className="flex items-center justify-between py-3 border-b">
                  <div>
                    <p className="font-semibold">Offer Matches</p>
                    <p className="text-sm text-gray-600">Get notified about new offers matching your interests</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifications.offer_matches}
                    onChange={(e) => setNotifications({ ...notifications, offer_matches: e.target.checked })}
                    className="w-5 h-5 text-blue-600 rounded"
                  />
                </div>
                <div className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-semibold">Payment Alerts</p>
                    <p className="text-sm text-gray-600">Get notified about billing and payment updates</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifications.payment_alerts}
                    onChange={(e) => setNotifications({ ...notifications, payment_alerts: e.target.checked })}
                    className="w-5 h-5 text-blue-600 rounded"
                  />
                </div>
                <Button>
                  <Save className="w-4 h-4 mr-2" />
                  Save Preferences
                </Button>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
