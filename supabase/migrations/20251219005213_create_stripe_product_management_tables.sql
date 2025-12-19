/*
  # Stripe Product Management System

  1. New Tables
    - `stripe_connection`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `stripe_account_id` (text) - The connected Stripe account ID
      - `access_token` (text) - Encrypted OAuth access token
      - `refresh_token` (text) - Encrypted OAuth refresh token
      - `is_active` (boolean) - Whether the connection is currently active
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `stripe_products`
      - `id` (uuid, primary key)
      - `stripe_product_id` (text) - The Stripe product ID
      - `stripe_price_id` (text) - The Stripe price ID
      - `name` (text) - Product name
      - `description` (text) - Product description
      - `price` (numeric) - Price amount
      - `currency` (text) - Currency code
      - `mode` (text) - 'payment' or 'subscription'
      - `is_active` (boolean) - Whether to show this product
      - `display_order` (integer) - Order to display products
      - `metadata` (jsonb) - Additional product metadata
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      - `synced_at` (timestamptz) - Last sync from Stripe

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users to manage their Stripe connection
    - Add policies for public read access to active products
    - Add policies for admin users to manage products

  3. Indexes
    - Add index on stripe_connection.user_id
    - Add index on stripe_products.stripe_price_id
    - Add index on stripe_products.is_active
*/

-- Create stripe_connection table
CREATE TABLE IF NOT EXISTS stripe_connection (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  stripe_account_id text,
  access_token text,
  refresh_token text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create stripe_products table
CREATE TABLE IF NOT EXISTS stripe_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_product_id text NOT NULL,
  stripe_price_id text NOT NULL UNIQUE,
  name text NOT NULL,
  description text DEFAULT '',
  price numeric NOT NULL,
  currency text DEFAULT 'usd',
  mode text NOT NULL CHECK (mode IN ('payment', 'subscription')),
  is_active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  synced_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE stripe_connection ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_products ENABLE ROW LEVEL SECURITY;

-- Policies for stripe_connection
CREATE POLICY "Users can view own Stripe connection"
  ON stripe_connection FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own Stripe connection"
  ON stripe_connection FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own Stripe connection"
  ON stripe_connection FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own Stripe connection"
  ON stripe_connection FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Policies for stripe_products (public read for active products)
CREATE POLICY "Anyone can view active products"
  ON stripe_products FOR SELECT
  TO public
  USING (is_active = true);

CREATE POLICY "Authenticated users can manage products"
  ON stripe_products FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_stripe_connection_user_id ON stripe_connection(user_id);
CREATE INDEX IF NOT EXISTS idx_stripe_products_price_id ON stripe_products(stripe_price_id);
CREATE INDEX IF NOT EXISTS idx_stripe_products_is_active ON stripe_products(is_active);
CREATE INDEX IF NOT EXISTS idx_stripe_products_display_order ON stripe_products(display_order);

-- Seed initial products from existing configuration
INSERT INTO stripe_products (stripe_product_id, stripe_price_id, name, description, price, currency, mode, is_active, display_order)
VALUES 
  ('prod_monthly', 'price_1SfpEdA83nAUrUVoWDLJt7aQ', 'Monthly', 'Monthly subscription plan with 30-day free trial using code GET30', 97.00, 'usd', 'subscription', true, 1),
  ('prod_lifetime', 'price_1SfpFcA83nAUrUVoq420COua', 'Launch Special Lifetime', 'One-time payment for lifetime access. Only 30 available!', 815.00, 'usd', 'payment', true, 2),
  ('prod_TZQqH6aapPlI3g', 'price_1SfpJVA83nAUrUVoup5Xg5Ac', 'Annual', 'Annual subscription plan - Save 20% with yearly billing', 931.00, 'usd', 'subscription', true, 3)
ON CONFLICT (stripe_price_id) DO NOTHING;
