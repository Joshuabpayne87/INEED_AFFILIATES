import { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { BusinessProfile, isProfileComplete } from '../types/business';
import { supabase } from '../lib/supabase';
import { Button } from './ui/Button';
import { Input } from './ui/Input';

interface OnboardingWizardProps {
  onClose: () => void;
  onComplete: () => void;
  initialData?: Partial<BusinessProfile>;
}

export function OnboardingWizard({ onClose, onComplete, initialData }: OnboardingWizardProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<Partial<BusinessProfile>>(initialData || {});
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const checkStepComplete = (currentStep: number, data: Partial<BusinessProfile>): boolean => {
    switch (currentStep) {
      case 1:
        return !!(
          data.company_name &&
          data.website &&
          data.industry &&
          data.niche
        );
      case 2:
        return !!(
          data.description &&
          data.problem_solved &&
          data.target_audience &&
          data.unique_value
        );
      case 3:
        return !!(
          data.contact_name &&
          data.email &&
          data.calendar_link
        );
      case 4:
        return !!(
          data.founder_name &&
          data.founder_bio &&
          data.founder_background &&
          data.founder_why_started
        );
      case 5:
        return !!(
          data.social_audience_size &&
          data.email_list_size &&
          data.email_open_rate
        );
      case 6:
        return !!(
          data.number_of_offers &&
          data.commission_rate &&
          data.requirements
        );
      case 7:
        return !!(
          data.cross_promotion_preference &&
          data.looking_for &&
          data.looking_for.length > 0
        );
      default:
        return true;
    }
  };

  const findFirstIncompleteStep = (data: Partial<BusinessProfile>): number => {
    for (let i = 1; i <= 8; i++) {
      if (!checkStepComplete(i, data)) {
        return i;
      }
    }
    return 8;
  };

  const [step, setStep] = useState(() => findFirstIncompleteStep(initialData || {}));

  const updateField = (field: keyof BusinessProfile, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const toggleOfferType = (type: string) => {
    const current = formData.interested_offer_types || [];
    if (current.includes(type)) {
      setFormData((prev) => ({
        ...prev,
        interested_offer_types: current.filter(t => t !== type),
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        interested_offer_types: [...current, type],
      }));
    }
  };

  const toggleCollaborationType = (type: string) => {
    const current = formData.collaboration_types || [];
    if (current.includes(type)) {
      setFormData((prev) => ({
        ...prev,
        collaboration_types: current.filter(t => t !== type),
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        collaboration_types: [...current, type],
      }));
    }
  };

  const toggleLookingFor = (type: string) => {
    const current = formData.looking_for || [];
    if (current.includes(type)) {
      setFormData((prev) => ({
        ...prev,
        looking_for: current.filter(t => t !== type),
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        looking_for: [...current, type],
      }));
    }
  };

  const canProceed = (currentStep: number): boolean => {
    return checkStepComplete(currentStep, formData);
  };

  const saveDraft = async () => {
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('businesses')
        .update({
          ...formData,
          profile_state: 'draft',
        })
        .eq('owner_user_id', user.id);

      if (error) throw error;
      localStorage.setItem('profile_check_dismissed', 'true');
      onClose();
    } catch (error) {
      console.error('Error saving draft:', error);
      alert('Failed to save draft. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const goLive = async () => {
    const profile = formData as BusinessProfile;
    if (!isProfileComplete(profile)) {
      alert('Please complete all required fields before going live.');
      return;
    }

    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('businesses')
        .update({
          ...formData,
          profile_state: 'live',
          is_profile_published: true,
        })
        .eq('owner_user_id', user.id);

      if (error) throw error;
      setShowSuccessModal(true);
    } catch (error) {
      console.error('Error going live:', error);
      alert('Failed to publish profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (showSuccessModal) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-[#6666FF] to-[#66FFFF] rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-[#001134] mb-4">Your profile is live!</h2>
          <p className="text-gray-600 mb-6">
            Your business is now visible in the marketplace. Partners can discover you, message you, and request to connect.
          </p>
          <Button onClick={onComplete} className="w-full">
            Go to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-3xl my-8">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-bold text-[#001134]">Complete Your Profile</h2>
            <span className="text-sm text-gray-500">Step {step} of 8</span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex gap-1 px-6 py-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
            <div
              key={s}
              className={`h-2 flex-1 rounded-full transition-colors ${
                s <= step ? 'bg-gradient-to-r from-[#6666FF] to-[#66FFFF]' : 'bg-gray-200'
              }`}
            />
          ))}
        </div>

        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-bold text-[#001134] mb-2">Business Basics</h3>
                <p className="text-gray-600 mb-6">
                  Basic information about your business.
                </p>
              </div>
              <Input
                label="Business Name*"
                value={formData.company_name || ''}
                onChange={(e) => updateField('company_name', e.target.value)}
                placeholder="e.g., Your Business Name"
              />
              <Input
                label="Tagline"
                value={formData.tagline || ''}
                onChange={(e) => updateField('tagline', e.target.value)}
                placeholder="Short one-sentence description (optional)"
              />
              <Input
                label="Website URL*"
                value={formData.website || ''}
                onChange={(e) => updateField('website', e.target.value)}
                placeholder="https://example.com"
              />
              <Input
                label="Industry*"
                value={formData.industry || ''}
                onChange={(e) => updateField('industry', e.target.value)}
                placeholder="Select an industry"
              />
              <Input
                label="Niche*"
                value={formData.niche || ''}
                onChange={(e) => updateField('niche', e.target.value)}
                placeholder="Describe your niche (free text)"
              />
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Looking For</label>
                <textarea
                  value={formData.partnership_opportunities || ''}
                  onChange={(e) => updateField('partnership_opportunities', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6666FF]"
                  rows={3}
                  placeholder="Describe what types of partners you're looking for. Be specific about their audience, expertise, or resources."
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-bold text-[#001134] mb-2">What You Do</h3>
                <p className="text-gray-600 mb-6">
                  Describe what your business does and the value you provide.
                </p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Description*</label>
                <textarea
                  value={formData.description || ''}
                  onChange={(e) => updateField('description', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6666FF]"
                  rows={4}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Problem You Solve*</label>
                <textarea
                  value={formData.problem_solved || ''}
                  onChange={(e) => updateField('problem_solved', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6666FF]"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Target Audience*</label>
                <textarea
                  value={formData.target_audience || ''}
                  onChange={(e) => updateField('target_audience', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6666FF]"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Unique Value*</label>
                <textarea
                  value={formData.unique_value || ''}
                  onChange={(e) => updateField('unique_value', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6666FF]"
                  rows={3}
                />
              </div>
              <Input
                label="Intro Video URL (optional)"
                value={formData.video_url || ''}
                onChange={(e) => updateField('video_url', e.target.value)}
              />
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-bold text-[#001134] mb-2">Contact Details</h3>
                <p className="text-gray-600 mb-6">
                  How partners can reach you.
                </p>
              </div>
              <Input
                label="Primary Contact Name*"
                value={formData.contact_name || ''}
                onChange={(e) => updateField('contact_name', e.target.value)}
              />
              <Input
                label="Contact Title*"
                type="text"
                value={formData.email || ''}
                onChange={(e) => updateField('email', e.target.value)}
                placeholder="e.g., CEO, Founder, Marketing Director"
              />
              <Input
                label="Calendar Link*"
                value={formData.calendar_link || ''}
                onChange={(e) => updateField('calendar_link', e.target.value)}
              />
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-bold text-[#001134] mb-2">Founder Info</h3>
                <p className="text-gray-600 mb-6">
                  Tell partners about yourself.
                </p>
              </div>
              <Input
                label="Founder Name*"
                value={formData.founder_name || ''}
                onChange={(e) => updateField('founder_name', e.target.value)}
              />
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Founder Bio*</label>
                <textarea
                  value={formData.founder_bio || ''}
                  onChange={(e) => updateField('founder_bio', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6666FF]"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Background & Expertise*</label>
                <textarea
                  value={formData.founder_background || ''}
                  onChange={(e) => updateField('founder_background', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6666FF]"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Why You Started*</label>
                <textarea
                  value={formData.founder_why_started || ''}
                  onChange={(e) => updateField('founder_why_started', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6666FF]"
                  rows={3}
                />
              </div>
              <Input
                label="Founder Headshot URL (optional)"
                value={formData.founder_headshot_url || ''}
                onChange={(e) => updateField('founder_headshot_url', e.target.value)}
              />
            </div>
          )}

          {step === 5 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-bold text-[#001134] mb-2">Audience & Metrics</h3>
                <p className="text-gray-600 mb-6">
                  Help partners understand your reach.
                </p>
              </div>
              <Input
                label="Social Audience Size*"
                value={formData.social_audience_size || ''}
                onChange={(e) => updateField('social_audience_size', e.target.value)}
                placeholder="e.g., 50,000 followers"
              />
              <Input
                label="Email List Size*"
                value={formData.email_list_size || ''}
                onChange={(e) => updateField('email_list_size', e.target.value)}
                placeholder="e.g., 10,000 subscribers"
              />
              <Input
                label="Email Open Rate*"
                value={formData.email_open_rate || ''}
                onChange={(e) => updateField('email_open_rate', e.target.value)}
                placeholder="e.g., 35%"
              />
            </div>
          )}

          {step === 6 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-bold text-[#001134] mb-2">Offer Details</h3>
                <p className="text-gray-600 mb-6">
                  Help potential partners understand your offer at a glance.
                </p>
              </div>
              <Input
                label="Number of Offers*"
                value={formData.number_of_offers || ''}
                onChange={(e) => updateField('number_of_offers', e.target.value)}
                placeholder="e.g., 3 active offers"
              />
              <Input
                label="Commission Rate Range*"
                value={formData.commission_rate || ''}
                onChange={(e) => updateField('commission_rate', e.target.value)}
                placeholder="e.g., 20-50%"
              />
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Partner Requirements*
                </label>
                <textarea
                  value={formData.requirements || ''}
                  onChange={(e) => updateField('requirements', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6666FF]"
                  rows={3}
                  placeholder="What do you look for in partners? (e.g., audience size, engagement rate, niche alignment)"
                />
              </div>
            </div>
          )}

          {step === 7 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-bold text-[#001134] mb-2">Partnership Details</h3>
                <p className="text-gray-600 mb-6">
                  Define how you want to collaborate with partners.
                </p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Cross-Promotion Preference*</label>
                <textarea
                  value={formData.cross_promotion_preference || ''}
                  onChange={(e) => updateField('cross_promotion_preference', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6666FF]"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Types of Partners You're Looking For*
                </label>
                <p className="text-sm text-gray-600 mb-3">
                  Select all that apply.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {[
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
                  ].map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => toggleLookingFor(type)}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                        formData.looking_for?.includes(type)
                          ? 'bg-gradient-to-r from-[#6666FF] to-[#66FFFF] text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  What Type of Offers Are You Interested In Promoting? (optional)
                </label>
                <p className="text-sm text-gray-600 mb-3">
                  Select all that apply.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    'High-Ticket Offers',
                    'Recurring Revenue Offers',
                    'SaaS Offers',
                    'Affiliate Programs',
                    'Webinar Collaborations',
                    'Email Swaps',
                    'Co-Marketing Deals',
                    'Reseller Opportunities',
                    'Partner Programs',
                  ].map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => toggleOfferType(type)}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                        formData.interested_offer_types?.includes(type)
                          ? 'bg-gradient-to-r from-[#6666FF] to-[#66FFFF] text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Preferred Collaboration Methods (optional)
                </label>
                <p className="text-sm text-gray-600 mb-3">
                  Select all that apply.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    'JVs',
                    'Referrals',
                    'Co-Webinars',
                    'Email Swaps',
                    'Podcast Guesting',
                    'Lead Sharing',
                    'Cross-Promotion',
                    'Co-Marketing',
                    'Reseller Partnerships',
                  ].map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => toggleCollaborationType(type)}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                        formData.collaboration_types?.includes(type)
                          ? 'bg-gradient-to-r from-[#6666FF] to-[#66FFFF] text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 8 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-bold text-[#001134] mb-2">Review Your Profile</h3>
                <p className="text-gray-600 mb-6">
                  Review your information before going live.
                </p>
              </div>
              {!isProfileComplete(formData as BusinessProfile) && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                  <p className="text-sm text-yellow-800">
                    All questions must be completed for your profile to go live in the marketplace. Please go back and fill in any missing required fields.
                  </p>
                </div>
              )}
              <div className="bg-gradient-to-br from-[#F8F9FF] to-white rounded-xl p-6 border border-gray-200">
                <h4 className="font-bold text-[#001134] mb-4">Profile Summary</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Business name:</span>
                    <span className="font-semibold">{formData.company_name || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Industry:</span>
                    <span className="font-semibold">{formData.industry || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Contact name:</span>
                    <span className="font-semibold">{formData.contact_name || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Profile complete:</span>
                    <span className={`font-semibold ${isProfileComplete(formData as BusinessProfile) ? 'text-green-600' : 'text-yellow-600'}`}>
                      {isProfileComplete(formData as BusinessProfile) ? 'Yes' : 'No'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <Button
            variant="secondary"
            onClick={() => setStep(Math.max(1, step - 1))}
            disabled={step === 1}
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Back
          </Button>

          {step < 8 ? (
            <Button
              onClick={() => setStep(step + 1)}
              disabled={!canProceed(step)}
            >
              Next
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <div className="flex gap-3">
              <Button
                variant="secondary"
                onClick={saveDraft}
                disabled={isSaving}
              >
                Save as draft
              </Button>
              <Button
                onClick={goLive}
                disabled={isSaving || !isProfileComplete(formData as BusinessProfile)}
              >
                Save & go live
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
