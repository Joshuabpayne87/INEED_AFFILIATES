import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      setSuccess(true);
      setEmail('');
    } catch (err: any) {
      setError(err.message || 'Failed to send reset email');
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
            Reset your password
          </h1>
          <p
            className="text-gray-600"
            style={{ fontFamily: 'TT Rounds Neue, sans-serif' }}
          >
            Enter your email and we'll send you a link to reset your password
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
                  Reset link sent!
                </p>
                <p className="text-sm text-green-700" style={{ fontFamily: 'TT Rounds Neue, sans-serif' }}>
                  Check your inbox for a password reset link. Don't forget to check your spam folder.
                </p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="john@example.com"
            />

            <Button
              type="submit"
              variant="gradient"
              className="w-full"
              loading={loading}
            >
              Send reset link
            </Button>
          </form>

          <Link
            to="/login"
            className="mt-6 flex items-center justify-center gap-2 text-sm text-gray-600 hover:text-[#6666FF] transition-colors"
            style={{ fontFamily: 'TT Rounds Neue, sans-serif' }}
          >
            <ArrowLeft className="w-4 h-4" />
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
