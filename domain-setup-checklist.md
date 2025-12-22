# Domain Setup Checklist - Namecheap to Vercel

Use this checklist to ensure you complete all steps correctly.

## Pre-Setup
- [ ] Have your Namecheap account login credentials
- [ ] Have your Vercel account login credentials
- [ ] Know your domain name (e.g., ineedaffiliates.com)

## Step 1: Vercel Configuration
- [ ] Logged into Vercel dashboard
- [ ] Selected your project (INEED_AFFILIATES)
- [ ] Went to Settings → Domains
- [ ] Clicked "Add Domain"
- [ ] Entered your domain name
- [ ] Copied the A record IP address from Vercel: _______________
- [ ] Copied the CNAME record value from Vercel: _______________

## Step 2: Namecheap DNS Configuration
- [ ] Logged into Namecheap account
- [ ] Went to Domain List
- [ ] Clicked "Manage" on your domain
- [ ] Verified Nameservers are set to "Namecheap BasicDNS"
- [ ] Clicked on "Advanced DNS" tab
- [ ] Added A Record:
  - [ ] Host: @ (or blank)
  - [ ] Value: [Pasted IP from Vercel]
  - [ ] TTL: Automatic
  - [ ] Saved the record
- [ ] Added CNAME Record:
  - [ ] Host: www
  - [ ] Value: [Pasted CNAME from Vercel]
  - [ ] TTL: Automatic
  - [ ] Saved the record
- [ ] Removed any conflicting/old DNS records

## Step 3: Verification
- [ ] Waited at least 10-15 minutes for DNS propagation
- [ ] Checked DNS propagation at whatsmydns.net
- [ ] Verified domain status in Vercel shows "Valid" or "Configured"
- [ ] Tested http://yourdomain.com in browser
- [ ] Tested https://yourdomain.com in browser
- [ ] Tested https://www.yourdomain.com in browser
- [ ] Confirmed SSL certificate is active (green padlock)
- [ ] Verified site loads correctly on all URLs

## Troubleshooting (if needed)
- [ ] Double-checked DNS records match Vercel exactly
- [ ] Verified no typos in DNS values
- [ ] Checked that TTL is set correctly
- [ ] Waited longer for DNS propagation (can take up to 48 hours)
- [ ] Contacted support if issues persist

## Notes
Write down any important information here:

Vercel A Record IP: ________________________________
Vercel CNAME Value: ________________________________
Domain Name: ________________________________
Date Setup Started: ________________________________
Date Setup Completed: ________________________________

