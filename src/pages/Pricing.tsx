import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Check, Crown, Loader2, Zap, TrendingUp, Users, Sparkles } from 'lucide-react';
import { STRIPE_PRODUCTS } from '../stripe-config';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { CheckoutModal } from '../components/CheckoutModal';

export function Pricing() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);

  function openCheckoutModal(product: any) {
    if (!user) {
      navigate('/login');
      return;
    }
    setSelectedProduct(product);
    setCheckoutOpen(true);
  }

  async function handleCheckout(tier: string, mode: 'payment' | 'subscription', promoCode: string) {
    setLoading(tier);
    setError('');

    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error('No valid session found');
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          tier,
          success_url: `${window.location.origin}/success?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${window.location.origin}/pricing`,
          mode,
          promo_code: promoCode || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error: any) {
      console.error('Checkout error:', error);
      setError(error.message || 'Failed to start checkout process');
    } finally {
      setLoading(null);
      setCheckoutOpen(false);
    }
  }

  const features = [
    'Unlimited connections',
    'Full offer marketplace access',
    'Direct messaging',
    'Partner CRM',
    'Analytics dashboard',
    'Priority support',
    'Advanced search filters',
    'Custom integrations',
  ];

  return (
    <div className="space-y-12 pb-16">
      <div className="text-center space-y-6">
        <div className="inline-flex items-center gap-2 bg-gradient-to-r from-[#6666FF]/10 to-[#66FFFF]/10 border border-[#6666FF]/30 rounded-full px-6 py-2 mb-4">
          <Sparkles className="w-4 h-4 text-[#6666FF]" />
          <span className="text-sm font-semibold text-[#6666FF]">Join 100+ businesses already partnering</span>
        </div>

        <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-[#6666FF] to-[#66FFFF] text-transparent bg-clip-text">
          Choose Your Plan
        </h1>

        <p className="text-xl text-gray-700 max-w-3xl mx-auto font-medium leading-relaxed">
          You're sitting on revenue you haven't claimed yet. We build your partner network and make it easy to track and monetize every relationship.
        </p>
      </div>

      {error && (
        <div className="max-w-md mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12 px-4">
        {STRIPE_PRODUCTS.map((product) => (
          <Card
            key={product.id}
            className={`p-8 relative transition-all duration-300 hover:-translate-y-2 border-4 ${
              product.name === 'Launch Special Lifetime'
                ? 'border-[#6666FF] md:scale-105 shadow-2xl bg-gradient-to-br from-white via-[#6666FF]/5 to-[#66FFFF]/5'
                : 'border-[#6666FF] shadow-lg hover:shadow-2xl bg-white'
            }`}
          >
            {product.name === 'Launch Special Lifetime' && (
              <>
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-gradient-to-r from-[#6666FF] to-[#66FFFF] text-white px-4 py-1.5 shadow-lg">
                    <Crown className="w-3 h-3 mr-1" />
                    Most Popular
                  </Badge>
                </div>
                <div className="absolute top-4 right-4">
                  <div className="bg-orange-100 text-orange-700 text-xs font-bold px-3 py-1 rounded-full animate-pulse">
                    LIMITED TIME
                  </div>
                </div>
              </>
            )}

            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">{product.name} Membership</h3>
              <div className="mb-6">
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-6xl font-extrabold bg-gradient-to-r from-gray-900 to-gray-700 text-transparent bg-clip-text">
                    ${product.price.toLocaleString()}
                  </span>
                  {product.mode === 'subscription' && (
                    <span className="text-gray-500 text-xl font-medium">
                      /{product.name === 'Monthly' ? 'mo' : 'yr'}
                    </span>
                  )}
                </div>
                {product.mode === 'payment' && (
                  <div className="mt-2">
                    <span className="inline-block bg-green-100 text-green-700 text-sm font-semibold px-3 py-1 rounded-full">
                      One-time payment • Lifetime access
                    </span>
                  </div>
                )}
              </div>
              {product.name === 'Monthly' && (
                <div className="bg-gradient-to-r from-[#6666FF]/10 to-[#66FFFF]/10 border-2 border-[#6666FF]/30 rounded-xl p-4 mb-4">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Zap className="w-4 h-4 text-[#6666FF]" />
                    <p className="text-sm font-bold text-[#6666FF]">30-day free trial included</p>
                  </div>
                  <p className="text-xs text-gray-700">
                    Use code <span className="font-bold bg-white px-2 py-0.5 rounded">GET30</span> at checkout
                  </p>
                </div>
              )}
              {product.name === 'Annual' && (
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-4 mb-4">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <TrendingUp className="w-4 h-4 text-green-600" />
                    <p className="text-sm font-bold text-green-700">Save ${(49 * 12 - product.price).toFixed(0)} per year</p>
                  </div>
                  <p className="text-xs text-gray-700">
                    Just ${(product.price / 12).toFixed(0)}/month billed annually
                  </p>
                </div>
              )}
              {product.name === 'Launch Special Lifetime' && (
                <div className="bg-gradient-to-r from-orange-50 via-red-50 to-orange-50 border-2 border-orange-300 rounded-xl p-4 mb-16 animate-pulse">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Crown className="w-4 h-4 text-orange-600" />
                    <p className="text-sm font-bold text-orange-700">Founding Member Special</p>
                  </div>
                  <p className="text-xs font-semibold text-red-600">
                    Only 30 spots left at this price!
                  </p>
                </div>
              )}
              <p className="text-gray-700 text-sm leading-relaxed mt-4">{product.description}</p>
            </div>

            <div className="bg-gray-50 rounded-xl p-6 mb-8">
              <h4 className="text-sm font-bold text-gray-900 mb-4 uppercase tracking-wide">Everything Included:</h4>
              <ul className="space-y-3">
                {features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <div className="w-5 h-5 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-3 h-3 text-white font-bold" />
                    </div>
                    <span className="text-gray-700 text-sm leading-relaxed">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            <Button
              onClick={() => openCheckoutModal(product)}
              disabled={loading === product.tier}
              className={`w-full text-lg py-6 font-bold transition-all duration-200 ${
                product.name === 'Launch Special Lifetime'
                  ? 'shadow-lg hover:shadow-xl transform hover:scale-105'
                  : 'shadow-md hover:shadow-lg'
              }`}
              variant={product.name === 'Launch Special Lifetime' ? 'gradient' : 'primary'}
            >
              {loading === product.tier ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  {product.name === 'Launch Special Lifetime' ? (
                    <>
                      <Crown className="w-5 h-5 mr-2" />
                      Claim Your Spot Now
                    </>
                  ) : (
                    <>
                      Get Started Today
                      <Zap className="w-5 h-5 ml-2" />
                    </>
                  )}
                </>
              )}
            </Button>

          </Card>
        ))}
      </div>

      <div className="mt-16 max-w-5xl mx-auto">
        <h3 className="text-2xl font-bold text-center text-gray-900 mb-8">
          Trusted by Growing Businesses Everywhere
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 px-4">
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-start gap-4 mb-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-sm">SB</span>
              </div>
              <div>
                <div className="font-bold text-gray-900">Sarah B.</div>
                <div className="text-xs text-gray-500">E-commerce Agency</div>
              </div>
            </div>
            <p className="text-sm text-gray-700 italic leading-relaxed">
              "We landed 3 high-value partnerships in the first month. The ROI has been incredible—already 10x our investment."
            </p>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-start gap-4 mb-3">
              <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-sm">MK</span>
              </div>
              <div>
                <div className="font-bold text-gray-900">Michael K.</div>
                <div className="text-xs text-gray-500">SaaS Founder</div>
              </div>
            </div>
            <p className="text-sm text-gray-700 italic leading-relaxed">
              "Finally, a platform that makes partnership management simple. The CRM alone is worth the price."
            </p>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-start gap-4 mb-3">
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-sm">JL</span>
              </div>
              <div>
                <div className="font-bold text-gray-900">Jennifer L.</div>
                <div className="text-xs text-gray-500">Marketing Consultant</div>
              </div>
            </div>
            <p className="text-sm text-gray-700 italic leading-relaxed">
              "I was skeptical at first, but this has transformed how I build relationships. Game changer for my business."
            </p>
          </div>
        </div>
      </div>

      <div className="text-center mt-16 pb-8">
        <p className="text-xs text-gray-500 italic">
          *Performance-based commissions are not reflected in the membership price
        </p>
        <p className="text-xs text-gray-400 mt-2">
          All prices in USD • Secure checkout powered by Stripe
        </p>
      </div>

      {selectedProduct && (
        <CheckoutModal
          isOpen={checkoutOpen}
          onClose={() => setCheckoutOpen(false)}
          onProceeed={(promoCode) => handleCheckout(selectedProduct.tier, selectedProduct.mode, promoCode)}
          productName={selectedProduct.name}
          isLoading={loading === selectedProduct.tier}
        />
      )}
    </div>
  );
}