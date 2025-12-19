export interface StripeProduct {
  id: string;
  tier: 'monthly' | 'annual' | 'lifetime';
  name: string;
  description: string;
  price: number;
  currency: string;
  mode: 'payment' | 'subscription';
}

export const STRIPE_PRODUCTS: StripeProduct[] = [
  {
    id: 'prod_monthly',
    tier: 'monthly',
    name: 'Monthly',
    description: 'Monthly subscription plan with 30-day free trial using code GET30',
    price: 97.00,
    currency: 'usd',
    mode: 'subscription',
  },
  {
    id: 'prod_lifetime',
    tier: 'lifetime',
    name: 'Launch Special Lifetime',
    description: 'One-time payment for lifetime access. Only 30 available!',
    price: 815.00,
    currency: 'usd',
    mode: 'payment',
  },
  {
    id: 'prod_annual',
    tier: 'annual',
    name: 'Annual',
    description: 'Annual subscription plan - Save 20% with yearly billing',
    price: 931.00,
    currency: 'usd',
    mode: 'subscription',
  },
];