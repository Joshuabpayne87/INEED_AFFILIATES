import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/ui/Button';
import { AlertCircle, CheckCircle, Mail } from 'lucide-react';

export function VerifyEmailPending() {
  const { user, resendVerificationEmail } = useAuth();
  const navigate = useNavigate();
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
  }, [user, navigate]);

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const handleResend = async () => {
    if (cooldown > 0 || !user) return;

    setError('');
    setResendSuccess(false);
    setResendLoading(true);

    try {
      await resendVerificationEmail();
      setResendSuccess(true);
      setCooldown(60);
    } catch (err: any) {
      if (err.message.includes('wait') || err.message.includes('seconds')) {
        const match = err.message.match(/(\d+)\s*seconds/);
        if (match) {
          setCooldown(parseInt(match[1]));
        }
      }
      setError(err.message || 'Failed to resend verification email');
    } finally {
      setResendLoading(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src="/logonew2.png" alt="ineedaffiliates.com" className="h-16 mx-auto mb-4" />
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-200">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#6666FF]/10 mb-4">
              <Mail className="w-8 h-8 text-[#6666FF]" />
            </div>
            <h1
              className="text-2xl font-bold text-[#001134] mb-2"
              style={{ fontFamily: 'Sora, sans-serif' }}
            >
              Verify your email to continue
            </h1>
            <p
              className="text-gray-600"
              style={{ fontFamily: 'TT Rounds Neue, sans-serif' }}
            >
              We sent a verification email to:
            </p>
            <p
              className="text-[#6666FF] font-semibold mt-2"
              style={{ fontFamily: 'TT Rounds Neue, sans-serif' }}
            >
              {user.email}
            </p>
          </div>

          <div
            className="bg-[#F8F9FF] rounded-xl p-4 mb-6"
            style={{ fontFamily: 'TT Rounds Neue, sans-serif' }}
          >
            <p className="text-sm text-gray-700 mb-2">
              Check your inbox and click the verification link to activate your account.
            </p>
            <p className="text-xs text-gray-600">
              Don't forget to check your spam folder if you don't see it in a few minutes.
            </p>
          </div>

          {resendSuccess && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-green-800" style={{ fontFamily: 'TT Rounds Neue, sans-serif' }}>
                Verification email sent! Check your inbox.
              </p>
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800" style={{ fontFamily: 'TT Rounds Neue, sans-serif' }}>
                {error}
              </p>
            </div>
          )}

          <div className="space-y-3">
            <Button
              onClick={handleResend}
              variant="gradient"
              className="w-full"
              loading={resendLoading}
              disabled={cooldown > 0}
            >
              {cooldown > 0
                ? `Resend in ${cooldown}s`
                : 'Resend verification email'
              }
            </Button>

            <Link to="/signup">
              <Button variant="outline" className="w-full">
                Change email
              </Button>
            </Link>
          </div>

          <p className="mt-6 text-center text-sm text-gray-600" style={{ fontFamily: 'TT Rounds Neue, sans-serif' }}>
            Already verified?{' '}
            <Link to="/login" className="text-[#6666FF] font-medium hover:text-[#5555EE]">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
