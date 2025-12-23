# Vercel Deployment Setup Guide

## Required Environment Variables

Your application requires the following environment variables to be configured in Vercel:

### Supabase Configuration

1. **VITE_SUPABASE_URL**
   - Your Supabase project URL
   - Format: `https://[your-project-id].supabase.co`
   - Find it in: Supabase Dashboard → Settings → API → Project URL

2. **VITE_SUPABASE_ANON_KEY**
   - Your Supabase anonymous/public key
   - Format: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
   - Find it in: Supabase Dashboard → Settings → API → Project API keys → `anon` `public`

## How to Add Environment Variables in Vercel

### Option 1: Via Vercel Dashboard (Recommended)

1. Go to your Vercel project dashboard: https://vercel.com/dashboard
2. Select your project (`INEED_AFFILIATES`)
3. Click on **Settings** tab
4. Click on **Environment Variables** in the left sidebar
5. Add each variable:
   - **Key**: `VITE_SUPABASE_URL`
   - **Value**: Your Supabase project URL
   - **Environment**: Select all (Production, Preview, Development)
   - Click **Save**
6. Repeat for `VITE_SUPABASE_ANON_KEY`

### Option 2: Via Vercel CLI

```bash
# Install Vercel CLI if you haven't
npm i -g vercel

# Login to Vercel
vercel login

# Add environment variables
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY

# For production specifically
vercel env add VITE_SUPABASE_URL production
vercel env add VITE_SUPABASE_ANON_KEY production
```

### Option 3: Via vercel.json (Not Recommended for Secrets)

You can also add non-sensitive config in `vercel.json`, but **DO NOT** put API keys here as they'll be exposed in your repository.

## After Adding Environment Variables

1. **Redeploy your application**:
   - Go to Vercel Dashboard → Your Project → Deployments
   - Click the "..." menu on the latest deployment
   - Select "Redeploy"
   - Or push a new commit to trigger automatic deployment

2. **Verify the deployment**:
   - Check the build logs to ensure environment variables are loaded
   - Test your application to ensure Supabase connection works

## Troubleshooting

### Error: "Missing Supabase environment variables"
- ✅ Ensure both `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set
- ✅ Ensure they're set for the correct environment (Production/Preview/Development)
- ✅ Redeploy after adding variables

### Error: "Failed to load resource: 500"
- This is often related to missing environment variables
- Check Vercel build logs for specific errors
- Verify your Supabase project is active and accessible

### Font Loading Error (tt-rounds-neue)
- This is a non-critical error from an external CDN
- The app will still work, but fonts may not load
- To fix: Update the font import in your CSS or use a different font source

## Security Notes

- ✅ Never commit `.env` files to your repository
- ✅ Use Vercel's environment variables for sensitive data
- ✅ The `anon` key is safe to expose in frontend code (it's public by design)
- ✅ Never expose your Supabase `service_role` key in frontend code

## Additional Configuration

If you're using other services (Stripe, etc.), you may also need:
- `VITE_STRIPE_PUBLIC_KEY` (if using Stripe checkout)
- Any other `VITE_*` prefixed variables your app uses

## Quick Checklist

- [ ] Added `VITE_SUPABASE_URL` to Vercel environment variables
- [ ] Added `VITE_SUPABASE_ANON_KEY` to Vercel environment variables
- [ ] Set variables for Production, Preview, and Development environments
- [ ] Redeployed the application
- [ ] Verified the app loads without errors
- [ ] Tested Supabase connection (login/signup)


