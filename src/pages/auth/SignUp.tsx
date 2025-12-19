import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Checkbox } from '../../components/ui/Checkbox';
import { AlertCircle, ChevronDown, Gift } from 'lucide-react';
import { COUNTRIES, detectCountryFromLocale, validatePhoneNumber, normalizePhoneNumber, formatPhoneE164, canSendSMS, type Country } from '../../lib/phoneUtils';
import { trackReferralClickByCode } from '../../lib/referralUtils';

export function SignUp() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signUp } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<Country>(COUNTRIES[0]);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [communicationConsent, setCommunicationConsent] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [consentError, setConsentError] = useState('');
  const [termsError, setTermsError] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const referralCode = searchParams.get('ref');
  const clickTracked = useRef(false);

  useEffect(() => {
    const detected = detectCountryFromLocale();
    setSelectedCountry(detected);
  }, []);

  useEffect(() => {
    if (referralCode && !clickTracked.current) {
      clickTracked.current = true;
      trackReferralClickByCode(referralCode).catch(console.error);
    }
  }, [referralCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setPhoneError('');
    setConsentError('');
    setTermsError('');
    setLoading(true);

    const phoneValidation = validatePhoneNumber(phoneNumber, selectedCountry.iso);
    if (!phoneValidation.valid) {
      setPhoneError(phoneValidation.error || 'Invalid phone number');
      setLoading(false);
      return;
    }

    if (!communicationConsent) {
      setConsentError('You must agree to receive communications to create an account.');
      setLoading(false);
      return;
    }

    if (!termsAccepted || !privacyAccepted) {
      setTermsError('You must accept the Terms of Service and Privacy Policy to continue.');
      setLoading(false);
      return;
    }

    try {
      const normalizedPhone = normalizePhoneNumber(phoneNumber);
      const phoneData = {
        countryIso: selectedCountry.iso,
        countryCode: selectedCountry.code,
        phoneNational: normalizedPhone,
        phoneE164: formatPhoneE164(phoneNumber, selectedCountry.code),
        canSend: canSendSMS(selectedCountry.iso),
      };

      await signUp(email, password, firstName, lastName, phoneData, communicationConsent, referralCode || undefined);
      navigate('/onboarding');
    } catch (err: any) {
      setError(err.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src="/logonew2.png" alt="ineedaffiliates.com" className="h-16 mx-auto mb-4" />
          <p className="text-gray-600">Create your account to get started</p>
        </div>

        {referralCode && (
          <div className="mb-4 p-4 bg-gradient-to-r from-primary/10 to-cyan/10 border border-primary/20 rounded-xl flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-cyan flex items-center justify-center flex-shrink-0">
              <Gift className="w-5 h-5 text-white" />
            </div>
            <p className="text-sm text-gray-700">
              You've been invited to join <span className="font-semibold">ineedaffiliates.com</span>!
              Sign up to start building revenue-generating partnerships.
            </p>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-200">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="First Name"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                placeholder="John"
              />
              <Input
                label="Last Name"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
                placeholder="Doe"
              />
            </div>

            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="john@example.com"
            />

            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              showPasswordToggle
            />

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Country <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="flex items-center gap-3 w-full px-4 py-3 border border-gray-300 rounded-xl bg-white hover:bg-gray-50 transition-colors">
                  <img src={selectedCountry.flagUrl} alt={selectedCountry.name} className="w-6 h-4 rounded object-cover" />
                  <select
                    value={selectedCountry.iso}
                    onChange={(e) => {
                      const country = COUNTRIES.find(c => c.iso === e.target.value);
                      if (country) setSelectedCountry(country);
                    }}
                    className="flex-1 border-0 outline-none focus:ring-0 bg-transparent text-base appearance-none"
                    required
                  >
                    {COUNTRIES.map(country => (
                      <option key={country.iso} value={country.iso}>
                        {country.name} {country.code}
                      </option>
                    ))}
                  </select>
                </div>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Mobile Number <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                <div className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-xl bg-gradient-to-br from-gray-50 to-white text-gray-700 font-semibold min-w-[100px]">
                  <img src={selectedCountry.flagUrl} alt={selectedCountry.name} className="w-7 h-5 rounded object-cover mr-2" />
                  <span className="text-sm">{selectedCountry.code}</span>
                </div>
                <div className="flex-1">
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => {
                      setPhoneNumber(e.target.value);
                      setPhoneError('');
                    }}
                    className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 transition-all duration-200 ${
                      phoneError
                        ? 'border-red-300 focus:ring-red-200 focus:border-red-400'
                        : 'border-gray-300 focus:ring-[#6666FF] focus:border-[#6666FF]'
                    }`}
                    placeholder={selectedCountry.iso === 'US' || selectedCountry.iso === 'CA' ? '1234567890' : 'Phone number'}
                    required
                  />
                  {phoneError && (
                    <p className="mt-1 text-sm text-red-600">{phoneError}</p>
                  )}
                  <p className="mt-1 text-xs text-gray-500">
                    {selectedCountry.iso === 'US' || selectedCountry.iso === 'CA'
                      ? 'Enter 10 digits (national format)'
                      : 'Enter 6-15 digits (national format)'}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="terms-accept"
                  checked={termsAccepted && privacyAccepted}
                  onChange={(e) => {
                    setTermsAccepted(e.target.checked);
                    setPrivacyAccepted(e.target.checked);
                    setTermsError('');
                  }}
                  className="mt-1 w-4 h-4 rounded border-gray-300 focus:ring-[#6666FF] cursor-pointer"
                />
                <label htmlFor="terms-accept" className="text-sm text-gray-700 cursor-pointer flex-1">
                  I accept the{' '}
                  <Link to="/terms" target="_blank" className="text-primary font-medium hover:text-primary-600">
                    Terms of Service
                  </Link>
                  {' '}and{' '}
                  <Link to="/privacy" target="_blank" className="text-primary font-medium hover:text-primary-600">
                    Privacy Policy
                  </Link>
                  <span className="text-red-500"> *</span>
                </label>
              </div>

              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="communication-consent"
                  checked={communicationConsent}
                  onChange={(e) => {
                    setCommunicationConsent(e.target.checked);
                    setConsentError('');
                  }}
                  className="mt-1 w-4 h-4 rounded border-gray-300 focus:ring-[#6666FF] cursor-pointer"
                />
                <label htmlFor="communication-consent" className="text-sm text-gray-700 cursor-pointer flex-1">
                  I agree to receive communications from ineedaffiliates.com
                  <span className="text-red-500"> *</span>
                </label>
              </div>

              {termsError && (
                <p className="text-sm text-red-600 flex items-start gap-2 ml-7">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  {termsError}
                </p>
              )}
              {consentError && (
                <p className="text-sm text-red-600 flex items-start gap-2 ml-7">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  {consentError}
                </p>
              )}
            </div>

            <Button
              type="submit"
              variant="gradient"
              className="w-full"
              loading={loading}
            >
              Create Account
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-600">
            Already have an account?{' '}
            <Link to="/login" className="text-primary font-medium hover:text-primary-600">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
