import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/ui/Button';
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

type VerificationState = 'validating' | 'success' | 'error';

export function VerifyEmail() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [state, setState] = useState<VerificationState>('validating');
  const [error, setError] = useState('');

  useEffect(() => {
    const checkVerificationStatus = async () => {
      if (user) {
        setState('success');
        setTimeout(() => {
          navigate('/onboarding');
        }, 2000);
      } else {
        setTimeout(() => {
          setState('error');
          setError('Email verification is pending. Please check your email and click the verification link.');
        }, 3000);
      }
    };

    checkVerificationStatus();
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src="/logonew2.png" alt="ineedaffiliates.com" className="h-16 mx-auto mb-4" />
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-200">
          {state === 'validating' && (
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#6666FF]/10 mb-4">
                <Loader2 className="w-8 h-8 text-[#6666FF] animate-spin" />
              </div>
              <h1
                className="text-2xl font-bold text-[#001134] mb-2"
                style={{ fontFamily: 'Sora, sans-serif' }}
              >
                Verifying your email...
              </h1>
              <p
                className="text-gray-600"
                style={{ fontFamily: 'TT Rounds Neue, sans-serif' }}
              >
                Please wait while we verify your email address.
              </p>
            </div>
          )}

          {state === 'success' && (
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h1
                className="text-2xl font-bold text-[#001134] mb-2"
                style={{ fontFamily: 'Sora, sans-serif' }}
              >
                Email verified successfully!
              </h1>
              <p
                className="text-gray-600 mb-6"
                style={{ fontFamily: 'TT Rounds Neue, sans-serif' }}
              >
                Your email has been verified. Redirecting you to complete your profile...
              </p>
              <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Redirecting...</span>
              </div>
            </div>
          )}

          {state === 'error' && (
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
              <h1
                className="text-2xl font-bold text-[#001134] mb-2"
                style={{ fontFamily: 'Sora, sans-serif' }}
              >
                Verification Pending
              </h1>
              <p
                className="text-gray-600 mb-6"
                style={{ fontFamily: 'TT Rounds Neue, sans-serif' }}
              >
                {error}
              </p>

              <Link to="/verify-email/pending">
                <Button variant="gradient" className="w-full">
                  Go to verification page
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
