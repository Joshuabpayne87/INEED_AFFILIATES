# How to Publish Your Site on Vercel

Your site is already deployed on Vercel! Here's how to ensure everything is published and up-to-date.

## Quick Check: Is Your Site Already Live?

1. **Check Your Vercel Deployment**
   - Go to: https://vercel.com/dashboard
   - Select your project: `INEED_AFFILIATES`
   - Look at the **Deployments** tab
   - You should see your latest deployment with a status

2. **Visit Your Site**
   - Your Vercel URL: `https://your-project-name.vercel.app`
   - Or your custom domain: `https://yourdomain.com` (if you set it up)

---

## Option 1: Automatic Deployment (Recommended)

If Vercel is connected to your GitHub repository, every push automatically deploys:

### Step 1: Commit Your Changes

```bash
cd "C:\Users\Jessica\Downloads\INEED_AFFILIATES\INDEED_AFFILIATES"

# Check what files have changed
git status

# Add all changes
git add .

# Commit with a message
git commit -m "Deploy latest changes with messaging system and domain setup"

# Push to GitHub
git push origin feature/messaging-system
```

### Step 2: Vercel Auto-Deploys

- Vercel will automatically detect the push
- It will start a new deployment
- You'll see it in the Vercel dashboard
- Usually takes 1-3 minutes

### Step 3: Verify Deployment

- Go to Vercel Dashboard → Deployments
- Wait for status to show "Ready" (green checkmark)
- Click on the deployment to see the URL
- Visit the URL to verify your site is live

---

## Option 2: Manual Deployment via Vercel Dashboard

If you want to deploy without pushing to GitHub:

1. **Go to Vercel Dashboard**
   - Visit: https://vercel.com/dashboard
   - Select your project

2. **Redeploy**
   - Go to **Deployments** tab
   - Find your latest deployment
   - Click the **"..."** (three dots) menu
   - Click **Redeploy**
   - Confirm the redeployment

3. **Wait for Build**
   - Watch the build logs
   - Wait for status to show "Ready"

---

## Option 3: Deploy via Vercel CLI

If you prefer command line:

```bash
# Install Vercel CLI (if not already installed)
npm i -g vercel

# Navigate to your project
cd "C:\Users\Jessica\Downloads\INEED_AFFILIATES\INDEED_AFFILIATES"

# Login to Vercel (first time only)
vercel login

# Deploy
vercel

# For production deployment
vercel --prod
```

---

## Ensure Vercel is Connected to GitHub

If automatic deployments aren't working:

1. **Go to Vercel Dashboard**
   - Settings → Git

2. **Check Repository Connection**
   - Should show: `Joshuabpayne87/INEED_AFFILIATES`
   - If not connected, click **Connect Git Repository**

3. **Configure Production Branch**
   - Production Branch: Usually `main` or `master`
   - You can also deploy from `feature/messaging-system` if needed

---

## Publishing Checklist

Before publishing, make sure:

- [ ] All code changes are committed
- [ ] Environment variables are set in Vercel (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
- [ ] Domain is configured (if using custom domain)
- [ ] Build completes without errors
- [ ] Site loads correctly on Vercel URL
- [ ] Custom domain works (if configured)

---

## After Publishing

1. **Test Your Site**
   - Visit your Vercel URL or custom domain
   - Test key features:
     - Sign up / Sign in
     - Navigation
     - Database connections (Supabase)
     - All pages load correctly

2. **Monitor Deployments**
   - Check Vercel dashboard regularly
   - Review build logs if there are issues
   - Set up deployment notifications (optional)

3. **Update Domain Settings** (if needed)
   - In Vercel → Settings → Domains
   - Configure redirects (www to non-www or vice versa)
   - Enable automatic HTTPS (usually on by default)

---

## Troubleshooting

### Build Fails

- Check build logs in Vercel
- Verify environment variables are set
- Ensure all dependencies are in package.json
- Check for TypeScript/ESLint errors

### Site Not Updating

- Clear browser cache
- Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
- Check if deployment completed successfully
- Verify you're looking at the latest deployment

### Environment Variables Missing

- Go to Vercel → Settings → Environment Variables
- Add missing variables
- Redeploy after adding variables

---

## Quick Commands Reference

```bash
# Check git status
git status

# Add all changes
git add .

# Commit changes
git commit -m "Your commit message"

# Push to GitHub (triggers auto-deploy)
git push origin feature/messaging-system

# Or push to main branch
git checkout main
git merge feature/messaging-system
git push origin main
```

---

## Next Steps

Once your site is published:

1. ✅ Share your site URL with others
2. ✅ Test all functionality
3. ✅ Monitor for any errors
4. ✅ Set up analytics (optional)
5. ✅ Configure backups (optional)

Your site should be live! 🎉

