import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { CheckCircle, ArrowRight, Home } from 'lucide-react';

export function Success() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate loading time for better UX
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 text-center">
          <div className="animate-spin w-12 h-12 border-4 border-green-200 border-t-green-600 rounded-full mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Processing your payment...</h2>
          <p className="text-gray-600">Please wait while we confirm your subscription.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 text-center">
        <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-8 h-8 text-white" />
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Payment Successful!</h1>
        
        <p className="text-gray-600 mb-6">
          Thank you for your subscription. Your account has been upgraded and you now have access to all premium features.
        </p>

        {sessionId && (
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-500 mb-1">Session ID</p>
            <p className="text-xs font-mono text-gray-700 break-all">{sessionId}</p>
          </div>
        )}

        <div className="space-y-3">
          <Button asChild className="w-full">
            <Link to="/dashboard">
              <Home className="w-4 h-4 mr-2" />
              Go to Dashboard
            </Link>
          </Button>

          <Button variant="secondary" asChild className="w-full">
            <Link to="/settings">
              <ArrowRight className="w-4 h-4 mr-2" />
              Manage Subscription
            </Link>
          </Button>
        </div>
      </Card>
    </div>
  );
}