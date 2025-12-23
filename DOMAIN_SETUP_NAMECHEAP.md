# Setting Up Your Namecheap Domain with Vercel

This guide will help you connect your Namecheap domain to your Vercel deployment.

## Prerequisites

- ✅ Domain purchased from Namecheap
- ✅ Vercel account with your project deployed
- ✅ Access to Namecheap account

---

## Step 1: Get Your Vercel Domain Configuration

1. **Go to Vercel Dashboard**
   - Visit: https://vercel.com/dashboard
   - Sign in to your account

2. **Select Your Project**
   - Click on your `INEED_AFFILIATES` project

3. **Go to Settings → Domains**
   - Click on **Settings** tab
   - Click on **Domains** in the left sidebar

4. **Add Your Domain**
   - Click **Add** or **Add Domain** button
   - Enter your domain name (e.g., `ineedaffiliates.com` or `www.ineedaffiliates.com`)
   - Click **Add**

5. **Get DNS Configuration**
   - Vercel will show you the DNS records you need to add
   - You'll see something like:
     - **A Record**: `76.76.21.21` (or similar IP)
     - **CNAME Record**: `cname.vercel-dns.com.` (for www subdomain)
   - **Copy these values** - you'll need them in Namecheap

---

## Step 2: Configure DNS in Namecheap

### Option A: Using Namecheap BasicDNS (Recommended for Beginners)

1. **Log into Namecheap**
   - Go to: https://www.namecheap.com
   - Sign in to your account

2. **Go to Domain List**
   - Click on **Domain List** in the left sidebar
   - Find your domain and click **Manage**

3. **Navigate to Advanced DNS**
   - Scroll down to **Nameservers** section
   - Make sure it's set to **Namecheap BasicDNS** (not Custom DNS)
   - Click on **Advanced DNS** tab

4. **Add DNS Records**

   **For Root Domain (ineedaffiliates.com):**
   
   - Click **Add New Record**
   - Select **A Record**
   - **Host**: `@` (or leave blank, represents root domain)
   - **Value**: Paste the IP address from Vercel (e.g., `76.76.21.21`)
   - **TTL**: Automatic (or 30 min)
   - Click **Save** (checkmark icon)

   **For WWW Subdomain (www.ineedaffiliates.com):**
   
   - Click **Add New Record**
   - Select **CNAME Record**
   - **Host**: `www`
   - **Value**: Paste the CNAME from Vercel (e.g., `cname.vercel-dns.com.`)
   - **TTL**: Automatic (or 30 min)
   - Click **Save** (checkmark icon)

5. **Remove Conflicting Records** (if any)
   - Delete any existing A records pointing to other IPs
   - Delete any existing CNAME records for www that conflict

### Option B: Using Vercel Nameservers (Advanced - Better Performance)

1. **Get Vercel Nameservers**
   - In Vercel → Settings → Domains
   - After adding your domain, Vercel may show nameservers like:
     - `ns1.vercel-dns.com`
     - `ns2.vercel-dns.com`

2. **Update Nameservers in Namecheap**
   - Go to Namecheap → Domain List → Manage
   - Find **Nameservers** section
   - Select **Custom DNS**
   - Enter the Vercel nameservers:
     - `ns1.vercel-dns.com`
     - `ns2.vercel-dns.com`
   - Click **Save**

3. **DNS Records Managed by Vercel**
   - With this method, Vercel automatically manages all DNS records
   - You don't need to manually add A/CNAME records

---

## Step 3: Wait for DNS Propagation

DNS changes can take time to propagate:

- **Minimum**: 5-10 minutes
- **Typical**: 1-24 hours
- **Maximum**: 48 hours

**Check DNS Propagation:**
- Visit: https://www.whatsmydns.net
- Enter your domain name
- Check if the DNS records have propagated globally

---

## Step 4: Verify Domain in Vercel

1. **Go back to Vercel Dashboard**
   - Settings → Domains
   - You should see your domain listed

2. **Check Status**
   - Status should change from "Pending" to "Valid" or "Configured"
   - If it shows an error, check the DNS records again

3. **SSL Certificate**
   - Vercel automatically provisions SSL certificates (HTTPS)
   - This usually happens automatically after DNS is configured
   - Wait a few minutes for SSL to be issued

---

## Step 5: Test Your Domain

1. **Wait for DNS Propagation** (see Step 3)

2. **Test Your Domain**
   - Visit: `http://yourdomain.com`
   - Visit: `https://yourdomain.com` (should redirect to HTTPS)
   - Visit: `https://www.yourdomain.com`

3. **Verify It Works**
   - Your Vercel site should load
   - No SSL warnings
   - Both www and non-www should work

---

## Common Issues & Solutions

### Issue: Domain shows "Pending" in Vercel

**Solution:**
- Double-check DNS records in Namecheap match Vercel's requirements
- Ensure TTL is set correctly
- Wait longer for DNS propagation (can take up to 48 hours)

### Issue: SSL Certificate not issued

**Solution:**
- Wait 5-10 minutes after DNS is configured
- Check that DNS records are correct
- Vercel automatically issues SSL, but it needs DNS to be working first

### Issue: Domain redirects to Namecheap parking page

**Solution:**
- DNS hasn't propagated yet - wait longer
- Check that you're using the correct DNS records from Vercel
- Verify nameservers are set correctly

### Issue: Only www or only root domain works

**Solution:**
- Make sure you added BOTH:
  - A record for root domain (@)
  - CNAME record for www subdomain
- Or use Vercel nameservers (Option B) which handles both automatically

### Issue: "Invalid DNS Configuration" error

**Solution:**
- Verify the IP address in A record matches Vercel's IP exactly
- Check that CNAME value ends with a dot (.) if required
- Remove any conflicting DNS records

---

## Quick Checklist

- [ ] Added domain in Vercel Dashboard → Settings → Domains
- [ ] Copied DNS records from Vercel (A record IP and CNAME)
- [ ] Logged into Namecheap account
- [ ] Added A record for root domain (@) in Namecheap Advanced DNS
- [ ] Added CNAME record for www subdomain in Namecheap Advanced DNS
- [ ] Saved DNS records in Namecheap
- [ ] Waited for DNS propagation (check with whatsmydns.net)
- [ ] Verified domain status in Vercel shows "Valid"
- [ ] Tested domain in browser (both http and https)
- [ ] Confirmed SSL certificate is active (green padlock)

---

## Example DNS Configuration

Here's what your Namecheap Advanced DNS should look like:

```
Type    Host    Value                    TTL
A       @       76.76.21.21              Automatic
CNAME   www     cname.vercel-dns.com.    Automatic
```

**Note**: The actual IP and CNAME values will be different - use the ones Vercel provides!

---

## Additional Tips

1. **Use Vercel Nameservers (Option B)** for easier management if you're comfortable with it
2. **Enable Automatic HTTPS** - Vercel does this by default
3. **Set up Redirects** - In Vercel, you can configure redirects (e.g., www to non-www or vice versa)
4. **Monitor DNS Propagation** - Use tools like whatsmydns.net to track propagation
5. **Keep DNS Records Simple** - Only add what Vercel requires

---

## Need Help?

If you're stuck:
1. Check Vercel's domain documentation: https://vercel.com/docs/concepts/projects/domains
2. Check Namecheap's DNS guide: https://www.namecheap.com/support/knowledgebase/article.aspx/767/10/how-to-configure-dns-records-for-your-domain/
3. Verify DNS records match exactly what Vercel shows
4. Wait longer for DNS propagation (it can take time!)

---

## Next Steps After Domain Setup

Once your domain is working:
1. ✅ Update any hardcoded URLs in your code to use your domain
2. ✅ Configure email (if needed) - you may need additional DNS records
3. ✅ Set up redirects in Vercel for www/non-www preferences
4. ✅ Test all functionality with your new domain


