import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [validSession, setValidSession] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setValidSession(true);
      } else {
        setError('Invalid or expired reset link. Please request a new password reset.');
      }
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) throw error;

      setSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src="/logonew2.png" alt="ineedaffiliates.com" className="h-16 mx-auto mb-4" />
          <h1
            className="text-2xl font-bold text-[#001134] mb-2"
            style={{ fontFamily: 'Sora, sans-serif' }}
          >
            Set new password
          </h1>
          <p
            className="text-gray-600"
            style={{ fontFamily: 'TT Rounds Neue, sans-serif' }}
          >
            Enter your new password below
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-200">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800" style={{ fontFamily: 'TT Rounds Neue, sans-serif' }}>
                {error}
              </p>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-green-800 font-medium mb-1" style={{ fontFamily: 'TT Rounds Neue, sans-serif' }}>
                  Password updated successfully!
                </p>
                <p className="text-sm text-green-700" style={{ fontFamily: 'TT Rounds Neue, sans-serif' }}>
                  Redirecting to sign in...
                </p>
              </div>
            </div>
          )}

          {validSession && !success && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="New Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                showPasswordToggle
              />

              <Input
                label="Confirm Password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder="••••••••"
                showPasswordToggle
              />

              <Button
                type="submit"
                variant="gradient"
                className="w-full"
                loading={loading}
              >
                Update password
              </Button>
            </form>
          )}

          {!validSession && (
            <Button
              onClick={() => navigate('/forgot-password')}
              variant="gradient"
              className="w-full"
            >
              Request new reset link
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
