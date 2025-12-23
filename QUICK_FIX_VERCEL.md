# Quick Fix: Add Supabase Environment Variables to Vercel

## Step 1: Get Your Supabase Credentials

### Option A: From Supabase Dashboard (Recommended)

1. **Go to Supabase Dashboard**
   - Visit: https://supabase.com/dashboard
   - Sign in if needed

2. **Select Your Project**
   - Click on your project name (or create one if you don't have one)

3. **Navigate to API Settings**
   - Click on **Settings** (gear icon) in the left sidebar
   - Click on **API** in the settings menu

4. **Copy Your Credentials**
   - **Project URL**: 
     - Look for "Project URL" section
     - Copy the URL (looks like: `https://xxxxxxxxxxxxx.supabase.co`)
     - This is your `VITE_SUPABASE_URL`
   
   - **Anon/Public Key**:
     - Look for "Project API keys" section
     - Find the key labeled `anon` `public`
     - Click the "eye" icon or "reveal" button to show it
     - Copy the entire key (starts with `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`)
     - This is your `VITE_SUPABASE_ANON_KEY`

### Option B: Check Your Local .env File (If You Have One)

If you have a `.env.local` or `.env` file in your project:
- Look for `VITE_SUPABASE_URL=`
- Look for `VITE_SUPABASE_ANON_KEY=`

**Note**: If you don't have these locally, you'll need to get them from Supabase Dashboard.

---

## Step 2: Add Environment Variables to Vercel

### Method 1: Via Vercel Dashboard (Easiest)

1. **Go to Vercel Dashboard**
   - Visit: https://vercel.com/dashboard
   - Sign in if needed

2. **Select Your Project**
   - Click on your project: `INEED_AFFILIATES` (or whatever you named it)

3. **Open Settings**
   - Click on **Settings** tab at the top

4. **Go to Environment Variables**
   - Click on **Environment Variables** in the left sidebar

5. **Add First Variable: VITE_SUPABASE_URL**
   - Click **Add New** button
   - **Key**: `VITE_SUPABASE_URL`
   - **Value**: Paste your Supabase Project URL (from Step 1)
   - **Environment**: Check all three boxes:
     - ☑️ Production
     - ☑️ Preview  
     - ☑️ Development
   - Click **Save**

6. **Add Second Variable: VITE_SUPABASE_ANON_KEY**
   - Click **Add New** button again
   - **Key**: `VITE_SUPABASE_ANON_KEY`
   - **Value**: Paste your Supabase Anon Key (from Step 1)
   - **Environment**: Check all three boxes:
     - ☑️ Production
     - ☑️ Preview
     - ☑️ Development
   - Click **Save**

### Method 2: Via Vercel CLI

If you prefer command line:

```bash
# Install Vercel CLI (if not already installed)
npm i -g vercel

# Login to Vercel
vercel login

# Navigate to your project
cd "C:\Users\Jessica\Downloads\INEED_AFFILIATES\INDEED_AFFILIATES"

# Add environment variables
# When prompted, enter your values
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY

# For production specifically
vercel env add VITE_SUPABASE_URL production
vercel env add VITE_SUPABASE_ANON_KEY production
```

---

## Step 3: Redeploy Your Application

After adding the environment variables, you MUST redeploy:

### Option A: Redeploy from Dashboard
1. Go to **Deployments** tab in Vercel
2. Find your latest deployment
3. Click the **"..."** (three dots) menu
4. Click **Redeploy**
5. Wait for deployment to complete

### Option B: Push a New Commit
```bash
cd "C:\Users\Jessica\Downloads\INEED_AFFILIATES\INDEED_AFFILIATES"
git add .
git commit -m "Add Vercel configuration"
git push origin feature/messaging-system
```

This will trigger an automatic deployment.

---

## Step 4: Verify It Works

1. **Check Build Logs**
   - Go to your deployment in Vercel
   - Click on the deployment to see build logs
   - Look for any errors (should be none now)

2. **Test Your App**
   - Visit your Vercel deployment URL
   - The app should load without the "Missing Supabase environment variables" error
   - Try signing up or logging in to verify Supabase connection works

---

## Troubleshooting

### Still Getting "Missing Supabase environment variables" Error?

1. ✅ **Double-check variable names** - Must be exactly:
   - `VITE_SUPABASE_URL` (not `SUPABASE_URL`)
   - `VITE_SUPABASE_ANON_KEY` (not `SUPABASE_ANON_KEY`)

2. ✅ **Verify environments are selected** - Make sure Production, Preview, and Development are all checked

3. ✅ **Redeploy after adding variables** - Environment variables only apply to NEW deployments

4. ✅ **Check for typos** - Copy-paste the values to avoid typos

### Can't Find Your Supabase Project?

- If you don't have a Supabase project yet:
  1. Go to https://supabase.com
  2. Sign up / Sign in
  3. Click "New Project"
  4. Fill in project details
  5. Wait for project to be created
  6. Follow Step 1 above to get credentials

### Need Help?

If you're still stuck:
- Check the build logs in Vercel for specific error messages
- Verify your Supabase project is active and not paused
- Make sure you're using the correct project (if you have multiple)

---

## Quick Reference

**Supabase Dashboard**: https://supabase.com/dashboard → Settings → API

**Vercel Dashboard**: https://vercel.com/dashboard → Your Project → Settings → Environment Variables

**Required Variables**:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`


